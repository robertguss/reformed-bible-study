import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { describe, expect, it } from "@effect/vitest"
import { chapterCount, verseCount, type BookId } from "@reformed-bible/core"
import { Effect, Layer } from "effect"
import { HttpClient, HttpClientResponse } from "effect/http"
import { parseUsj } from "../../src/ingest/bsb-usj.ts"
import { DownloadError } from "../../src/ingest/download.ts"
import {
  ingestTranslations,
  reconcileBook,
  reconcileChapter,
  TRANSLATION_SOURCES,
  WEB_DOXOLOGY_REMAP,
} from "../../src/ingest/translations.ts"
import { parseUsfm, type SourceBook } from "../../src/ingest/usfm.ts"
import { sourceCachePath } from "../../src/source-cache.ts"

const fixture = (name: string) =>
  readFileSync(join(import.meta.dirname, "../fixtures/bible-text", name), "utf8")

const verse24 = (verses: ReadonlyArray<unknown>) =>
  verses.find((v) => (v as { verse: number }).verse === 24)

describe("reconciling translations with KJV numbering", () => {
  it.effect("records Romans 16:24 as absent in the BSB while the KJV has its text", () =>
    Effect.gen(function* () {
      const bsb = reconcileChapter(
        "bsb",
        "Rom",
        16,
        yield* parseUsj(fixture("bsb-ROM-excerpt.usj")),
        {
          exact: false,
        },
      )
      const kjv = reconcileChapter("kjv", "Rom", 16, yield* parseUsfm(fixture("kjv-ROM-16.usfm")), {
        exact: true,
      })
      expect(bsb.problems).toEqual([])
      expect(kjv.problems).toEqual([])
      expect(verse24(bsb.chapter.verses)).toEqual({
        verse: 24,
        absent: true,
        note: "Not in this translation.",
      })
      expect(verse24(kjv.chapter.verses)).toEqual({
        verse: 24,
        text: [{ text: "The grace of our Lord Jesus Christ be with you all. Amen." }],
      })
      expect(kjv.chapter.verses).toHaveLength(27)
      expect(bsb.chapter.verses).toHaveLength(27)
    }),
  )

  it.effect("reports a KJV chapter whose verse count differs from the versification table", () =>
    Effect.gen(function* () {
      const kjv = yield* parseUsfm(fixture("kjv-ROM-16.usfm"))
      const short: SourceBook = { ...kjv, verses: kjv.verses.filter((v) => v.verse !== 24) }
      expect(reconcileChapter("kjv", "Rom", 16, short, { exact: true }).problems).toEqual([
        "Rom.16.24 is missing",
      ])
    }),
  )

  it.effect("refuses a verse beyond the KJV verse count instead of keeping it", () =>
    Effect.gen(function* () {
      const bsb = yield* parseUsj(fixture("bsb-ROM-excerpt.usj"))
      const extra: SourceBook = {
        ...bsb,
        verses: [...bsb.verses, { chapter: 16, verse: 28, text: "An extra verse." }],
      }
      expect(reconcileChapter("bsb", "Rom", 16, extra, { exact: false }).problems).toEqual([
        "Rom.16.28 is outside KJV versification",
      ])
    }),
  )

  const wholeBook = (book: BookId, code: string): SourceBook => {
    const verses: Array<SourceBook["verses"][number]> = []
    for (let chapter = 1; chapter <= chapterCount(book); chapter++) {
      for (let verse = 1; verse <= verseCount(book, chapter); verse++) {
        verses.push({ chapter, verse, text: `${book} ${chapter}:${verse}` })
      }
    }
    return { code, verses, headings: [], unplacedHeadings: [] }
  }

  it("moves the WEB doxology only in Romans, leaving other books' verses in place", () => {
    const matthew = reconcileBook("web", "Matt", wholeBook("Matt", "MAT"), {
      exact: false,
      remap: WEB_DOXOLOGY_REMAP,
    })
    expect(matthew.problems).toEqual([])
    expect(matthew.chapters.find((c) => c.chapter === 14)?.verses[23]).toEqual({
      verse: 24,
      text: [{ text: "Matt 14:24" }],
    })
  })

  it("moves the WEB doxology from Romans 14:24-26 to the KJV's Romans 16:25-27", () => {
    const verses: Array<SourceBook["verses"][number]> = []
    for (let chapter = 1; chapter <= chapterCount("Rom"); chapter++) {
      for (let verse = 1; verse <= verseCount("Rom", chapter); verse++) {
        if (chapter === 16 && verse >= 26) continue
        const text = chapter === 16 && verse === 25 ? "" : `Romans ${chapter}:${verse}`
        verses.push({ chapter, verse, text })
      }
    }
    for (const verse of [24, 25, 26]) verses.push({ chapter: 14, verse, text: `WEB 14:${verse}` })
    const web: SourceBook = { code: "ROM", verses, headings: [], unplacedHeadings: [] }

    const unmapped = reconcileBook("web", "Rom", web, { exact: false })
    expect(unmapped.problems).toContain("Rom.14.24 is outside KJV versification")

    const mapped = reconcileBook("web", "Rom", web, { exact: false, remap: WEB_DOXOLOGY_REMAP })
    expect(mapped.problems).toEqual([])
    const romans16 = mapped.chapters.find((c) => c.chapter === 16)
    expect(romans16?.verses.slice(24)).toEqual([
      { verse: 25, text: [{ text: "WEB 14:24" }] },
      { verse: 26, text: [{ text: "WEB 14:25" }] },
      { verse: 27, text: [{ text: "WEB 14:26" }] },
    ])
    expect(mapped.chapters.find((c) => c.chapter === 14)?.verses).toHaveLength(23)
  })
})

describe("translation ingest", () => {
  it.effect("fails when a download does not match its pinned hash", () => {
    const root = mkdtempSync(join(tmpdir(), "translations-"))
    const first = TRANSLATION_SOURCES[0]
    if (first === undefined) throw new Error("no translation sources")
    const cached = sourceCachePath(root, first.url)
    mkdirSync(dirname(cached), { recursive: true })
    writeFileSync(cached, "tampered")
    const offline = Layer.succeed(
      HttpClient.HttpClient,
      HttpClient.make((request) =>
        Effect.succeed(HttpClientResponse.fromWeb(request, new Response(null, { status: 503 }))),
      ),
    )
    return Effect.gen(function* () {
      const error = yield* Effect.flip(ingestTranslations(root))
      expect(error).toBeInstanceOf(DownloadError)
      expect(error instanceof DownloadError && error.reason).toBe("hash-mismatch")
    }).pipe(Effect.provide(offline))
  })
})
