import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { describe, expect, it } from "@effect/vitest"
import { CommentaryBook, type BookId, type TextRun } from "@reformed-bible/core"
import { Effect, Layer } from "effect"
import { HttpClient, HttpClientResponse } from "effect/http"
import { sha256Hex } from "../../src/ingest/download.ts"
import { ingestEeboCommentator, type EeboCommentator } from "../../src/ingest/eebo-commentators.ts"
import {
  DICKSON,
  DURHAM,
  FERGUSSON,
  HUTCHESON,
  LEIGHTON,
  NISBET,
} from "../../src/ingest/eebo-scottish-expositions.ts"
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

/** Puts excerpts of a commentator's volumes in the source cache, each read with its volume's layout. */
const cachedVolumes = (
  root: string,
  commentator: EeboCommentator,
  volumes: ReadonlyArray<readonly [volume: number, name: string]>,
) =>
  volumes.map(([volume, name]) => {
    const bytes = readFileSync(join(FIXTURES, `${commentator.resourceId}-sample`, name))
    const url = `https://raw.githubusercontent.com/textcreationpartnership/fixture/${name}`
    mkdirSync(dirname(sourceCachePath(root, url)), { recursive: true })
    writeFileSync(sourceCachePath(root, url), bytes)
    const work = commentator.works[volume]!
    return { ...work, source: { url, sha256: sha256Hex(bytes) } }
  })

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
      const works = cachedVolumes(root, DICKSON, [
        [0, "A35941-psalm-50-excerpt.xml"],
        [1, "A35945-psalm-51-excerpt.xml"],
      ])
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

describe("Fergusson's expositions", () => {
  it.effect("keys Ephesians 1 by its divisions' headings, reading verse 6, printed 5, as 6", () =>
    Effect.gen(function* () {
      const books = yield* read(FERGUSSON, 0, "A41197-ephesians-1-excerpt.xml", ["Eph"])
      expect(refsOf(books)).toEqual([
        ...["Eph.1.4", "Eph.1.5", "Eph.1.6", "Eph.1.7-Eph.1.21", "Eph.1.22-Eph.1.23"],
      ])
      expect(textOf(books, "Eph.1.6")[0]).toMatch(/^Vers\. 5, To the praise of the glory/)
      expect(textOf(books, "Eph.1.22-Eph.1.23")[0]).toMatch(/^Vers\.—22\. And gave Him/)
    }),
  )

  it.effect("keys both divisions on Philippians 1:18 to one section", () =>
    Effect.gen(function* () {
      const books = yield* read(FERGUSSON, 1, "A41199-philippians-1-excerpt.xml", ["Phil"])
      expect(refsOf(books)).toEqual([
        "Phil.1.15-Phil.1.17",
        "Phil.1.18-Phil.1.19",
        "Phil.1.20-Phil.1.30",
      ])
      expect(textOf(books, "Phil.1.18-Phil.1.19")[2]).toMatch(
        /^Vers\.—18\. yea, and will rejoyce\./,
      )
    }),
  )

  it.effect(
    "keys 1 Thessalonians 2 by its quotations' labels, reading verse 6, printed 10, as 6",
    () =>
      Effect.gen(function* () {
        const books = yield* read(FERGUSSON, 2, "A41200-1-thessalonians-2-excerpt.xml", ["1Thess"])
        expect(refsOf(books)).toEqual([
          ...["1Thess.2.4", "1Thess.2.5", "1Thess.2.6", "1Thess.2.7", "1Thess.2.8-1Thess.2.20"],
        ])
        // The chapter's analysis, which names ver. 13 in prose, opens the first section.
        expect(textOf(books, "1Thess.2.4")[0]).toMatch(
          /^IN the first part of this Chapter.* ver\. 13\./,
        )
        expect(textOf(books, "1Thess.2.6")[0]).toMatch(/^Ver\. 10\. Nor of men sought we glory/)
      }),
  )
})

