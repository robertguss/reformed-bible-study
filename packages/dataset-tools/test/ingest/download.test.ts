import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { describe, expect, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { HttpClient, HttpClientResponse } from "effect/http"
import { zipSync } from "fflate"
import { download, sha256Hex, unzipSafe } from "../../src/ingest/download.ts"
import { sourceCachePath } from "../../src/source-cache.ts"

const servedBytes = new TextEncoder().encode("hello source")
const servedHash = sha256Hex(servedBytes)

const clientServing = (body: Uint8Array, calls: { count: number }) =>
  Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.make((request) =>
      Effect.sync(() => {
        calls.count++
        return HttpClientResponse.fromWeb(request, new Response(Uint8Array.from(body)))
      }),
    ),
  )

const freshRoot = () => mkdtempSync(join(tmpdir(), "dataset-tools-"))

describe("download", () => {
  it.effect("fetches an approved https source, checks its hash and caches it", () => {
    const calls = { count: 0 }
    const root = freshRoot()
    return Effect.gen(function* () {
      const bytes = yield* download(root, { url: "https://ebible.org/a.zip", sha256: servedHash })
      expect(new TextDecoder().decode(bytes)).toBe("hello source")
      yield* download(root, { url: "https://ebible.org/a.zip", sha256: servedHash })
      expect(calls.count).toBe(1)
    }).pipe(Effect.provide(clientServing(servedBytes, calls)))
  })

  it.effect("refuses a host outside the approved list before any request", () => {
    const calls = { count: 0 }
    return Effect.gen(function* () {
      const error = yield* Effect.flip(
        download(freshRoot(), { url: "https://evil.example/a.zip", sha256: servedHash }),
      )
      expect(error.reason).toBe("host-not-approved")
      expect(calls.count).toBe(0)
    }).pipe(Effect.provide(clientServing(servedBytes, calls)))
  })

  it.effect("refuses a plain http source", () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(
        download(freshRoot(), { url: "http://ebible.org/a.zip", sha256: servedHash }),
      )
      expect(error.reason).toBe("not-https")
    }).pipe(Effect.provide(clientServing(servedBytes, { count: 0 }))),
  )

  it.effect("aborts a download over the size cap", () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(
        download(freshRoot(), {
          url: "https://ebible.org/big.zip",
          sha256: servedHash,
          maxBytes: 4,
        }),
      )
      expect(error.reason).toBe("too-large")
    }).pipe(Effect.provide(clientServing(servedBytes, { count: 0 }))),
  )

  it.effect("fails when the downloaded bytes do not match the pin", () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(
        download(freshRoot(), { url: "https://ebible.org/a.zip", sha256: "0".repeat(64) }),
      )
      expect(error.reason).toBe("hash-mismatch")
    }).pipe(Effect.provide(clientServing(servedBytes, { count: 0 }))),
  )

  it.effect("rejects a tampered cached file instead of trusting it", () => {
    const root = freshRoot()
    const cached = sourceCachePath(root, "https://ebible.org/a.zip")
    mkdirSync(dirname(cached), { recursive: true })
    writeFileSync(cached, "tampered")
    return Effect.gen(function* () {
      const error = yield* Effect.flip(
        download(root, { url: "https://ebible.org/a.zip", sha256: servedHash }),
      )
      expect(error.reason).toBe("hash-mismatch")
    }).pipe(Effect.provide(clientServing(servedBytes, { count: 0 })))
  })
})

describe("unzipSafe", () => {
  const text = (s: string) => new TextEncoder().encode(s)

  it.effect("extracts ordinary entries", () =>
    Effect.gen(function* () {
      const entries = yield* unzipSafe(
        zipSync({ "mods.d/calvin.conf": text("a"), "data/nt.bzz": text("b") }),
      )
      expect(Object.keys(entries).sort()).toEqual(["data/nt.bzz", "mods.d/calvin.conf"])
    }),
  )

  it.effect("rejects an entry with a parent-directory path", () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(unzipSafe(zipSync({ "../escape.txt": text("x") })))
      expect(error.reason).toBe("unsafe-archive-entry")
    }),
  )

  it.effect("rejects an entry with an absolute path", () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(unzipSafe(zipSync({ "/etc/passwd": text("x") })))
      expect(error.reason).toBe("unsafe-archive-entry")
    }),
  )

  it.effect("rejects an archive that expands past the cap", () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(
        unzipSafe(zipSync({ "a.txt": new Uint8Array(10_000) }), { maxTotalBytes: 1_000 }),
      )
      expect(error.reason).toBe("too-large")
    }),
  )
})
