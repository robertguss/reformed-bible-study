import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import { getCrossReferences } from "../../src/capabilities/index.ts"
import { call, XREF_TARGETS } from "./fixture.ts"

describe("get_cross_references", () => {
  it.effect("follows page one's cursor to page two with no duplicates", () =>
    Effect.gen(function* () {
      const first = yield* call(getCrossReferences, { ref: "Romans 8:28" })
      expect(first.items).toHaveLength(25)
      expect(first.cursor).toBeDefined()
      const second = yield* call(getCrossReferences, {
        ref: "Romans 8:28",
        cursor: first.cursor ?? "",
      })
      expect(second.items).toHaveLength(5)
      expect(second.cursor).toBeUndefined()
      const targets = [...first.items, ...second.items].map((item) => item.value.target)
      expect(targets).toEqual(XREF_TARGETS.map((t) => t.target))
      expect(first.items[0]?.value).toMatchObject({ from: "Rom.8.28", display: "Psalm 1:1" })
      expect(first.items[0]?.attribution).toMatchObject({
        resourceId: "openbible-xrefs",
        license: "CC-BY-4.0",
      })
    }),
  )

  it.effect("honours a smaller page size", () =>
    Effect.gen(function* () {
      const result = yield* call(getCrossReferences, { ref: "Romans 8:28-29", limit: 10 })
      expect(result.items).toHaveLength(10)
      expect(result.cursor).toBeDefined()
    }),
  )
})
