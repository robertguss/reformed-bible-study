import {
  CommentaryBook,
  Confession,
  CrossReferenceChapter,
  LexiconEntry,
  OriginalChapter,
  ResourceRecord,
  TranslationChapter,
} from "@reformed-bible/core"
import { Effect, Schema } from "effect"
import { unzipSync } from "fflate"
import { sha256Hex } from "../ingest/download.ts"
import {
  buildRelease,
  decodeAll,
  type Release,
  ReleaseBuildError,
  type ReleaseInput,
  type ReleaseLock,
} from "./release.ts"

const decoder = new TextDecoder()
const parse = (bytes: Uint8Array): unknown => JSON.parse(decoder.decode(bytes))

const releaseInputFrom = (
  entries: Readonly<Record<string, Uint8Array>>,
): Effect.Effect<ReleaseInput, ReleaseBuildError> =>
  Effect.gen(function* () {
    const paths = Object.keys(entries).sort()
    const under = (prefix: string) => paths.filter((path) => path.startsWith(prefix))
    const read = (path: string) => entries[path] ?? new Uint8Array()

    const records = yield* decodeAll(
      ResourceRecord,
      under("resources/")
        .filter((path) => path.endsWith("/resource.json"))
        .map((path) => parse(read(path))),
      "resource records",
    )
    const ofKind = (kind: ResourceRecord["kind"]) => records.filter((r) => r.kind === kind)
    const load = <S extends Schema.Codec<unknown, unknown>>(
      kind: ResourceRecord["kind"],
      schema: S,
    ) =>
      Effect.map(
        Effect.forEach(ofKind(kind), (r) =>
          decodeAll(
            schema,
            under(`normalized/${r.id}/`)
              .filter((path) => path.endsWith(".json"))
              .map((path) => parse(read(path))),
            r.id,
          ),
        ),
        (lists) => lists.flat(),
      )
    const lexiconLists = yield* load("lexicon", Schema.Array(LexiconEntry))
    return {
      records,
      translations: yield* load("translation", TranslationChapter),
      commentaries: yield* load("commentary", CommentaryBook),
      crossReferences: yield* load("cross-references", CrossReferenceChapter),
      originals: yield* load("original-language", OriginalChapter),
      lexicon: lexiconLists.flat(),
      confessions: yield* load("confession", Confession),
      corrections: [],
      licenseFiles: new Map(
        paths
          .filter((path) => path === "REUSE.toml" || path.startsWith("LICENSES/"))
          .map((path) => [path, read(path)]),
      ),
    }
  })

export const rebuildFromArchive = (
  archiveBytes: Uint8Array,
  lock: ReleaseLock,
): Effect.Effect<Release, ReleaseBuildError> =>
  Effect.gen(function* () {
    const actual = sha256Hex(archiveBytes)
    if (actual !== lock.archiveSha256)
      return yield* new ReleaseBuildError({
        message: `archive SHA-256 ${actual} does not match the lock's ${lock.archiveSha256}`,
      })
    const input = yield* releaseInputFrom(unzipSync(archiveBytes))
    const release = yield* buildRelease(input, { date: lock.release.slice(0, 10) })
    if (release.release !== lock.release)
      return yield* new ReleaseBuildError({
        message: `the archive rebuilds to release ${release.release}, not the locked ${lock.release}; the build code has changed since that release was published`,
      })
    return release
  })
