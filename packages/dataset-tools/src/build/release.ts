import { createHash } from "node:crypto"
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import {
  CommentaryBook,
  Confession,
  CrossReferenceChapter,
  LexiconEntry,
  OriginalChapter,
  ResourceRecord,
  TranslationChapter,
  shardPaths,
  shardSchemaFor,
} from "@reformed-bible/core"
import { Effect, Result, Schema } from "effect"
import { zipSync } from "fflate"
import { sha256Hex } from "../ingest/download.ts"
import { CONFESSION_FILE } from "../ingest/confession.ts"
import { NORMALIZED_DIR } from "../normalized.ts"
import { DEFAULT_FILE_BUDGET, exceedsBudget } from "./budget.ts"
import { buildCatalog } from "./catalog.ts"
import { type Correction, correctCommentaries, correctTranslations } from "./corrections.ts"
import { buildDatapackage } from "./datapackage.ts"
import {
  commentaryChapters,
  commentaryPayloads,
  confessionPayloads,
  crossReferencePayloads,
  lexiconPayloads,
  type Payloads,
  translationPayloads,
  wordPayloads,
} from "./shards.ts"

export class ReleaseBuildError extends Schema.TaggedError<
  ReleaseBuildError,
  { readonly brand: unique symbol }
>()("ReleaseBuildError", { message: Schema.String }) {}

export interface ReleaseInput {
  readonly records: ReadonlyArray<ResourceRecord>
  readonly translations: ReadonlyArray<TranslationChapter>
  readonly commentaries: ReadonlyArray<CommentaryBook>
  readonly crossReferences: ReadonlyArray<CrossReferenceChapter>
  readonly originals: ReadonlyArray<OriginalChapter>
  readonly lexicon: ReadonlyArray<LexiconEntry>
  readonly confessions: ReadonlyArray<Confession>
  readonly corrections: ReadonlyArray<Correction>
  readonly licenseFiles?: ReadonlyMap<string, Uint8Array>
}

export interface ReleaseOptions {
  readonly date: string
  readonly maxFiles?: number
}

export interface Release {
  readonly release: string
  readonly files: ReadonlyMap<string, unknown>
  readonly archive: ReadonlyMap<string, Uint8Array>
  readonly archiveBytes: Uint8Array
  readonly archiveSha256: string
}

const fail = (message: string) => Effect.fail(new ReleaseBuildError({ message }))
const encoder = new TextEncoder()
const json = (value: unknown) => encoder.encode(`${JSON.stringify(value)}\n`)

const allows = (
  record: ResourceRecord,
  ...surfaces: ReadonlyArray<ResourceRecord["surfaces"][number]>
) => record.status.state === "active" && surfaces.every((s) => record.surfaces.includes(s))

const only = <A extends { readonly resourceId: string }>(
  items: ReadonlyArray<A>,
  ids: ReadonlySet<string>,
) => items.filter((item) => ids.has(item.resourceId))

