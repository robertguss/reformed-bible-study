import { describe, expect, it } from "@effect/vitest"
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
import { rebuildFromArchive } from "../../src/build/from-archive.ts"
import { buildRelease, releaseLock } from "../../src/build/release.ts"
import { input } from "./fixtures.ts"

const evidence = [{ url: "https://example.org/license", quote: "Public Domain" }]
const decodeAll = <A>(schema: Schema.Codec<A, unknown>, values: ReadonlyArray<unknown>) =>
  values.map((value) => Schema.decodeUnknownSync(schema)(value))

// The dataset build decodes everything it reads, in file order, before building a release, so
// the published release is built from decoded records sorted by id here too.
const published = () => {
  const fixture = input()
  return buildRelease(
    {
      records: decodeAll(
        ResourceRecord,
        fixture.records
          .map((r) => ({ ...r, license: { ...r.license, evidence } }))
          .sort((a, b) => (a.id < b.id ? -1 : 1)),
      ),
      translations: decodeAll(TranslationChapter, fixture.translations),
      commentaries: decodeAll(CommentaryBook, fixture.commentaries),
      crossReferences: decodeAll(CrossReferenceChapter, fixture.crossReferences),
      originals: decodeAll(OriginalChapter, fixture.originals),
      lexicon: decodeAll(LexiconEntry, fixture.lexicon),
      confessions: decodeAll(Confession, fixture.confessions),
      corrections: [],
      licenseFiles: new Map([["LICENSES/CC-BY-4.0.txt", new TextEncoder().encode("CC BY 4.0")]]),
    },
    { date: "2026-11-03" },
  )
}

describe("rebuilding static files from a release archive", () => {
  it.effect("reproduces every published static file from the archive alone", () =>
    Effect.gen(function* () {
      const release = yield* published()
      const rebuilt = yield* rebuildFromArchive(release.archiveBytes, releaseLock(release))
      expect(rebuilt.release).toBe(release.release)
      expect([...rebuilt.files.keys()].sort()).toEqual([...release.files.keys()].sort())
      for (const [path, file] of release.files) expect(rebuilt.files.get(path)).toEqual(file)
    }),
  )

  it.effect("refuses an archive whose bytes differ from the lock's hash", () =>
    Effect.gen(function* () {
      const release = yield* published()
      const tampered = release.archiveBytes.slice()
      tampered.set([(tampered.at(-30) ?? 0) ^ 0xff], tampered.length - 30)
      const error = yield* Effect.flip(rebuildFromArchive(tampered, releaseLock(release)))
      expect(error.message).toMatch(/sha-256/i)
    }),
  )

  it.effect("refuses when the current build code no longer reproduces the locked release", () =>
    Effect.gen(function* () {
      const release = yield* published()
      const lock = { ...releaseLock(release), release: "2026-11-03-00000000" }
      const error = yield* Effect.flip(rebuildFromArchive(release.archiveBytes, lock))
      expect(error.message).toContain("2026-11-03-00000000")
      expect(error.message).toContain(release.release)
    }),
  )
})
