import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import { getPassage } from "../../src/capabilities/index.ts"
import { BSB_ROMANS_8_28, call, ORIGIN } from "./fixture.ts"

describe("get_passage", () => {
  it.effect("returns Romans 8:28 in the BSB with its attribution and coverage covered", () =>
    Effect.gen(function* () {
      const result = yield* call(getPassage, { ref: "Romans 8:28", translation: "bsb" })
      expect(result.items.map((item) => item.value)).toEqual([
        {
          osis: "Rom.8.28",
          verse: 28,
          heading: "God Works in All Things",
          text: [{ text: BSB_ROMANS_8_28 }],
        },
      ])
      expect(result.items[0]?.attribution).toMatchObject({
        resourceId: "bsb",
        work: "Berean Standard Bible",
        license: "LicenseRef-BSB-Dedication",
        licenseUrl: "https://berean.bible/terms.htm",
      })
      expect(result.resources).toEqual([
        { resourceId: "bsb", coverage: "covered", status: { state: "active" } },
      ])
      expect(result.canonicalUrl).toBe(`${ORIGIN}/romans/8/28`)
    }),
  )

  it.effect("marks Romans 16:24 as absent from the BSB, with the translation's note", () =>
    Effect.gen(function* () {
      const result = yield* call(getPassage, { ref: "Romans 16", translation: "bsb" })
      expect(result.items.map((item) => item.value).find((v) => v.verse === 24)).toEqual({
        osis: "Rom.16.24",
        verse: 24,
        absent: true,
        note: "Not in this translation.",
      })
    }),
  )

  it.effect("returns one chapter per call and a cursor to the next chapter", () =>
    Effect.gen(function* () {
      const first = yield* call(getPassage, { ref: "Romans 8:28-9:2", translation: "bsb" })
      expect(first.items.map((item) => item.value.osis)).toEqual(["Rom.8.28", "Rom.8.29"])
      expect(first.cursor).toBeDefined()
      const second = yield* call(getPassage, {
        ref: "Romans 8:28-9:2",
        translation: "bsb",
        cursor: first.cursor ?? "",
      })
      // Romans 9 is not ingested for this fixture translation.
      expect(second.items).toEqual([])
      expect(second.resources[0]?.coverage).toBe("not_ingested")
      expect(second.cursor).toBeUndefined()
    }),
  )

  it.effect("fails with a typed error for a translation the catalog does not list", () =>
    Effect.gen(function* () {
      const error = yield* call(getPassage, { ref: "Romans 8:28", translation: "niv" }).pipe(
        Effect.flip,
      )
      expect(error).toMatchObject({ _tag: "UnknownResource", resourceId: "niv" })
    }),
  )
})
