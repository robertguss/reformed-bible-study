import {
  books,
  chapterCount,
  CrossReferenceChapter,
  TranslationChapter,
  verseCount,
  type BookId,
  type TranslationVerse,
} from "@reformed-bible/core"
import { Effect, Schema } from "effect"
import { writeNormalized } from "../normalized.ts"
import { parseUsj } from "./bsb-usj.ts"
import { download, unzipSafe, type SourceSpec } from "./download.ts"
import { OPENBIBLE_RESOURCE_ID, parseCrossReferences } from "./openbible.ts"
import { parseUsfm, SourceFormatError, USFM_BOOKS, type SourceBook } from "./usfm.ts"

export const ABSENT_NOTE = "Not in this translation."

export interface TranslationSource extends SourceSpec {
  readonly resourceId: string
  readonly format: "usj" | "usfm"
  readonly exact: boolean
  readonly remap?: Readonly<Record<string, string>>
}

/** The World English Bible prints the closing doxology after Romans 14:23; the KJV numbers it Romans 16:25-27. */
export const WEB_DOXOLOGY_REMAP: Readonly<Record<string, string>> = {
  "Rom.14.24": "Rom.16.25",
  "Rom.14.25": "Rom.16.26",
  "Rom.14.26": "Rom.16.27",
}

export const TRANSLATION_SOURCES: ReadonlyArray<TranslationSource> = [
  {
    resourceId: "bsb",
    url: "https://bereanbible.com/bsb_usj.zip",
    sha256: "062785c0621e0976e7bf3d5a0c32d3d38c5e9d8f71215217c5d33be03bdfaede",
    format: "usj",
    exact: false,
  },
  {
    resourceId: "web",
    url: "https://ebible.org/Scriptures/engwebp_usfm.zip",
    sha256: "a93df5571009fed56f77e3ac1d3ce71c9a3a3df1486f7570cc7a8f823192fdba",
    format: "usfm",
    exact: false,
    remap: WEB_DOXOLOGY_REMAP,
  },
  {
    resourceId: "kjv",
    url: "https://ebible.org/Scriptures/eng-kjv2006_usfm.zip",
    sha256: "ce1f526c64c2376f407308c2c23cb2d2fb58efaf5296327d2d8e408c3700650d",
    format: "usfm",
    exact: true,
  },
  {
    resourceId: "asv",
    url: "https://ebible.org/Scriptures/eng-asv_usfm.zip",
    sha256: "00b7b6c76cb1eb67b22ca51bd5ac13c2df526c13e1c38e78b862a7a2367f7071",
    format: "usfm",
    exact: false,
  },
]

export const CROSS_REFERENCE_SOURCE: SourceSpec = {
  url: "https://a.openbible.info/data/cross-references.zip",
  sha256: "24f07bcd61280f9dc0c5a451151fc9c9d0d2e45fe0cf3c903b5db4ca6b878878",
}

export class VersificationMismatch extends Schema.TaggedError<
  VersificationMismatch,
  { readonly brand: unique symbol }
>()("VersificationMismatch", {
  resourceId: Schema.String,
  problems: Schema.Array(Schema.String),
}) {}

export interface ReconcileOptions {
  readonly exact: boolean
  readonly remap?: Readonly<Record<string, string>>
}

export const reconcileChapter = (
  resourceId: string,
  book: BookId,
  chapter: number,
  source: SourceBook,
  options: ReconcileOptions,
): { readonly chapter: TranslationChapter; readonly problems: ReadonlyArray<string> } => {
  const expected = verseCount(book, chapter)
  const problems: Array<string> = []
  const texts = new Map<number, string>()
  for (const { verse, text } of source.verses.filter((v) => v.chapter === chapter)) {
    const key = `${book}.${chapter}.${verse}`
    const previous = texts.get(verse) ?? ""
    if (verse > expected) problems.push(`${key} is outside KJV versification`)
    else if (previous !== "" && text !== "") problems.push(`${key} appears twice`)
    else if (previous === "") texts.set(verse, text)
  }
  const verses: Array<TranslationVerse> = []
  for (let verse = 1; verse <= expected; verse++) {
    const text = texts.get(verse) ?? ""
    if (text !== "") verses.push({ verse, text: [{ text }] })
    else if (options.exact) problems.push(`${book}.${chapter}.${verse} is missing`)
    else verses.push({ verse, absent: true, note: ABSENT_NOTE })
  }
  const headings = source.headings
    .filter((h) => h.chapter === chapter)
    .map(({ beforeVerse, text }) => ({ beforeVerse, text }))
  for (const heading of headings) {
    if (heading.beforeVerse > expected) {
      problems.push(
        `heading before ${book}.${chapter}.${heading.beforeVerse} is outside KJV versification`,
      )
    }
  }
  return { chapter: { resourceId, book, chapter, headings, verses }, problems }
}

const remapKey = (
  remap: Readonly<Record<string, string>> | undefined,
  book: BookId,
  chapter: number,
  verse: number,
): { chapter: number; verse: number } => {
  const target = remap?.[`${book}.${chapter}.${verse}`]
  if (target === undefined) return { chapter, verse }
  const [, mappedChapter = "", mappedVerse = ""] = target.split(".")
  return { chapter: Number(mappedChapter), verse: Number(mappedVerse) }
}