export const buildRelease = (
  input: ReleaseInput,
  options: ReleaseOptions,
): Effect.Effect<Release, ReleaseBuildError> =>
  Effect.gen(function* () {
    const translations = correctTranslations(input.translations, input.corrections)
    if (Result.isFailure(translations)) return yield* fail(translations.failure)
    const commentaries = correctCommentaries(input.commentaries, input.corrections)
    if (Result.isFailure(commentaries)) return yield* fail(commentaries.failure)

    const staticIds = new Set(
      input.records.filter((r) => allows(r, "web", "dataset")).map((r) => r.id),
    )
    const archivedRecords = input.records.filter((r) => allows(r, "dataset"))
    const archiveIds = new Set(archivedRecords.map((r) => r.id))
    const activeIds = new Set(
      input.records.filter((r) => r.status.state === "active").map((r) => r.id),
    )

    const chaptersOfCommentary = commentaryChapters(only(commentaries.success, activeIds))
    const payloads: Payloads = new Map()
    translationPayloads(only(translations.success, staticIds), payloads)
    commentaryPayloads(only(chaptersOfCommentary, staticIds), payloads)
    crossReferencePayloads(only(input.crossReferences, staticIds), payloads)
    wordPayloads(only(input.originals, staticIds), payloads)
    lexiconPayloads(only(input.lexicon, staticIds), payloads)
    confessionPayloads(only(input.confessions, staticIds), payloads)
    payloads.set(
      shardPaths.catalog,
      buildCatalog(input.records, {
        translations: only(translations.success, activeIds),
        commentaries: chaptersOfCommentary,
        crossReferences: only(input.crossReferences, activeIds),
        originals: only(input.originals, activeIds),
        wholeWorks: new Set([
          ...only(input.confessions, staticIds).map((c) => c.resourceId),
          ...only(input.lexicon, staticIds).map((e) => e.resourceId),
        ]),
      }),
    )

    const overBudget = exceedsBudget(payloads.size, options.maxFiles ?? DEFAULT_FILE_BUDGET)
    if (overBudget !== undefined) return yield* fail(overBudget)

    const archive = new Map<string, Uint8Array>()
    const pathsByResource = new Map<string, Array<string>>()
    const addArchive = (resourceId: string, name: string, value: unknown) => {
      const path = `normalized/${resourceId}/${name}`
      archive.set(path, json(value))
      const paths = pathsByResource.get(resourceId) ?? []
      paths.push(path)
      pathsByResource.set(resourceId, paths)
    }
    for (const c of only(translations.success, archiveIds))
      addArchive(c.resourceId, `${c.book}.${c.chapter}.json`, c)
    for (const b of only(commentaries.success, archiveIds))
      addArchive(b.resourceId, `${b.book}.json`, b)
    for (const c of only(input.crossReferences, archiveIds))
      addArchive(c.resourceId, `${c.book}.${c.chapter}.json`, c)
    for (const c of only(input.originals, archiveIds))
      addArchive(c.resourceId, `${c.book}.${c.chapter}.json`, c)
    for (const c of only(input.confessions, archiveIds))
      addArchive(c.resourceId, CONFESSION_FILE, c)
    const lexicon = only(input.lexicon, archiveIds)
    if (lexicon.length > 0) addArchive(lexicon[0]?.resourceId ?? "lexicon", "entries.json", lexicon)
    for (const record of archivedRecords) {
      archive.set(`resources/${record.id}/resource.json`, json(record))
    }
    for (const [path, bytes] of input.licenseFiles ?? []) archive.set(path, bytes)

    const byPath = ([a]: readonly [string, unknown], [b]: readonly [string, unknown]) =>
      a < b ? -1 : 1
    const hash = createHash("sha256").update("[")
    for (const [i, [path, payload]] of [...payloads].sort(byPath).entries())
      hash.update(`${i === 0 ? "" : ","}${JSON.stringify([path, payload])}`)
    hash.update(`]${JSON.stringify(input.records.map((r) => r.id).sort())}`)
    for (const [path, bytes] of [...archive].sort(byPath))
      hash.update(`\n${path}\t${sha256Hex(bytes)}`)
    const release = `${options.date}-${hash.digest("hex").slice(0, 8)}`

    const files = new Map<string, unknown>()
    for (const [path, payload] of payloads) {
      const schema = shardSchemaFor(path) as Schema.Codec<unknown, unknown>
      const encoded = yield* Schema.encodeUnknownEffect(schema)({ release, payload }).pipe(
        Effect.mapError((error) => new ReleaseBuildError({ message: `${path}: ${error.message}` })),
      )
      files.set(path, encoded)
    }
    archive.set(
      "datapackage.json",
      json(buildDatapackage(release, archivedRecords, pathsByResource)),
    )

    // fflate writes DOS timestamps from local date parts, so build the date locally to keep the
    // archive bytes the same in every timezone.
    const [year = 1980, month = 1, day = 1] = options.date.split("-").map(Number)
    const mtime = new Date(year, month - 1, day)
    const archiveBytes = zipSync(
      Object.fromEntries(
        [...archive]
          .sort(([a], [b]) => (a < b ? -1 : 1))
          .map(([path, bytes]) => [path, [bytes, { mtime }]]),
      ),
    )
    return { release, files, archive, archiveBytes, archiveSha256: sha256Hex(archiveBytes) }
  })

