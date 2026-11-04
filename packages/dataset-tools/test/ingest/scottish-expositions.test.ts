import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { describe, expect, it } from "@effect/vitest"
import { CommentaryBook, type BookId, type TextRun } from "@reformed-bible/core"
import { Effect, Layer } from "effect"
import { HttpClient, HttpClientResponse } from "effect/http"
import { sha256Hex } from "../../src/ingest/download.ts"
import { ingestEeboCommentator, type EeboCommentator } from "../../src/ingest/eebo-commentators.ts"
import { DICKSON, HUTCHESON } from "../../src/ingest/eebo-scottish-expositions.ts"
import { readTeiCommentary } from "../../src/ingest/tei-commentary.ts"
import { NORMALIZED_DIR, readNormalized } from "../../src/normalized.ts"
import { sourceCachePath } from "../../src/source-cache.ts"

const FIXTURES = join(import.meta.dirname, "../fixtures")

const plain = (runs: ReadonlyArray<TextRun>): string => runs.map((run) => run.text).join("")

const fixture = (commentator: EeboCommentator, name: string) =>
  readFileSync(join(FIXTURES, `${commentator.resourceId}-sample`, name), "utf8")

/** Reads an excerpt of one of a commentator's volumes with that volume's own layout. */
const read = (
  commentator: EeboCommentator,
  volume: number,
  name: string,
  books: ReadonlyArray<BookId>,
) =>
  readTeiCommentary(
    commentator.resourceId,
    fixture(commentator, name),
    books,
    commentator.works[volume]?.layout ?? { chapterDivisions: new Set() },
  )

const refsOf = (books: ReadonlyArray<{ readonly sections: ReadonlyArray<{ ref: string }> }>) =>
  books.flatMap((book) => book.sections.map((section) => section.ref))

const textOf = (books: ReadonlyArray<CommentaryBook>, ref: string): ReadonlyArray<string> =>
  books
    .flatMap((book) => book.sections)
    .find((section) => section.ref === ref)
    ?.paragraphs.map(plain) ?? []

// Every source is served from the cache, so a request reaching the network fails the test.
const offline = Layer.succeed(
  HttpClient.HttpClient,
  HttpClient.make((request) =>
    Effect.succeed(HttpClientResponse.fromWeb(request, new Response(null, { status: 503 }))),
  ),
)

describe("Dickson's expositions", () => {
  it.effect(
    "writes one Psalms file from the first two volumes, Psalm 51 following Psalm 50",
    () => {
      const root = mkdtempSync(join(tmpdir(), "dickson-"))
      // The first two volumes with their own layouts, each read from an excerpt in the cache.
      const works = [
        [0, "A35941-psalm-50-excerpt.xml"],
        [1, "A35945-psalm-51-excerpt.xml"],
      ].map(([volume, name]) => {
        const bytes = readFileSync(join(FIXTURES, "dickson-sample", name as string))
        const url = `https://raw.githubusercontent.com/textcreationpartnership/fixture/${name}`
        mkdirSync(dirname(sourceCachePath(root, url)), { recursive: true })
        writeFileSync(sourceCachePath(root, url), bytes)
        const work = DICKSON.works[volume as number]!
        return { ...work, source: { url, sha256: sha256Hex(bytes) } }
      })
      return Effect.gen(function* () {
        yield* ingestEeboCommentator(root, { resourceId: DICKSON.resourceId, works })
        expect(readdirSync(join(root, NORMALIZED_DIR, "dickson"))).toEqual(["Ps.json"])
        const psalms = yield* readNormalized(root, "dickson", "Ps.json", CommentaryBook)
        expect(refsOf([psalms])).toEqual([
          ...["Ps.50.1-Ps.50.3", "Ps.50.4-Ps.50.6", "Ps.50.7", "Ps.50.8-Ps.50.13"],
          ...["Ps.50.14-Ps.50.15", "Ps.50.16-Ps.50.21", "Ps.50.22-Ps.50.23"],
          ...["Ps.51.1-Ps.51.2", "Ps.51.3-Ps.51.6", "Ps.51.7-Ps.51.8", "Ps.51.9-Ps.51.13"],
          ...["Ps.51.14", "Ps.51.15-Ps.51.17", "Ps.51.18-Ps.51.19"],
        ])
        // The second volume's illegible letters stay visible.
        expect(textOf([psalms], "Ps.51.1-Ps.51.2")).toContain(
          "Ver. 1. HAve mercy upon me, O God, according t•… thy loving kindnesse: according unto the multitude of thy tender mercies blot out my transgressions. 2. Wash me throughly from mine iniquity, and cleanse me from my sin.",
        )
      }).pipe(Effect.provide(offline))
    },
  )

  it.effect(
    "reads Psalm 101 in the third volume, leaving out the imprimatur on its title page",
    () =>
      Effect.gen(function* () {
        const books = yield* read(DICKSON, 2, "A35943-psalm-101-excerpt.xml", ["Ps"])
        // Verse 4 is printed as a second verse 3, between the labels of verses 3 and 5.
        expect(refsOf(books)).toEqual([1, 2, 3, 4, 5, 6, 7, 8].map((verse) => `Ps.101.${verse}`))
        expect(textOf(books, "Ps.101.4")[0]).toBe(
          "Ver. 3. A froward heart shall depart from me, I will not know a wicked person.",
        )
        expect(JSON.stringify(books)).not.toContain("Imprimatur")
      }),
  )

  it.effect("keys Matthew 12 by the verses its misprinted labels quote", () =>
    Effect.gen(function* () {
      const books = yield* read(DICKSON, 3, "A35949-matthew-12-excerpt.xml", ["Matt"])
      expect(refsOf(books)).toEqual([
        ...["Matt.12.1", "Matt.12.2", "Matt.12.3-Matt.12.4", "Matt.12.5-Matt.12.6"],
        ...["Matt.12.7", "Matt.12.8", "Matt.12.9-Matt.12.12", "Matt.12.13-Matt.12.50"],
      ])
      expect(textOf(books, "Matt.12.8")[0]).toBe(
        "Verse 18. For the Son of man is Lord even of the Sabbath day.",
      )
      expect(textOf(books, "Matt.12.9-Matt.12.12")[0]).toMatch(
        /^Ver\. 8\. And when he was departed thence, he went into their synagogue\./,
      )
      // The discourse on the title of the New Testament, before the Gospel's own division, is left out.
      expect(JSON.stringify(books)).not.toContain("The whole Bible is commonly called")
    }),
  )

  it.effect(
    "keys 2 Thessalonians 1:1-2, printed in the chapter's argument, as its own first section",
    () =>
      Effect.gen(function* () {
        const books = yield* read(DICKSON, 4, "A35951-2-thessalonians-1-excerpt.xml", ["2Thess"])
        expect(refsOf(books)).toEqual([
          ...["2Thess.1.1-2Thess.1.2", "2Thess.1.3", "2Thess.1.4", "2Thess.1.5"],
          ...["2Thess.1.6-2Thess.1.9", "2Thess.1.10", "2Thess.1.11", "2Thess.1.12"],
        ])
        expect(textOf(books, "2Thess.1.1-2Thess.1.2").map((p) => p.slice(0, 24))).toEqual([
          "THE CONTENTS.",
          "THe occasion of writing ",
          "Ver. 1. PAul and Sylvanu",
          "2. Grace unto you, and P",
          "In the direction of the ",
        ])
        // The division with no heading after Hebrews holds Dickson's separate work on Hebrews.
        expect(JSON.stringify(books)).not.toContain("TO THE READER")
      }),
  )
})