export const reconcileBook = (
  resourceId: string,
  book: BookId,
  source: SourceBook,
  options: ReconcileOptions,
): {
  readonly chapters: ReadonlyArray<TranslationChapter>
  readonly problems: ReadonlyArray<string>
} => {
  const mapped: SourceBook = {
    ...source,
    verses: source.verses.map((v) => ({
      ...v,
      ...remapKey(options.remap, book, v.chapter, v.verse),
    })),
    headings: source.headings.map((h) => {
      const { chapter, verse } = remapKey(options.remap, book, h.chapter, h.beforeVerse)
      return { ...h, chapter, beforeVerse: verse }
    }),
  }
  const problems: Array<string> = []
  const present = new Set(mapped.verses.map((v) => v.chapter))
  for (const chapter of present) {
    if (chapter < 1 || chapter > chapterCount(book)) {
      problems.push(`${book}.${chapter} is outside KJV versification`)
    }
  }
  const chapters: Array<TranslationChapter> = []
  for (let chapter = 1; chapter <= chapterCount(book); chapter++) {
    if (!present.has(chapter)) {
      problems.push(`${book}.${chapter} is missing`)
      continue
    }
    const reconciled = reconcileChapter(resourceId, book, chapter, mapped, options)
    problems.push(...reconciled.problems)
    chapters.push(reconciled.chapter)
  }
  return { chapters, problems }
}

const decoder = new TextDecoder("utf-8", { fatal: true })

const decode = (name: string, bytes: Uint8Array) =>
  Effect.try({
    try: () => decoder.decode(bytes),
    catch: () => new SourceFormatError({ source: name, detail: "not UTF-8" }),
  })

export interface TranslationSummary {
  readonly resourceId: string
  readonly chapters: number
  readonly verses: number
  readonly absent: ReadonlyArray<string>
  readonly headings: number
  readonly unplacedHeadings: number
}

export const ingestTranslation = (repoRoot: string, source: TranslationSource) =>
  Effect.gen(function* () {
    const archive = yield* download(repoRoot, source)
    const entries = yield* unzipSafe(archive)
    const extension = source.format === "usj" ? ".usj" : ".usfm"
    const parsed = new Map<BookId, SourceBook>()
    const problems: Array<string> = []
    for (const [name, bytes] of Object.entries(entries)) {
      if (!name.endsWith(extension)) continue
      const text = yield* decode(name, bytes)
      const book = source.format === "usj" ? yield* parseUsj(text) : yield* parseUsfm(text)
      const bookId = USFM_BOOKS.get(book.code)
      if (bookId === undefined) continue
      if (parsed.has(bookId)) problems.push(`${bookId} appears in two files`)
      parsed.set(bookId, book)
    }

    const chapters: Array<TranslationChapter> = []
    let unplacedHeadings = 0
    for (const { id } of books) {
      const book = parsed.get(id)
      if (book === undefined) {
        problems.push(`${id} is missing`)
        continue
      }
      const reconciled = reconcileBook(source.resourceId, id, book, source)
      problems.push(...reconciled.problems)
      chapters.push(...reconciled.chapters)
      unplacedHeadings += book.unplacedHeadings.length
    }
    if (problems.length > 0) {
      return yield* new VersificationMismatch({ resourceId: source.resourceId, problems })
    }

    for (const chapter of chapters) {
      yield* writeNormalized(
        repoRoot,
        source.resourceId,
        `${chapter.book}.${chapter.chapter}.json`,
        TranslationChapter,
        chapter,
      )
    }
    const summary: TranslationSummary = {
      resourceId: source.resourceId,
      chapters: chapters.length,
      verses: chapters.reduce((sum, c) => sum + c.verses.filter((v) => "text" in v).length, 0),
      absent: chapters.flatMap((c) =>
        c.verses.filter((v) => "absent" in v).map((v) => `${c.book}.${c.chapter}.${v.verse}`),
      ),
      headings: chapters.reduce((sum, c) => sum + c.headings.length, 0),
      unplacedHeadings,
    }
    return summary
  })

export const ingestTranslations = (repoRoot: string) =>
  Effect.forEach(TRANSLATION_SOURCES, (source) => ingestTranslation(repoRoot, source))

/** Downloads the openbible.info cross-references and writes one normalized file per canonical chapter. */
export const ingestCrossReferences = (repoRoot: string) =>
  Effect.gen(function* () {
    const archive = yield* download(repoRoot, CROSS_REFERENCE_SOURCE)
    const entries = yield* unzipSafe(archive)
    const bytes = entries["cross_references.txt"]
    if (bytes === undefined) {
      return yield* new SourceFormatError({
        source: CROSS_REFERENCE_SOURCE.url,
        detail: "no cross_references.txt",
      })
    }
    const chapters = yield* parseCrossReferences(yield* decode("cross_references.txt", bytes))
    for (const chapter of chapters) {
      yield* writeNormalized(
        repoRoot,
        OPENBIBLE_RESOURCE_ID,
        `${chapter.book}.${chapter.chapter}.json`,
        CrossReferenceChapter,
        chapter,
      )
    }
    return {
      resourceId: OPENBIBLE_RESOURCE_ID,
      chapters: chapters.length,
      verses: chapters.reduce((sum, c) => sum + c.verses.length, 0),
      targets: chapters.reduce(
        (sum, c) => sum + c.verses.reduce((n, v) => n + v.targets.length, 0),
        0,
      ),
    }
  })
