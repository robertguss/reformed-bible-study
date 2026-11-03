import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import { parseUsfm } from "../../src/ingest/usfm.ts"

const fixture = (name: string) =>
  readFileSync(join(import.meta.dirname, "../fixtures/bible-text", name), "utf8")

describe("USFM parser", () => {
  it.effect("joins a WEB poetry verse spread across several lines into one verse", () =>
    Effect.gen(function* () {
      const book = yield* parseUsfm(fixture("web-PSA-1-excerpt.usfm"))
      expect(book.code).toBe("PSA")
      expect(book.verses.filter((v) => v.chapter === 1 && v.verse === 1)).toEqual([
        {
          chapter: 1,
          verse: 1,
          text: "Blessed is the man who doesn’t walk in the counsel of the wicked, nor stand on the path of sinners, nor sit in the seat of scoffers;",
        },
      ])
    }),
  )

  it.effect("drops Strong's numbers and footnotes without breaking words apart", () =>
    Effect.gen(function* () {
      const book = yield* parseUsfm(fixture("web-PSA-1-excerpt.usfm"))
      expect(book.verses.find((v) => v.verse === 2)?.text).toBe(
        "but his delight is in the LORD’s law. On his law he meditates day and night.",
      )
    }),
  )

  it.effect("places a heading before the verse that follows it", () =>
    Effect.gen(function* () {
      const book = yield* parseUsfm(fixture("web-PSA-1-excerpt.usfm"))
      expect(book.headings).toEqual([{ chapter: 1, beforeVerse: 1, text: "BOOK 1" }])
    }),
  )

  it.effect("sets aside a heading that no verse follows, such as a KJV epistle subscription", () =>
    Effect.gen(function* () {
      const book = yield* parseUsfm(fixture("kjv-ROM-16.usfm"))
      expect(book.headings).toEqual([])
      expect(book.unplacedHeadings).toEqual([
        {
          chapter: 16,
          text: "Written to the Romans from Corinthus, and sent by Phebe servant of the church at Cenchrea.",
        },
      ])
    }),
  )

  it.effect(
    "treats the ASV's centered acrostic letters in Psalm 119 as headings, not verse text",
    () =>
      Effect.gen(function* () {
        const asv = [
          "\\id PSA",
          "\\c 119",
          "\\qc א ALEPH.",
          "\\q1",
          "\\v 8 I will observe thy statutes:",
          "\\q1 Oh forsake me not utterly.",
          "\\qc ב BETH.",
          "\\q1",
          "\\v 9 Wherewith shall a young man cleanse his way?",
        ].join("\n")
        const book = yield* parseUsfm(asv)
        expect(book.verses.find((v) => v.verse === 8)?.text).toBe(
          "I will observe thy statutes: Oh forsake me not utterly.",
        )
        expect(book.headings).toEqual([
          { chapter: 119, beforeVerse: 8, text: "א ALEPH." },
          { chapter: 119, beforeVerse: 9, text: "ב BETH." },
        ])
      }),
  )

  it.effect("places a heading between two chapters before the first verse of the next", () =>
    Effect.gen(function* () {
      const asv = [
        "\\id PSA",
        "\\c 41",
        "\\q1",
        "\\v 13 Blessed be Jehovah, the God of Israel, From everlasting and to everlasting. Amen, and Amen.",
        "\\ms1 BOOK II",
        "\\c 42",
        "\\d For the Chief Musician. Maschil of the sons of Korah.",
        "\\q1",
        "\\v 1 As the hart panteth after the water brooks,",
      ].join("\n")
      const book = yield* parseUsfm(asv)
      expect(book.headings).toEqual([
        { chapter: 42, beforeVerse: 1, text: "BOOK II" },
        {
          chapter: 42,
          beforeVerse: 1,
          text: "For the Chief Musician. Maschil of the sons of Korah.",
        },
      ])
      expect(book.unplacedHeadings).toEqual([])
    }),
  )
})
