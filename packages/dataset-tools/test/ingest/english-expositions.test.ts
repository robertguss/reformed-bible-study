import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { describe, expect, it } from "@effect/vitest"
import {
  CommentaryBook,
  parseOsis,
  verseCount,
  type BookId,
  type TextRun,
} from "@reformed-bible/core"
import { Effect, Layer } from "effect"
import { HttpClient, HttpClientResponse } from "effect/http"
import { sha256Hex } from "../../src/ingest/download.ts"
import { ingestEeboCommentator, type EeboCommentator } from "../../src/ingest/eebo-commentators.ts"
import {
  BURROUGHS,
  MANTON,
  SIBBES,
  THOMAS_HALL,
} from "../../src/ingest/eebo-english-expositions.ts"
import { readTeiCommentary } from "../../src/ingest/tei-commentary.ts"
import { NORMALIZED_DIR, readNormalized } from "../../src/normalized.ts"
import { sourceCachePath } from "../../src/source-cache.ts"

const FIXTURES = join(import.meta.dirname, "../fixtures")

const plain = (runs: ReadonlyArray<TextRun>): string => runs.map((run) => run.text).join("")

/** Excerpts of Hall's work sit with the earlier adapter fixtures, under `hall-sample`. */
const sampleDir = (commentator: EeboCommentator) =>
  commentator === THOMAS_HALL ? "hall-sample" : `${commentator.resourceId}-sample`

/** Reads an excerpt of one of a commentator's volumes with that volume's own layout. */
const read = (
  commentator: EeboCommentator,
  volume: number,
  name: string,
  books: ReadonlyArray<BookId>,
) =>
  readTeiCommentary(
    commentator.resourceId,
    readFileSync(join(FIXTURES, sampleDir(commentator), name), "utf8"),
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
    const bytes = readFileSync(join(FIXTURES, sampleDir(commentator), name))
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

describe("Burroughs's Hosea", () => {
  it.effect("writes one Hosea file from all four volumes, in the order of the chapters", () => {
    const root = mkdtempSync(join(tmpdir(), "burroughs-"))
    const works = cachedVolumes(root, BURROUGHS, [
      [0, "A30572-hosea-1-excerpt.xml"],
      [1, "A77979-hosea-5-and-6-excerpt.xml"],
      [2, "A30574-hosea-8-to-10-excerpt.xml"],
      [3, "A30575-hosea-13-excerpt.xml"],
    ])
    return Effect.gen(function* () {
      yield* ingestEeboCommentator(root, { resourceId: BURROUGHS.resourceId, works })
      expect(readdirSync(join(root, NORMALIZED_DIR, "burroughs"))).toEqual(["Hos.json"])
      const hosea = yield* readNormalized(root, "burroughs", "Hos.json", CommentaryBook)
      expect(refsOf([hosea])).toEqual([
        // The first volume's lectures, each at the first verse its label names in figures.
        ...["Hos.1.1-Hos.1.5", "Hos.1.6-Hos.1.7", "Hos.1.8-Hos.1.10", "Hos.1.11"],
        // The second volume's two expositions, of chapters 4 and 5 and of chapters 6 and 7.
        ...["Hos.5.14", "Hos.5.15", "Hos.6.1", "Hos.6.2-Hos.6.11"],
        // The third volume, whose first chapter division carries no number.
        ...["Hos.8.1-Hos.8.3", "Hos.8.4-Hos.8.10", "Hos.8.11-Hos.8.14", "Hos.9.1-Hos.9.17"],
        ...["Hos.10.1-Hos.10.14", "Hos.10.15"],
        // The fourth volume, ending where Burroughs's lectures end.
        ...["Hos.13.1-Hos.13.9", "Hos.13.10", "Hos.13.11"],
      ])
    }).pipe(Effect.provide(offline))
  })

  it.effect("keys each lecture on Hosea 1 by its label, never by the lecture's number", () =>
    Effect.gen(function* () {
      const books = yield* read(BURROUGHS, 0, "A30572-hosea-1-excerpt.xml", ["Hos"])
      const lectures = (ref: string) =>
        textOf(books, ref).filter((paragraph) => /^The \w+ LECT/i.test(paragraph))
      // The second and fifth lectures' labels name their verses only in words, so each continues
      // the section before it, and the sixth opens verse 11 by the figure in its label.
      expect(lectures("Hos.1.1-Hos.1.5")).toEqual(["The First LECTVRE.", "The Second Lecture."])
      expect(lectures("Hos.1.6-Hos.1.7")).toEqual(["The Third Lecture."])
      expect(lectures("Hos.1.8-Hos.1.10")).toEqual(["The Fourth Lecture", "The Fift Lecture"])
      expect(lectures("Hos.1.11")).toEqual(["The Sixth Lecture", "The Seventh Lecture"])
      expect(textOf(books, "Hos.1.11")[1]).toBe(
        "HOSEA 1. the middle of the 11. verse. And appoint themselves one head, and they shall come up out of the land.",
      )
    }),
  )
})

describe("Sibbes's sermons on Hosea 14", () => {
  it.effect("keys each sermon to the verse its text quotes in the King James Version", () =>
    Effect.gen(function* () {
      const books = yield* read(SIBBES, 0, "A12190-hosea-14-sermons-excerpt.xml", ["Hos"])
      expect(refsOf(books)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9].map((verse) => `Hos.14.${verse}`))
      // The sermon labelled 14.10 quotes Who is wise, the King James Version's 14:9.
      expect(textOf(books, "Hos.14.9").slice(0, 2)).toEqual([
        "THE FOVRTEENTH SERMON.",
        expect.stringMatching(/^HOS\. 14\.10\. Who is wise and he shall understand/),
      ])
      // The ninth sermon, labelled 14.6, quotes 14:7.
      expect(textOf(books, "Hos.14.7").slice(0, 2)).toEqual([
        "THE NINTH SERMON.",
        expect.stringMatching(/^HOS\. 14\.6\. They that dwell under his shadow shall returne/),
      ])
      // The sermons labelled 14.9 quote 14:8, and share its section with the one labelled 14.8.
      expect(textOf(books, "Hos.14.8").filter((p) => p.endsWith("SERMON."))).toEqual([
        "THE TENTH SERMON.",
        "THE ELEVENTH SERMON.",
        "THE TWELFTH SERMON.",
        "THE THIRTEENTH SERMON.",
      ])
      // The treatise bound after the sermons is not read.
      expect(JSON.stringify(books)).not.toContain("Priviledge")
    }),
  )
})

