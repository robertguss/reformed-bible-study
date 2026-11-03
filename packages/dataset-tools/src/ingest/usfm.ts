import { BOOK_IDS, type BookId } from "@reformed-bible/core"
import { Effect, Schema } from "effect"

export interface SourceVerse {
  readonly chapter: number
  readonly verse: number
  readonly text: string
}

export interface SourceHeading {
  readonly chapter: number
  readonly beforeVerse: number
  readonly text: string
}

export interface SourceBook {
  readonly code: string
  readonly verses: ReadonlyArray<SourceVerse>
  readonly headings: ReadonlyArray<SourceHeading>
  readonly unplacedHeadings: ReadonlyArray<{ readonly chapter: number; readonly text: string }>
}

export class SourceFormatError extends Schema.TaggedError<
  SourceFormatError,
  { readonly brand: unique symbol }
>()("SourceFormatError", {
  source: Schema.String,
  detail: Schema.String,
}) {}

const USFM_CODES = [
  "GEN",
  "EXO",
  "LEV",
  "NUM",
  "DEU",
  "JOS",
  "JDG",
  "RUT",
  "1SA",
  "2SA",
  "1KI",
  "2KI",
  "1CH",
  "2CH",
  "EZR",
  "NEH",
  "EST",
  "JOB",
  "PSA",
  "PRO",
  "ECC",
  "SNG",
  "ISA",
  "JER",
  "LAM",
  "EZK",
  "DAN",
  "HOS",
  "JOL",
  "AMO",
  "OBA",
  "JON",
  "MIC",
  "NAM",
  "HAB",
  "ZEP",
  "HAG",
  "ZEC",
  "MAL",
  "MAT",
  "MRK",
  "LUK",
  "JHN",
  "ACT",
  "ROM",
  "1CO",
  "2CO",
  "GAL",
  "EPH",
  "PHP",
  "COL",
  "1TH",
  "2TH",
  "1TI",
  "2TI",
  "TIT",
  "PHM",
  "HEB",
  "JAS",
  "1PE",
  "2PE",
  "1JN",
  "2JN",
  "3JN",
  "JUD",
  "REV",
] as const

/** USFM book codes of the 66-book canon, mapped to the project's OSIS book ids. */
export const USFM_BOOKS: ReadonlyMap<string, BookId> = new Map(
  USFM_CODES.map((code, index) => [code, BOOK_IDS[index] as BookId]),
)

export type ParagraphRole = "text" | "heading" | "skip"

const TEXT_PARAGRAPHS = [
  "p",
  "m",
  "mi",
  "nb",
  "pc",
  "pi",
  "pi1",
  "pi2",
  "pmo",
  "q",
  "q1",
  "q2",
  "q3",
  "qr",
  "li",
  "li1",
  "li2",
  "b",
]
// The ASV marks the acrostic letters of Psalm 119 as centered poetry (qc) rather than qa.
const HEADING_PARAGRAPHS = ["s", "s1", "s2", "s3", "ms", "ms1", "ms2", "qa", "qc", "d", "sp"]
const SKIPPED_PARAGRAPHS = [
  "id",
  "ide",
  "h",
  "toc1",
  "toc2",
  "toc3",
  "mt",
  "mt1",
  "mt2",
  "mt3",
  "mt4",
  "cl",
  "ip",
  "is",
  "is1",
  "ib",
  "ili",
  "imt",
  "r",
  "mr",
  "rem",
  "sr",
]

export const PARAGRAPH_ROLES: ReadonlyMap<string, ParagraphRole> = new Map([
  ...TEXT_PARAGRAPHS.map((m) => [m, "text"] as const),
  ...HEADING_PARAGRAPHS.map((m) => [m, "heading"] as const),
  ...SKIPPED_PARAGRAPHS.map((m) => [m, "skip"] as const),
])

export const INLINE_MARKERS: ReadonlySet<string> = new Set([
  "w",
  "add",
  "nd",
  "wj",
  "qs",
  "tl",
  "k",
  "bk",
  "sc",
  "it",
  "bd",
  "wh",
])

const NOTE_PATTERN = /\\(f|fe|x)\s[\s\S]*?\\\1\*/g
const ATTRIBUTE_PATTERN = /\|[^\\]*(?=\\\+?[a-z0-9]+\*)/g
const MARKER_PATTERN = /\\(\+?)([a-z][a-z0-9]*)(\*|[ \t]|\r?\n)?/g

export const normalizeSpace = (text: string): string => text.replace(/\s+/g, " ").trim()

