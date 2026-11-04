import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "@effect/vitest"
import { type BookId, type TextRun } from "@reformed-bible/core"
import { Effect } from "effect"
import {
  DIODATI_ANNOTATIONS,
  JACKSON_ANNOTATIONS,
  WESTMINSTER_ANNOTATIONS,
} from "../../src/ingest/eebo-annotation-sets.ts"
import type { EeboCommentator } from "../../src/ingest/eebo-commentators.ts"
import { readTeiCommentary } from "../../src/ingest/tei-commentary.ts"

const FIXTURES = join(import.meta.dirname, "../fixtures")

const plain = (runs: ReadonlyArray<TextRun>): string => runs.map((run) => run.text).join("")

/** Reads an excerpt of one of a commentator's volumes with that volume's own layout. */
const read = (
  commentator: EeboCommentator,
  volume: number,
  fixture: string,
  books: ReadonlyArray<BookId>,
) =>
  readTeiCommentary(
    commentator.resourceId,
    readFileSync(join(FIXTURES, `${commentator.resourceId}-sample`, fixture), "utf8"),
    books,
    commentator.works[volume]?.layout ?? { chapterDivisions: new Set() },
  )

const refsOf = (books: ReadonlyArray<{ readonly sections: ReadonlyArray<{ ref: string }> }>) =>
  books.flatMap((book) => book.sections.map((section) => section.ref))

describe("the Westminster Annotations", () => {
  it.effect("keys the notes on Genesis 1 to Gen.1.1 onward, each at the verse it labels", () =>
    Effect.gen(function* () {
      const books = yield* read(WESTMINSTER_ANNOTATIONS, 0, "A36467-genesis-1-excerpt.xml", ["Gen"])
      expect(refsOf(books)).toEqual(["Gen.1.1", "Gen.1.2", "Gen.1.3", "Gen.1.4-Gen.1.31"])
      const [first, second] = books[0]?.sections.map((s) => s.paragraphs.map(plain)) ?? []
      // The book's argument opens the first verse, and the unlabelled notes stay with their verse.
      expect(first?.[0]).toBe("THE ARGUMENT.")
      expect(first?.[2]).toMatch(/^Vers\. 1\. IN the beginning\] That is, when God began/)
      expect(first?.slice(3).map((p) => p.slice(0, 12))).toEqual(["God] Of and ", "created] The"])
      expect(second?.[0]).toMatch(/^V\. 2\. earth\] That is, that great materiall masse/)
    }),
  )
})

describe("Diodati's Pious Annotations", () => {
  it.effect("reads Malachi 4 and Matthew 1 as consecutive books, skipping the Apocrypha", () =>
    Effect.gen(function* () {
      const books = yield* read(
        DIODATI_ANNOTATIONS,
        0,
        "A36033-malachi-4-to-matthew-1-excerpt.xml",
        ["Mal", "Matt"],
      )
      expect(books.map((book) => book.book)).toEqual(["Mal", "Matt"])
      expect(refsOf(books)).toEqual([
        "Mal.4.1",
        "Mal.4.2",
        "Mal.4.3-Mal.4.4",
        "Mal.4.5",
        "Mal.4.6",
        "Matt.1.1-Matt.1.4",
        "Matt.1.5-Matt.1.7",
        "Matt.1.8-Matt.1.25",
      ])
      const text = JSON.stringify(books)
      expect(text).not.toContain("Apocrypha")
      expect(text).not.toContain("Esdra")
      expect(text).not.toContain("FINIS")
    }),
  )
})

describe("Jackson's Annotations", () => {
  it.effect("keys Genesis 1 in the first volume by the verse its quotations name", () =>
    Effect.gen(function* () {
      const books = yield* read(JACKSON_ANNOTATIONS, 0, "A46823-genesis-1-excerpt.xml", ["Gen"])
      expect(refsOf(books)).toEqual(["Gen.1.1", "Gen.1.2", "Gen.1.3-Gen.1.31"])
      const second = books[0]?.sections[1]?.paragraphs.map(plain) ?? []
      expect(second[0]).toBe("Vers. 2. And the earth was without form, and void.]")
      expect(second).toContain("And darknesse was upon the face of the deep.]")
    }),
  )

  it.effect("keys Joshua 1 in the second volume, its unlabelled first note at verse 1", () =>
    Effect.gen(function* () {
      const books = yield* read(JACKSON_ANNOTATIONS, 1, "A46811-joshua-1-excerpt.xml", ["Josh"])
      expect(refsOf(books)).toEqual([
        "Josh.1.1",
        "Josh.1.2-Josh.1.4",
        "Josh.1.5",
        "Josh.1.6",
        "Josh.1.7-Josh.1.18",
      ])
      expect(plain(books[0]?.sections[0]?.paragraphs[0] ?? [])).toMatch(
        /^NOw after the death of Moses the servant of the Lord/,
      )
    }),
  )

  it.effect("keys Psalm 23 in the third volume", () =>
    Effect.gen(function* () {
      const books = yield* read(JACKSON_ANNOTATIONS, 2, "A46807-psalm-23-excerpt.xml", ["Ps"])
      expect(refsOf(books)).toEqual(["Ps.23.1-Ps.23.2", "Ps.23.3-Ps.23.5", "Ps.23.6"])
    }),
  )

  it.effect("keys Isaiah 53 in the fourth volume to Isa references", () =>
    Effect.gen(function* () {
      const books = yield* read(JACKSON_ANNOTATIONS, 3, "A46816-isaiah-53-excerpt.xml", ["Isa"])
      expect(refsOf(books)).toEqual(["Isa.53.1-Isa.53.4", "Isa.53.5", "Isa.53.6-Isa.53.12"])
      expect(plain(books[0]?.sections[0]?.paragraphs[0] ?? [])).toMatch(
        /^VERSE 1\. WHO hath believed our report/,
      )
    }),
  )

  it("covers Genesis to the Song of Songs and Isaiah, and no Jeremiah", () => {
    const record = JSON.parse(
      readFileSync(
        join(
          import.meta.dirname,
          "../../../../dataset/resources/jackson-annotations/resource.json",
        ),
        "utf8",
      ),
    ) as { readonly scope: ReadonlyArray<string> }
    const books = JACKSON_ANNOTATIONS.works.flatMap((work) => work.books)
    expect(record.scope).toEqual(books)
    expect(books).toEqual([
      ...["Gen", "Exod", "Lev", "Num", "Deut", "Josh", "Judg", "Ruth", "1Sam", "2Sam"],
      ...["1Kgs", "2Kgs", "1Chr", "2Chr", "Ezra", "Neh", "Esth", "Job", "Ps", "Prov"],
      ...["Eccl", "Song", "Isa"],
    ])
    expect(record.scope).not.toContain("Jer")
  })
})
