import { createHash } from "node:crypto"
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"
import { Effect, Schema, Stream } from "effect"
import { HttpClient } from "effect/http"
import { unzipSync } from "fflate"
import { sourceCachePath } from "../source-cache.ts"

/** Hosts sources may be downloaded from. Adding a host is a maintainer decision. */
export const APPROVED_HOSTS: ReadonlySet<string> = new Set([
  "a.openbible.info",
  "berean.bible",
  "bereanbible.com",
  "ebible.org",
  "raw.githubusercontent.com",
  "www.ccel.org",
  "www.crosswire.org",
])

const DEFAULT_MAX_DOWNLOAD_BYTES = 250 * 1024 * 1024
const DEFAULT_MAX_EXPANDED_BYTES = 1024 * 1024 * 1024
const MAX_COMPRESSION_RATIO = 200

export const DownloadFailures = [
  "not-https",
  "host-not-approved",
  "http-error",
  "too-large",
  "hash-mismatch",
  "unsafe-archive-entry",
] as const

export class DownloadError extends Schema.TaggedError<
  DownloadError,
  { readonly brand: unique symbol }
>()("DownloadError", {
  url: Schema.String,
  reason: Schema.Literals(DownloadFailures),
  detail: Schema.String,
}) {}

export interface SourceSpec {
  readonly url: string
  /** Expected SHA-256 of the file, as lowercase hex. */
  readonly sha256: string
  readonly maxBytes?: number
}

export const sha256Hex = (bytes: Uint8Array): string =>
  createHash("sha256").update(bytes).digest("hex")

const fail = (url: string, reason: DownloadError["reason"], detail: string) =>
  Effect.fail(new DownloadError({ url, reason, detail }))

/** Checks scheme and host before any network request is made. */
export const checkSourceUrl = (url: string): Effect.Effect<URL, DownloadError> =>
  Effect.gen(function* () {
    const parsed = yield* Effect.try({
      try: () => new URL(url),
      catch: () => new DownloadError({ url, reason: "not-https", detail: "not an absolute URL" }),
    })
    if (parsed.protocol !== "https:") return yield* fail(url, "not-https", parsed.protocol)
    if (!APPROVED_HOSTS.has(parsed.hostname))
      return yield* fail(url, "host-not-approved", parsed.hostname)
    return parsed
  })

const fetchCapped = (url: string, maxBytes: number) =>
  Effect.gen(function* () {
    const response = yield* HttpClient.get(url).pipe(
      Effect.mapError(
        (error) => new DownloadError({ url, reason: "http-error", detail: error.message }),
      ),
    )
    if (response.status < 200 || response.status >= 300) {
      return yield* fail(url, "http-error", `status ${response.status}`)
    }
    const declared = Number(response.headers["content-length"] ?? Number.NaN)
    if (declared > maxBytes) return yield* fail(url, "too-large", `${declared} bytes declared`)
    const chunks: Array<Uint8Array> = []
    let total = 0
    yield* response.stream.pipe(
      Stream.mapError(
        (error) => new DownloadError({ url, reason: "http-error", detail: error.message }),
      ),
      Stream.runForEach((chunk) =>
        Effect.gen(function* () {
          total += chunk.byteLength
          if (total > maxBytes) return yield* fail(url, "too-large", `more than ${maxBytes} bytes`)
          chunks.push(chunk)
        }),
      ),
    )
    const bytes = new Uint8Array(total)
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.byteLength
    }
    return bytes
  })

/**
 * Downloads a pinned source into the local cache, or reads it from there. The cache is rechecked
 * against the pin on every read, so a tampered cached file fails instead of being trusted.
 */
export const download = (
  repoRoot: string,
  spec: SourceSpec,
): Effect.Effect<Uint8Array, DownloadError, HttpClient.HttpClient> =>
  Effect.gen(function* () {
    yield* checkSourceUrl(spec.url)
    const cachePath = sourceCachePath(repoRoot, spec.url)
    const bytes = existsSync(cachePath)
      ? new Uint8Array(readFileSync(cachePath))
      : yield* fetchCapped(spec.url, spec.maxBytes ?? DEFAULT_MAX_DOWNLOAD_BYTES)
    const actual = sha256Hex(bytes)
    if (actual !== spec.sha256) return yield* fail(spec.url, "hash-mismatch", `got ${actual}`)
    if (!existsSync(cachePath)) {
      mkdirSync(dirname(cachePath), { recursive: true })
      writeFileSync(`${cachePath}.partial`, bytes)
      renameSync(`${cachePath}.partial`, cachePath)
    }
    return bytes
  })

/** Downloads an unpinned source once under the same host and size rules, to learn the hash to pin. */
export const fetchForPinning = (url: string, maxBytes = DEFAULT_MAX_DOWNLOAD_BYTES) =>
  Effect.gen(function* () {
    yield* checkSourceUrl(url)
    const bytes = yield* fetchCapped(url, maxBytes)
    return { bytes, sha256: sha256Hex(bytes) }
  })

const isUnsafeEntryName = (name: string): boolean =>
  name.startsWith("/") ||
  name.startsWith("\\") ||
  /^[a-zA-Z]:/.test(name) ||
  name.split(/[\\/]/).some((segment) => segment === "..")

export interface UnzipLimits {
  readonly maxTotalBytes?: number
}

/** Extracts a zip archive, rejecting escaping entry paths and archives that expand past the caps. */
export const unzipSafe = (
  archive: Uint8Array,
  limits: UnzipLimits = {},
): Effect.Effect<Record<string, Uint8Array>, DownloadError> =>
  Effect.gen(function* () {
    const maxTotal = limits.maxTotalBytes ?? DEFAULT_MAX_EXPANDED_BYTES
    let declaredTotal = 0
    let rejected: string | undefined
    const entries = yield* Effect.try({
      try: () =>
        unzipSync(archive, {
          filter: (file) => {
            if (isUnsafeEntryName(file.name)) rejected = `unsafe path ${file.name}`
            else if (
              file.size > 0 &&
              file.originalSize / file.size > MAX_COMPRESSION_RATIO &&
              file.originalSize > 1_000_000
            ) {
              rejected = `${file.name} expands ${Math.round(file.originalSize / file.size)}x`
            }
            declaredTotal += file.originalSize
            if (declaredTotal > maxTotal) rejected ??= `declares more than ${maxTotal} bytes`
            return rejected === undefined
          },
        }),
      catch: (error) =>
        new DownloadError({
          url: "archive",
          reason: "unsafe-archive-entry",
          detail: String(error),
        }),
    })
    if (rejected !== undefined) {
      const reason = rejected.startsWith("unsafe path") ? "unsafe-archive-entry" : "too-large"
      return yield* fail("archive", reason, rejected)
    }
    const actualTotal = Object.values(entries).reduce((sum, bytes) => sum + bytes.byteLength, 0)
    if (actualTotal > maxTotal)
      return yield* fail("archive", "too-large", `expanded to ${actualTotal} bytes`)
    return entries
  })
