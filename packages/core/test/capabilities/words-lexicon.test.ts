import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import { getLexiconEntry, getVerseWords } from "../../src/capabilities/index.ts"
import { call } from "./fixture.ts"

describe("get_verse_words", () => {
  it.effect("returns the Greek words of Romans 8:28 with SBLGNT attribution", () =>
    Effect.gen(function* () {
      const result = yield* call(getVerseWords, { ref: "Romans 8:28" })
      expect(result.items.map((item) => item.value.words.map((w) => w.stepStrongs))).toEqual([
        ["G6063", "G1161"],
      ])
      expect(result.items[0]?.value).toMatchObject({ osis: "Rom.8.28", language: "grc" })
      expect(result.items[0]?.attribution.resourceId).toBe("sblgnt")
      const coverage = new Map(result.resources.map((r) => [r.resourceId, r.coverage]))
      expect([coverage.get("sblgnt"), coverage.get("stepbible-tahot")]).toEqual([
        "covered",
        "outside_work",
      ])
    }),
  )
})

describe("get_lexicon_entry", () => {
  it.effect("finds an entry by its STEPBible number", () =>
    Effect.gen(function* () {
      const result = yield* call(getLexiconEntry, { strongs: "G6063" })
      expect(result.items.map((item) => [item.value.strongs, item.value.stepStrongs])).toEqual([
        ["G1492", "G6063"],
      ])
      expect(result.items[0]?.attribution.resourceId).toBe("stepbible-lexicons")
    }),
  )

  it.effect("finds the entries filed under a classic Strong's number", () =>
    Effect.gen(function* () {
      const result = yield* call(getLexiconEntry, { strongs: "g1492" })
      expect(result.items.map((item) => item.value.stepStrongs)).toEqual(["G6063", "G1492G"])
    }),
  )

  it.effect("fails with a typed not-found error for a number with no entry", () =>
    Effect.gen(function* () {
      const error = yield* call(getLexiconEntry, { strongs: "G9999" }).pipe(Effect.flip)
      expect(error).toMatchObject({ _tag: "EntryNotFound", entry: "G9999" })
    }),
  )
})