describe("Nisbet's exposition", () => {
  it.effect(
    "keys 1 Peter 1 by its divisions' numbers, verse 5 running on over the lost pages",
    () =>
      Effect.gen(function* () {
        const books = yield* read(NISBET, 0, "A52355-1-peter-1-excerpt.xml", ["1Pet"])
        expect(refsOf(books)).toEqual([
          "1Pet.1.4",
          "1Pet.1.5-1Pet.1.8",
          "1Pet.1.9",
          "1Pet.1.10-1Pet.1.25",
        ])
        expect(textOf(books, "1Pet.1.5-1Pet.1.8").at(-1)).toBe("〈12 pages missing〉")
        expect(textOf(books, "1Pet.1.9")[0]).toMatch(/^service, to wit, an undoubted right/)
      }),
  )
})

describe("Leighton's commentary", () => {
  it.effect("writes one 1 Peter file from both volumes, chapter 3 following chapter 2", () => {
    const root = mkdtempSync(join(tmpdir(), "leighton-"))
    const works = cachedVolumes(root, LEIGHTON, [
      [0, "A47642-1-peter-2-excerpt.xml"],
      [1, "A47643-1-peter-3-excerpt.xml"],
    ])
    return Effect.gen(function* () {
      yield* ingestEeboCommentator(root, { resourceId: LEIGHTON.resourceId, works })
      expect(readdirSync(join(root, NORMALIZED_DIR, "leighton"))).toEqual(["1Pet.json"])
      const peter = yield* readNormalized(root, "leighton", "1Pet.json", CommentaryBook)
      // The second volume's chapters are numbered only by their headings.
      expect(refsOf([peter])).toEqual([
        ...["1Pet.2.21-1Pet.2.23", "1Pet.2.24", "1Pet.2.25"],
        ...[
          "1Pet.3.1",
          "1Pet.3.2",
          "1Pet.3.3-1Pet.3.22",
          "1Pet.4.1-1Pet.4.19",
          "1Pet.5.1-1Pet.5.14",
        ],
      ])
      expect(textOf([peter], "1Pet.2.21-1Pet.2.23")[0]).toBe("Verse. 21.22, 23.")
    }).pipe(Effect.provide(offline))
  })
})

describe("Durham's expositions", () => {
  it.effect("keys Song of Solomon 1 by its divisions' numbers, the Key opening verse 1", () =>
    Effect.gen(function* () {
      const books = yield* read(DURHAM, 0, "A37032-song-1-excerpt.xml", ["Song"])
      // The division on verse 8 is headed 2 Part., which is not read as verse 2.
      expect(refsOf(books)).toEqual([
        ...["Song.1.1", "Song.1.2-Song.1.6", "Song.1.7", "Song.1.8", "Song.1.9-Song.1.17"],
      ])
      expect(textOf(books, "Song.1.1")[0]).toMatch(/^THis is a place of Scripture/)
      expect(textOf(books, "Song.1.8")[0]).toBe("2 Part. CHRISTS Words.")
    }),
  )

  it.effect("keys the sermons on Isaiah 53 inside that chapter by the verse each one heads", () =>
    Effect.gen(function* () {
      const books = yield* read(DURHAM, 1, "A81890-isaiah-53-excerpt.xml", ["Isa"])
      expect(refsOf(books)).toEqual([
        "Isa.53.1",
        "Isa.53.2-Isa.53.3",
        "Isa.53.4-Isa.53.11",
        "Isa.53.12",
      ])
      // The first two sermons both preach on verse 1.
      expect(textOf(books, "Isa.53.1")).toContain("SERMON II.")
      expect(textOf(books, "Isa.53.4-Isa.53.11")[1]).toMatch(/^ISAIAH LIII\.IV, V\. Vers\. 4\./)
    }),
  )

  it.effect("keys the second lecture on Revelation 5 as one section covering 5:8 to 14", () =>
    Effect.gen(function* () {
      const books = yield* read(DURHAM, 2, "A37035-revelation-5-excerpt.xml", ["Rev"])
      expect(refsOf(books)).toEqual(["Rev.5.1-Rev.5.7", "Rev.5.8-Rev.5.14", "Rev.6.1-Rev.6.17"])
      expect(textOf(books, "Rev.5.8-Rev.5.14")[0]).toBe("LECTURE II.")
    }),
  )
})
