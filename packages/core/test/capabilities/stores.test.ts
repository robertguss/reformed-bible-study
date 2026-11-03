import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import {
  findConfessionArticles,
  getCommentary,
  getCrossReferences,
  getPassage,
  getVerseWords,
  listResources,
} from "../../src/capabilities/index.ts"
import { call, FILES, fetchStore, fsStore } from "./fixture.ts"

describe("capabilities across content stores", () => {
  it.effect("return identical output through the filesystem and fetch stores", () =>
    Effect.gen(function* () {
      const both = <A, E, R>(run: (store: typeof fsStore) => Effect.Effect<A, E, R>) =>
        Effect.all([run(fsStore), run(fetchStore())])
      const pairs = [
        yield* both((s) => call(getPassage, { ref: "Romans 8:28", translation: "bsb" }, s)),
        yield* both((s) => call(getCommentary, { ref: "Romans 8:29" }, s)),
        yield* both((s) => call(findConfessionArticles, { ref: "Romans 8:28" }, s)),
        yield* both((s) => call(getCrossReferences, { ref: "Romans 8:28" }, s)),
        yield* both((s) => call(getVerseWords, { ref: "Romans 8:28" }, s)),
        yield* both((s) => call(listResources, {}, s)),
      ]
      for (const [fromFs, fromFetch] of pairs) expect(fromFetch).toEqual(fromFs)
    }),
  )

  it.effect("fail with a typed not-found error when an ingested chapter's file is missing", () =>
    Effect.gen(function* () {
      const files = new Map(FILES)
      files.delete("text/bsb/Rom.8.json")
      const error = yield* call(
        getPassage,
        { ref: "Romans 8:28", translation: "bsb" },
        fetchStore(files),
      ).pipe(Effect.flip)
      expect(error).toMatchObject({ _tag: "ContentNotFound", path: "text/bsb/Rom.8.json" })
    }),
  )

  // The same files served under another release id stand in for the next release.
  it.effect("reject a cursor issued for another release", () =>
    Effect.gen(function* () {
      const page = yield* call(getCrossReferences, { ref: "Romans 8:28" })
      const error = yield* call(
        getCrossReferences,
        { ref: "Romans 8:28", cursor: page.cursor ?? "" },
        fetchStore(FILES, "2026-12-01-00000000"),
      ).pipe(Effect.flip)
      expect(error).toMatchObject({ _tag: "InvalidCursor", reason: "other_release" })
    }),
  )
})
