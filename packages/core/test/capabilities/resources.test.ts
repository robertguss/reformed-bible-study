import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import { listResources, resolveReference } from "../../src/capabilities/index.ts"
import { call, ORIGIN, UNINGESTED_CONFESSION, WITHDRAWN_REASON } from "./fixture.ts"

describe("list_resources", () => {
  it.effect(
    "lists the translations, Calvin, the Westminster Standards, cross-references and STEPBible data with license and coverage",
    () =>
      Effect.gen(function* () {
        const result = yield* call(listResources, {})
        const ids = result.items.map((item) => item.value.id)
        for (const id of [
          "asv",
          "bsb",
          "kjv",
          "web",
          "calvin-commentaries",
          "wcf",
          "wlc",
          "wsc",
          "openbible-xrefs",
          "sblgnt",
          "stepbible-lexicons",
          "stepbible-tagnt",
          "stepbible-tahot",
        ])
          expect(ids).toContain(id)
        const calvin = result.items.find((item) => item.value.id === "calvin-commentaries")
        expect(calvin?.value.license.spdx).toBe("CC-PDM-1.0")
        expect(calvin?.value.ingested).toEqual([{ book: "Rom", chapters: [7, 8] }])
        expect(calvin?.attribution.licenseUrl).toBe(
          "https://creativecommons.org/publicdomain/mark/1.0/",
        )
        const coverage = new Map(result.resources.map((r) => [r.resourceId, r.coverage]))
        expect([
          coverage.get("bsb"),
          coverage.get("calvin-commentaries"),
          coverage.get("wcf"),
          coverage.get(UNINGESTED_CONFESSION),
        ]).toEqual(["covered", "covered", "covered", "not_ingested"])
      }),
  )

  it.effect("returns a withdrawn resource with its status and reason", () =>
    Effect.gen(function* () {
      const result = yield* call(listResources, {})
      const withdrawn = result.resources.find((r) => r.resourceId === "withdrawn-commentary")
      expect(withdrawn?.status).toEqual({ state: "withdrawn", reason: WITHDRAWN_REASON })
      const item = result.items.find((i) => i.value.id === "withdrawn-commentary")
      expect(item?.value.status).toEqual({ state: "withdrawn", reason: WITHDRAWN_REASON })
    }),
  )
})

describe("resolve_reference", () => {
  it.effect("resolves free text to canonical passages and web URLs", () =>
    Effect.gen(function* () {
      const result = yield* call(resolveReference, { q: "Rom 8:28-30" })
      expect(result.items.map((item) => item.value)).toEqual([
        {
          osis: "Rom.8.28-Rom.8.30",
          display: "Romans 8:28-30",
          start: { book: "Rom", chapter: 8, verse: 28 },
          end: { book: "Rom", chapter: 8, verse: 30 },
          url: `${ORIGIN}/romans/8/28-30`,
        },
      ])
    }),
  )

  it.effect("fails Rom 8:40 with a typed error suggesting Romans 8:39", () =>
    Effect.gen(function* () {
      const error = yield* call(resolveReference, { q: "Rom 8:40" }).pipe(Effect.flip)
      expect(error).toMatchObject({
        _tag: "InvalidReference",
        reason: "out_of_range",
        suggestion: {
          start: { book: "Rom", chapter: 8, verse: 39 },
          end: { book: "Rom", chapter: 8, verse: 39 },
        },
      })
    }),
  )
})
