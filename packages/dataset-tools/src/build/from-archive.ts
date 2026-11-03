import { unzipSync } from "fflate"
import { Effect } from "effect"
import { sha256Hex } from "../ingest/download.ts"
import {
  assembleReleaseInput,
  buildRelease,
  RECORDS_MANIFEST,
  type Release,
  ReleaseBuildError,
  type ReleaseLock,
} from "./release.ts"

const decoder = new TextDecoder()
const parse = (bytes: Uint8Array): unknown => JSON.parse(decoder.decode(bytes))

const archiveSource = (entries: Readonly<Record<string, Uint8Array>>) => {
  const paths = Object.keys(entries).sort()
  const read = (path: string) => parse(entries[path] ?? new Uint8Array())
  return {
    records:
      entries[RECORDS_MANIFEST] === undefined
        ? paths.filter((p) => /^resources\/[^/]+\/resource\.json$/.test(p)).map(read)
        : (read(RECORDS_MANIFEST) as ReadonlyArray<unknown>),
    normalizedOf: (id: string) =>
      paths.filter((p) => p.startsWith(`normalized/${id}/`) && p.endsWith(".json")).map(read),
    // The archive holds texts with every correction already applied.
    corrections: [],
    licenseFiles: new Map(
      paths
        .filter((p) => p === "REUSE.toml" || p.startsWith("LICENSES/"))
        .map((p) => [p, entries[p] ?? new Uint8Array()]),
    ),
  }
}

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
    const input = yield* assembleReleaseInput(archiveSource(unzipSync(archiveBytes)))
    const release = yield* buildRelease(input, { date: lock.release.slice(0, 10) })
    if (release.release !== lock.release)
      return yield* new ReleaseBuildError({
        message: `the archive rebuilds to release ${release.release}, not the locked ${lock.release}; the release build no longer reproduces what was published from this archive`,
      })
    return release
  })