describe("Hosea from Burroughs, Hall and Sibbes", () => {
  it.effect("comments on every verse of Hosea 13 and 14 exactly once", () =>
    Effect.gen(function* () {
      const books = [
        ...(yield* read(BURROUGHS, 3, "A30575-hosea-13-excerpt.xml", ["Hos"])),
        ...(yield* read(THOMAS_HALL, 0, "A45340-hosea-13-12-and-13-excerpt.xml", ["Hos"])),
        ...(yield* read(SIBBES, 0, "A12190-hosea-14-sermons-excerpt.xml", ["Hos"])),
      ]
      const covered: Array<string> = []
      for (const ref of refsOf(books)) {
        const { start, end } = yield* Effect.fromResult(parseOsis(ref))
        for (let verse = start.verse; verse <= end.verse; verse++)
          covered.push(`${start.chapter}:${verse}`)
      }
      const every = [13, 14].flatMap((chapter) =>
        Array.from({ length: verseCount("Hos", chapter) }, (_, i) => `${chapter}:${i + 1}`),
      )
      expect(covered).toEqual(every)
      expect(refsOf(books).filter((ref) => ref.startsWith("Hos.13."))).toEqual([
        ...["Hos.13.1-Hos.13.9", "Hos.13.10", "Hos.13.11"],
        ...["Hos.13.12", "Hos.13.13-Hos.13.16"],
      ])
    }),
  )
})

describe("Sibbes on 2 Corinthians 1", () => {
  it.effect("keys the chapter by its divisions' numbers, verse 2 running on to verse 4", () =>
    Effect.gen(function* () {
      const books = yield* read(SIBBES, 1, "A60194-2-corinthians-1-excerpt.xml", ["2Cor"])
      expect(refsOf(books)).toEqual([
        ...["2Cor.1.1", "2Cor.1.2-2Cor.1.4", "2Cor.1.5-2Cor.1.7", "2Cor.1.8-2Cor.1.24"],
      ])
      expect(textOf(books, "2Cor.1.8-2Cor.1.24")[0]).toMatch(
        /^VERS\. 8, 9\. For we would not, Brethren, have you ignorant/,
      )
    }),
  )
})

describe("Manton on Jude", () => {
  it.effect("keys Jude by its divisions' numbers, not the misprinted label of verse 24", () =>
    Effect.gen(function* () {
      const books = yield* read(MANTON, 0, "A89503-jude-excerpt.xml", ["Jude"])
      expect(refsOf(books)).toEqual([
        ...["Jude.1.1-Jude.1.21", "Jude.1.22-Jude.1.23", "Jude.1.24", "Jude.1.25"],
      ])
      expect(textOf(books, "Jude.1.24")[0]).toMatch(/^Verse 94\. Now unto him that is able/)
    }),
  )
})
