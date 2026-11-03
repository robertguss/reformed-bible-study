import { readFileSync } from "node:fs"
import { describe, expect, it } from "@effect/vitest"
import { mapHebrewVerse, parseTvtms } from "../../src/ingest/tvtms.ts"

const fixture = (name: string) =>
  readFileSync(new URL(`../fixtures/original-language/${name}`, import.meta.url), "utf8")

const table = parseTvtms(fixture("tvtms-excerpt.txt"))

describe("TVTMS Hebrew to KJV mapping", () => {
  it("maps Hebrew Malachi 3:19 to English Malachi 4:1", () => {
    expect(mapHebrewVerse(table, { book: "Mal", chapter: 3, verse: 19 })).toEqual({
      kind: "verse",
      ref: { book: "Mal", chapter: 4, verse: 1 },
    })
  })

  it("maps Hebrew Psalm 51:3 to English Psalm 51:1 and the Hebrew verses before it to the title", () => {
    expect(mapHebrewVerse(table, { book: "Ps", chapter: 51, verse: 3 })).toEqual({
      kind: "verse",
      ref: { book: "Ps", chapter: 51, verse: 1 },
    })
    expect(mapHebrewVerse(table, { book: "Ps", chapter: 51, verse: 2 })).toEqual({
      kind: "title",
      book: "Ps",
      chapter: 51,
    })
  })

  it("reports a Hebrew verse the English divides between two verses", () => {
    expect(mapHebrewVerse(table, { book: "Isa", chapter: 63, verse: 19 })).toEqual({
      kind: "divided",
      refs: [
        { book: "Isa", chapter: 63, verse: 19 },
        { book: "Isa", chapter: 64, verse: 1 },
      ],
    })
  })

  it("keeps a Hebrew verse the table does not renumber", () => {
    expect(mapHebrewVerse(table, { book: "Mal", chapter: 3, verse: 18 })).toEqual({
      kind: "verse",
      ref: { book: "Mal", chapter: 3, verse: 18 },
    })
  })
})
