import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import { parseCrossReferences } from "../../src/ingest/openbible.ts"

const tsv = readFileSync(
  join(import.meta.dirname, "../fixtures/bible-text/openbible-excerpt.tsv"),
  "utf8",
)

const targetsOf = (
  chapters: Effect.Success<ReturnType<typeof parseCrossReferences>>,
  book: string,
  chapter: number,
  verse: number,
) =>
  chapters
    .find((c) => c.book === book && c.chapter === chapter)
    ?.verses.find((v) => v.verse === verse)?.targets

describe("openbible.info cross-references", () => {
  it.effect("writes one chapter for every chapter of the canon", () =>
    Effect.gen(function* () {
      const chapters = yield* parseCrossReferences(tsv)
      expect(chapters).toHaveLength(1189)
      expect(chapters.every((c) => c.resourceId === "openbible-xrefs")).toBe(true)
    }),
  )

  it.effect("drops a row with negative votes and keeps a range target as a range", () =>
    Effect.gen(function* () {
      const chapters = yield* parseCrossReferences(tsv)
      const targets = targetsOf(chapters, "Gen", 1, 1) ?? []
      expect(targets.map((t) => t.target)).not.toContain("Exod.31.18")
      expect(targets).toContainEqual({ target: "Prov.8.22-Prov.8.30", votes: 78 })
    }),
  )

  it.effect("orders targets by votes, strongest first", () =>
    Effect.gen(function* () {
      const chapters = yield* parseCrossReferences(tsv)
      expect(targetsOf(chapters, "Rom", 8, 28)).toEqual([
        { target: "Rom.8.35-Rom.8.39", votes: 224 },
        { target: "Rom.8.30", votes: 173 },
        { target: "1Pet.1.7-1Pet.1.8", votes: 140 },
        { target: "2Cor.5.1", votes: 45 },
      ])
    }),
  )

  it.effect("renumbers 3 John 1:15 to the KJV's 3 John 1:14", () =>
    Effect.gen(function* () {
      const chapters = yield* parseCrossReferences(tsv)
      expect(targetsOf(chapters, "3John", 1, 14)).toEqual([{ target: "John.10.3", votes: 2 }])
      expect(targetsOf(chapters, "2John", 1, 1)).toEqual([
        { target: "2John.1.13-3John.1.14", votes: 7 },
      ])
    }),
  )
})