describe("Hutcheson's expositions", () => {
  it.effect("keys John 3 one section per verse division, at the verse its epigraph names", () =>
    Effect.gen(function* () {
      const books = yield* read(HUTCHESON, 4, "A45241-john-3-excerpt.xml", ["John"])
      expect(refsOf(books)).toEqual([
        "John.3.1-John.3.2",
        "John.3.3",
        "John.3.4",
        "John.3.5-John.3.36",
      ])
      expect(textOf(books, "John.3.3")[0]).toMatch(/^Ver\. 3\. Jesus answered, and said unto him/)
    }),
  )

  it.effect("keys Job 33's division labelled verse 3 at the verse 2 it quotes", () =>
    Effect.gen(function* () {
      const books = yield* read(HUTCHESON, 0, "A45240-job-33-excerpt.xml", ["Job"])
      expect(refsOf(books)).toEqual([
        "Job.33.1",
        "Job.33.2",
        "Job.33.3",
        "Job.33.4",
        "Job.33.5-Job.33.33",
      ])
      expect(textOf(books, "Job.33.2")[0]).toBe(
        "Ver. 3. Behold, now I have opened my mouth, my tongue hath spoken in my mouth.",
      )
    }),
  )

  it.effect("keys Hosea 1, Jonah 2 and Malachi 4 in the three volumes on the Minor Prophets", () =>
    Effect.gen(function* () {
      const hosea = yield* read(HUTCHESON, 1, "A86936-hosea-1-excerpt.xml", ["Hos"])
      const jonah = yield* read(HUTCHESON, 2, "A86934-jonah-2-excerpt.xml", ["Jonah"])
      const malachi = yield* read(HUTCHESON, 3, "A86932-malachi-4-excerpt.xml", ["Mal"])
      expect(refsOf(hosea)).toEqual([
        ...["Hos.1.1", "Hos.1.2", "Hos.1.3-Hos.1.5", "Hos.1.6", "Hos.1.7"],
        ...["Hos.1.8-Hos.1.9", "Hos.1.10", "Hos.1.11"],
      ])
      expect(refsOf(jonah)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => `Jonah.2.${v}`))
      expect(refsOf(malachi)).toEqual([1, 2, 3, 4, 5, 6].map((v) => `Mal.4.${v}`))
      expect(textOf(jonah, "Jonah.2.1")[1]).toBe(
        "Ver. 1. THen Jonah prayed unto the LORD his God, out of the fishes belly.",
      )
    }),
  )

  it("covers Job, the twelve Minor Prophets and John, so Genesis is outside his work", () => {
    const record = JSON.parse(
      readFileSync(
        join(import.meta.dirname, "../../../../dataset/resources/hutcheson/resource.json"),
        "utf8",
      ),
    ) as { readonly scope: ReadonlyArray<string> }
    const books = HUTCHESON.works.flatMap((work) => work.books)
    expect(record.scope).toEqual(books)
    expect(books).toEqual([
      ...["Job", "Hos", "Joel", "Amos", "Obad", "Jonah", "Mic", "Nah", "Hab", "Zeph"],
      ...["Hag", "Zech", "Mal", "John"],
    ])
    expect(record.scope).not.toContain("Gen")
  })
})
