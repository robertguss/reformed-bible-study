import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "@effect/vitest"
import type { TextRun } from "@reformed-bible/core"
import { Effect } from "effect"
import { OWEN_LAYOUT, OWEN_RESOURCE_ID } from "../../src/ingest/owen.ts"
import { readTeiCommentary } from "../../src/ingest/tei-commentary.ts"

const EXCERPT = readFileSync(
  join(import.meta.dirname, "../fixtures/owen-sample/A53678-hebrews-6-and-10-excerpt.xml"),
  "utf8",
)

const plain = (runs: ReadonlyArray<TextRun>): string => runs.map((run) => run.text).join("")

const read = Effect.gen(function* () {
  const [hebrews] = yield* readTeiCommentary(OWEN_RESOURCE_ID, EXCERPT, ["Heb"], OWEN_LAYOUT)
  return (hebrews?.sections ?? []).map((section) => ({
    ref: section.ref,
    paragraphs: section.paragraphs.map(plain),
    notes: section.notes.map(plain),
  }))
})

const section = <S extends { readonly ref: string }>(sections: ReadonlyArray<S>, ref: string) =>
  sections.find((s) => s.ref === ref)

describe("Owen on Hebrews", () => {
  it.effect("keys each exposition to the first verse its division names", () =>
    Effect.gen(function* () {
      const sections = yield* read
      expect(sections.map((s) => s.ref)).toEqual([
        "Heb.6.1-Heb.6.2",
        "Heb.6.3",
        "Heb.6.4-Heb.6.6",
        "Heb.6.7-Heb.6.20",
        "Heb.10.1",
        "Heb.10.2-Heb.10.39",
      ])
      const verses4to6 = section(sections, "Heb.6.4-Heb.6.6")?.paragraphs ?? []
      expect(verses4to6.slice(0, 2)).toEqual(["Verse 4, 5, 6.", "〈 in non-Latin alphabet 〉."])
      expect(verses4to6[2]).toMatch(
        /^〈 in non-Latin alphabet 〉\. Impossibile enim, that is, est, it is impossible, Syr\. 〈 in non-Latin alphabet 〉 But they cannot\./,
      )
      expect(section(sections, "Heb.6.3")).toMatchObject({
        paragraphs: [
          "Verse 3.",
          "〈 in non-Latin alphabet 〉. And this will we do, if so be that God permit.",
          expect.stringMatching(/^These words contain two things\./),
        ],
        notes: ["Ver. 3."],
      })
    }),
  )

  it.effect(
    "opens the chapter's first section with its introduction, leaving out the chapter heading",
    () =>
      Effect.gen(function* () {
        const verses1and2 = section(yield* read, "Heb.6.1-Heb.6.2")?.paragraphs ?? []
        expect(verses1and2[0]).toMatch(/^THis whole Chapter is a continuation of the Digression/)
        expect(verses1and2.slice(3, 5)).toEqual(["Ver. 1.", "〈 in non-Latin alphabet 〉."])
        // The division on verses 1 and 2 opens on the same verse, so it shares the section.
        expect(verses1and2.slice(-2)[0]).toBe("Verse 1, 2.")
        expect(verses1and2.some((p) => p.startsWith("AN EXPOSITION"))).toBe(false)
      }),
  )

  it.effect("keys the introduction to verse 1 when the chapter's first division begins later", () =>
    Effect.gen(function* () {
      const verse1 = section(yield* read, "Heb.10.1")?.paragraphs ?? []
      expect(verse1[0]).toMatch(/^THere are two parts of this Chapter\./)
      expect(verse1).toContain("The first of these is contained in the first verse.")
      expect(verse1.at(-1)).toMatch(
        /^1\. The conjunctive particle 〈 in non-Latin alphabet 〉, For, intimates/,
      )
    }),
  )

  it.effect("leaves out the closing FINIS and duplicate-page marks after the last division", () =>
    Effect.gen(function* () {
      expect(section(yield* read, "Heb.10.2-Heb.10.39")?.paragraphs).toEqual([
        "VERSE II, III.",
        "〈 in non-Latin alphabet 〉",
      ])
    }),
  )
})