export class BookBuilder {
  private chapter = 0
  private verse: { chapter: number; verse: number; parts: Array<string> } | undefined
  private role: ParagraphRole = "skip"
  private heading: Array<string> = []
  private pending: Array<string> = []
  private readonly verses: Array<{ chapter: number; verse: number; parts: Array<string> }> = []
  private readonly headings: Array<SourceHeading> = []
  private readonly unplaced: Array<{ chapter: number; text: string }> = []

  private readonly code: string
  private readonly source: string

  constructor(code: string, source: string) {
    this.code = code
    this.source = source
  }

  private endParagraph(): void {
    if (this.role === "heading") {
      const text = normalizeSpace(this.heading.join(""))
      if (text !== "") this.pending.push(text)
    }
    this.heading = []
  }

  private flushUnplaced(): void {
    for (const text of this.pending) this.unplaced.push({ chapter: this.chapter, text })
    this.pending = []
  }

  startChapter(chapter: number): void {
    this.endParagraph()
    this.chapter = chapter
    this.verse = undefined
    this.role = "skip"
  }

  startParagraph(role: ParagraphRole): void {
    this.endParagraph()
    this.role = role
    if (role === "text") this.verse?.parts.push(" ")
  }

  startVerse(verse: number): void {
    this.endParagraph()
    this.role = "text"
    for (const text of this.pending) {
      this.headings.push({ chapter: this.chapter, beforeVerse: verse, text })
    }
    this.pending = []
    this.verse = { chapter: this.chapter, verse, parts: [] }
    this.verses.push(this.verse)
  }

  text(text: string): Effect.Effect<void, SourceFormatError> {
    if (this.role === "heading") this.heading.push(text)
    else if (this.role === "text") {
      if (this.verse !== undefined) this.verse.parts.push(text)
      else if (text.trim() !== "") {
        return Effect.fail(
          new SourceFormatError({
            source: this.source,
            detail: `${this.code} ${this.chapter}: text before the first verse: ${text.trim().slice(0, 60)}`,
          }),
        )
      }
    }
    return Effect.void
  }

  finish(): SourceBook {
    this.endParagraph()
    this.flushUnplaced()
    return {
      code: this.code,
      verses: this.verses.map(({ chapter, verse, parts }) => ({
        chapter,
        verse,
        text: normalizeSpace(parts.join("")),
      })),
      headings: this.headings,
      unplacedHeadings: this.unplaced,
    }
  }
}

const formatError = (source: string, detail: string) =>
  Effect.fail(new SourceFormatError({ source, detail }))

const leadingNumber = (text: string): { number: number; rest: string } | undefined => {
  const match = /^\s*(\d+)\s?/.exec(text)
  return match === null
    ? undefined
    : { number: Number(match[1]), rest: text.slice(match[0].length) }
}

export const parseUsfm = (usfm: string): Effect.Effect<SourceBook, SourceFormatError> =>
  Effect.gen(function* () {
    const idMatch = /\\id\s+([A-Z0-9]{3})/.exec(usfm)
    if (idMatch === null) return yield* formatError("usfm", "no \\id line")
    const code = idMatch[1] as string
    const builder = new BookBuilder(code, "usfm")
    const text = usfm.replace(NOTE_PATTERN, "").replace(ATTRIBUTE_PATTERN, "")

    let cursor = 0
    let awaitingNumber: "c" | "v" | undefined
    const emit = (segment: string) =>
      Effect.gen(function* () {
        let rest = segment
        if (awaitingNumber !== undefined) {
          const parsed = leadingNumber(rest)
          if (parsed === undefined) {
            return yield* formatError("usfm", `${code}: \\${awaitingNumber} without a number`)
          }
          if (awaitingNumber === "c") {
            builder.startChapter(parsed.number)
            rest = ""
          } else {
            builder.startVerse(parsed.number)
            rest = parsed.rest
          }
          awaitingNumber = undefined
        }
        if (rest !== "") yield* builder.text(rest)
      })

    for (const match of text.matchAll(MARKER_PATTERN)) {
      yield* emit(text.slice(cursor, match.index))
      cursor = match.index + match[0].length
      const [, nested = "", marker = "", delimiter = ""] = match
      if (delimiter === "*" || INLINE_MARKERS.has(marker)) continue
      if (nested !== "") return yield* formatError("usfm", `${code}: unexpected \\+${marker}`)
      if (marker === "c" || marker === "v") {
        awaitingNumber = marker
        continue
      }
      const role = PARAGRAPH_ROLES.get(marker)
      if (role === undefined)
        return yield* formatError("usfm", `${code}: unknown marker \\${marker}`)
      builder.startParagraph(role)
    }
    yield* emit(text.slice(cursor))
    return builder.finish()
  })
