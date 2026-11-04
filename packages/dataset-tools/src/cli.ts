import { createHash } from "node:crypto"
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative, resolve } from "node:path"
import { Console, DateTime, Effect } from "effect"
import { rebuildFromArchive } from "./build/from-archive.ts"
import {
  buildRelease,
  loadReleaseInput,
  type ReleaseLock,
  writeRelease,
  writeStaticFiles,
} from "./build/release.ts"
import { FetchHttpClient } from "effect/http"
import { ingestCalvin } from "./ingest/calvin.ts"
import { ingestConfessions } from "./ingest/confession.ts"
import { EEBO_COMMENTATORS, ingestEeboCommentator } from "./ingest/eebo-commentators.ts"
import { HENRY, ingestWholeBible, JFB } from "./ingest/henry-jfb.ts"
import { ingestOriginalLanguage } from "./ingest/original-language.ts"
import { ingestPoole } from "./ingest/poole.ts"
import { ingestCrossReferences, ingestTranslations } from "./ingest/translations.ts"
import { sourceCachePath } from "./source-cache.ts"
import { renderJson, renderReport, validateDataset, type DatasetFile } from "./validate/validate.ts"

const listFiles = (dir: string): ReadonlyArray<string> =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? listFiles(path) : [path]
  })

const cachedSourceHashes = (
  repoRoot: string,
  files: ReadonlyArray<DatasetFile>,
): Map<string, string> => {
  const hashes = new Map<string, string>()
  for (const file of files) {
    if (!file.path.endsWith("/resource.json")) continue
    let urls: ReadonlyArray<string> = []
    try {
      const record = JSON.parse(file.text) as {
        source?: { files?: ReadonlyArray<{ url?: unknown }> }
      }
      urls = (record.source?.files ?? []).flatMap((f) => (typeof f.url === "string" ? [f.url] : []))
    } catch {
      continue
    }
    for (const url of urls) {
      const cached = sourceCachePath(repoRoot, url)
      if (existsSync(cached))
        hashes.set(url, createHash("sha256").update(readFileSync(cached)).digest("hex"))
    }
  }
  return hashes
}

const repoRoot = resolve(import.meta.dirname, "../../..")

const INGESTS = {
  translations: () => ingestTranslations(repoRoot),
  "cross-references": () => ingestCrossReferences(repoRoot),
  "original-language": () => ingestOriginalLanguage(repoRoot),
  calvin: () => ingestCalvin(repoRoot),
  confessions: () => ingestConfessions(repoRoot),
  poole: () => ingestPoole(repoRoot),
  henry: () => ingestWholeBible(repoRoot, HENRY),
  jfb: () => ingestWholeBible(repoRoot, JFB),
  ...Object.fromEntries(
    EEBO_COMMENTATORS.map((commentator) => [
      commentator.resourceId,
      () => ingestEeboCommentator(repoRoot, commentator),
    ]),
  ),
} as const

const isIngestName = (name: string): name is keyof typeof INGESTS => Object.hasOwn(INGESTS, name)

const ingest = (names: ReadonlyArray<string>) =>
  Effect.gen(function* () {
    const selected = names.length === 0 || names.includes("all") ? Object.keys(INGESTS) : names
    for (const name of selected) {
      if (!isIngestName(name)) {
        yield* Console.error(
          `unknown ingest "${name}"; choose from ${Object.keys(INGESTS).join(", ")} or all`,
        )
        return false
      }
      yield* Console.log(`ingest ${name}`)
      yield* INGESTS[name]()
    }
    return true
  })

const build = Effect.gen(function* () {
  const input = yield* loadReleaseInput(repoRoot)
  const now = yield* DateTime.now
  const release = yield* buildRelease(input, { date: DateTime.formatIsoDate(now) })
  const lock = writeRelease(repoRoot, release, join(repoRoot, "dist", "release"))
  yield* Console.log(
    `release ${lock.release}: ${lock.fileCount} static files, archive ${lock.archive} (${release.archiveBytes.byteLength} bytes)`,
  )
  return true
})

const fromArchive = (args: ReadonlyArray<string>) =>
  Effect.gen(function* () {
    const lock = JSON.parse(
      readFileSync(join(repoRoot, "dataset", "release.lock.json"), "utf8"),
    ) as ReleaseLock
    const archivePath = args[0] ?? join(repoRoot, "dist", "release", lock.archive)
    if (!existsSync(archivePath)) {
      yield* Console.error(
        `${archivePath} not found; download it with: gh release download dataset-${lock.release} --pattern ${lock.archive} --dir dist/release`,
      )
      return false
    }
    const release = yield* rebuildFromArchive(readFileSync(archivePath), lock)
    writeStaticFiles(release, join(repoRoot, "dist", "release"))
    yield* Console.log(`release ${release.release}: ${release.files.size} static files rebuilt`)
    return true
  })

const validate = (args: ReadonlyArray<string>) =>
  Effect.gen(function* () {
    const datasetRoot = join(repoRoot, "dataset")
    const paths = listFiles(datasetRoot).map((path) => relative(datasetRoot, path))
    const files = paths.map((path) => ({
      path,
      text: readFileSync(join(datasetRoot, path), "utf8"),
    }))
    const violations = validateDataset({
      files,
      existingPaths: new Set(paths),
      sourceHashes: cachedSourceHashes(repoRoot, files),
    })
    yield* Console.log(args.includes("--json") ? renderJson(violations) : renderReport(violations))
    return violations.length === 0
  })

const main = Effect.gen(function* () {
  const [command, ...args] = process.argv.slice(2)
  if (command === "validate") return yield* validate(args)
  if (command === "ingest") return yield* ingest(args)
  if (command === "build") return yield* build
  if (command === "from-archive") return yield* fromArchive(args)
  yield* Console.error(
    "usage: dataset-tools validate [--json] | ingest [all | <name>...] | build | from-archive [<archive>]",
  )
  return false
})

// oxlint-disable-next-line effecttsgo/strict-effect-provide
Effect.runPromise(main.pipe(Effect.provide(FetchHttpClient.layer))).then(
  (ok) => {
    process.exitCode = ok ? 0 : 1
  },
  (error: unknown) => {
    process.exitCode = 2
    throw error
  },
)