export interface ReleaseLock {
  readonly release: string
  readonly archive: string
  readonly archiveSha256: string
  readonly fileCount: number
}

export const releaseLock = (release: Release): ReleaseLock => ({
  release: release.release,
  archive: `dataset-${release.release}.zip`,
  archiveSha256: release.archiveSha256,
  fileCount: release.files.size,
})

const readJsonFiles = (dir: string): ReadonlyArray<unknown> =>
  existsSync(dir)
    ? readdirSync(dir)
        .filter((name) => name.endsWith(".json"))
        .sort()
        .map((name) => JSON.parse(readFileSync(join(dir, name), "utf8")) as unknown)
    : []

export const decodeAll = <S extends Schema.Codec<unknown, unknown>>(
  schema: S,
  values: ReadonlyArray<unknown>,
  where: string,
) =>
  Effect.forEach(values, (value) =>
    Schema.decodeUnknownEffect(schema)(value).pipe(
      Effect.mapError((error) => new ReleaseBuildError({ message: `${where}: ${error.message}` })),
    ),
  )

export const loadReleaseInput = (
  repoRoot: string,
): Effect.Effect<ReleaseInput, ReleaseBuildError> =>
  Effect.gen(function* () {
    const datasetRoot = join(repoRoot, "dataset")
    const resourcesDir = join(datasetRoot, "resources")
    const records = yield* decodeAll(
      ResourceRecord,
      readdirSync(resourcesDir)
        .sort()
        .map(
          (id) =>
            JSON.parse(readFileSync(join(resourcesDir, id, "resource.json"), "utf8")) as unknown,
        ),
      "resource records",
    )
    const dirOf = (id: string) => join(repoRoot, NORMALIZED_DIR, id)
    const ofKind = (kind: ResourceRecord["kind"]) => records.filter((r) => r.kind === kind)
    const load = <S extends Schema.Codec<unknown, unknown>>(
      kind: ResourceRecord["kind"],
      schema: S,
    ) =>
      Effect.map(
        Effect.forEach(ofKind(kind), (r) => decodeAll(schema, readJsonFiles(dirOf(r.id)), r.id)),
        (lists) => lists.flat(),
      )
    const translations = yield* load("translation", TranslationChapter)
    const commentaries = yield* load("commentary", CommentaryBook)
    const crossReferences = yield* load("cross-references", CrossReferenceChapter)
    const originals = yield* load("original-language", OriginalChapter)
    const confessions = yield* load("confession", Confession)
    const lexiconLists = yield* load("lexicon", Schema.Array(LexiconEntry))
    const correctionsDir = join(datasetRoot, "corrections")
    const corrections = readJsonFiles(correctionsDir).flatMap(
      (file) => (file as { corrections?: ReadonlyArray<Correction> }).corrections ?? [],
    )
    const licenseFiles = new Map<string, Uint8Array>([
      ["REUSE.toml", readFileSync(join(datasetRoot, "REUSE.toml"))],
    ])
    const licensesDir = join(datasetRoot, "LICENSES")
    for (const name of readdirSync(licensesDir))
      licenseFiles.set(`LICENSES/${name}`, readFileSync(join(licensesDir, name)))
    return {
      records,
      translations,
      commentaries,
      crossReferences,
      originals,
      lexicon: lexiconLists.flat(),
      confessions,
      corrections,
      licenseFiles,
    }
  })

/** Writes the release's static files under `<outDir>/data/<release>/`. */
export const writeStaticFiles = (release: Release, outDir: string): void => {
  const dataDir = join(outDir, "data", release.release)
  for (const [path, value] of release.files) {
    const target = join(dataDir, path)
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, JSON.stringify(value))
  }
}

export const writeRelease = (repoRoot: string, release: Release, outDir: string): ReleaseLock => {
  writeStaticFiles(release, outDir)
  const lock = releaseLock(release)
  writeFileSync(join(outDir, lock.archive), release.archiveBytes)
  writeFileSync(
    join(repoRoot, "dataset", "release.lock.json"),
    `${JSON.stringify(lock, null, 2)}\n`,
  )
  return lock
}
