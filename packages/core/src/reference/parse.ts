import { bcv_parser } from "bible-passage-reference-parser"
import * as english from "bible-passage-reference-parser/esm/lang/en.js"
import { Result, Schema } from "effect"
import { isBookId, type BookId } from "./books.ts"
import { compareVerse, Passage, type VerseRef } from "./passage.ts"
import { chapterCount, verseCount } from "./versification.ts"

export const InvalidReasons = ["unrecognized", "out_of_range"] as const

export class InvalidReference extends Schema.TaggedError<
  InvalidReference,
  { readonly brand: unique symbol }
>()("InvalidReference", {
  input: Schema.String,
  reason: Schema.Literals(InvalidReasons),
  suggestion: Schema.optional(Passage),
}) {}

// The free-text parser marks "the whole chapter" or "the whole book" with this placeholder.
// OSIS written by hand means a literal 999, so only free text expands it.
const OPEN_ENDED = 999

let parser: bcv_parser | undefined

const englishParser = (): bcv_parser => {
  if (parser !== undefined) return parser
  parser = new bcv_parser(english)
  parser.set_options({
    versification_system: "kjv",
    passage_existence_strategy: "b",
    osis_compaction_strategy: "bcv",
    book_alone_strategy: "full",
    invalid_passage_strategy: "include",
    invalid_sequence_strategy: "include",
  })
  return parser
}

const OSIS_VERSE = /^([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)$/

interface RawVerse {
  readonly book: BookId
  readonly chapter: number
  readonly verse: number
}

const readVerse = (text: string): RawVerse | undefined => {
  const match = OSIS_VERSE.exec(text)
  if (match === null) return undefined
  const [, book = "", chapter = "", verse = ""] = match
  if (!isBookId(book)) return undefined
  return { book, chapter: Number(chapter), verse: Number(verse) }
}

const lastChapter = (book: BookId, chapter: number): number =>
  chapter === OPEN_ENDED ? chapterCount(book) : chapter

const wholeChapter = (book: BookId, chapter: number): Passage => ({
  start: { book, chapter, verse: 1 },
  end: { book, chapter, verse: verseCount(book, chapter) },
})

const singleVerse = (ref: VerseRef): Passage => ({ start: ref, end: ref })

type Checked = Result.Result<VerseRef, Passage | undefined>

const checkVerse = (raw: RawVerse, openEnded: boolean): Checked => {
  const chapter = openEnded ? lastChapter(raw.book, raw.chapter) : raw.chapter
  const chapters = chapterCount(raw.book)
  if (chapter < 1 || chapter > chapters) {
    return Result.fail(chapters > 0 ? wholeChapter(raw.book, chapters) : undefined)
  }
  const verses = verseCount(raw.book, chapter)
  const verse = openEnded && raw.verse === OPEN_ENDED ? verses : raw.verse
  if (verse < 1 || verse > verses) {
    return Result.fail(singleVerse({ book: raw.book, chapter, verse: verses }))
  }
  return Result.succeed({ book: raw.book, chapter, verse })
}

const outOfRange = (input: string, suggestion: Passage | undefined) =>
  Result.fail(
    new InvalidReference(
      suggestion === undefined
        ? { input, reason: "out_of_range" }
        : { input, reason: "out_of_range", suggestion },
    ),
  )

const unrecognized = (input: string) =>
  Result.fail(new InvalidReference({ input, reason: "unrecognized" }))

const checkPassage = (
  input: string,
  osis: string,
  openEndedEnd: boolean,
): Result.Result<Passage, InvalidReference> => {
  const parts = osis.split("-")
  if (parts.length > 2) return unrecognized(input)
  const [startText = "", endText = startText] = parts
  const start = readVerse(startText)
  const end = readVerse(endText)
  if (start === undefined || end === undefined) return unrecognized(input)
  const checkedStart = checkVerse(start, false)
  if (Result.isFailure(checkedStart)) return outOfRange(input, checkedStart.failure)
  const checkedEnd = checkVerse(end, openEndedEnd)
  if (Result.isFailure(checkedEnd)) return outOfRange(input, checkedEnd.failure)
  if (compareVerse(checkedStart.success, checkedEnd.success) > 0) return unrecognized(input)
  return Result.succeed({ start: checkedStart.success, end: checkedEnd.success })
}

/**
 * Parses free text such as "Rom 8:28-9:3" or "Psalm 23" into canonical passages.
 * Every passage is checked against the KJV verse-count table, never against the parser's own data.
 */
export const parseReference = (
  input: string,
): Result.Result<ReadonlyArray<Passage>, InvalidReference> => {
  const osis = englishParser().parse(input).osis()
  if (osis === "") return unrecognized(input)
  const passages: Array<Passage> = []
  for (const part of osis.split(",")) {
    const checked = checkPassage(input, part, true)
    if (Result.isFailure(checked)) return Result.fail(checked.failure)
    passages.push(checked.success)
  }
  return Result.succeed(passages)
}

/** Checks one OSIS passage such as "Rom.8.28-Rom.8.30". Every number is taken literally. */
export const parseOsis = (osis: string): Result.Result<Passage, InvalidReference> =>
  checkPassage(osis, osis, false)
