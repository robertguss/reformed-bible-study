import { Schema } from "effect"
import { BOOK_IDS, bookByOsis } from "./books.ts"

const PositiveInt = Schema.Int.check(Schema.isGreaterThanOrEqualTo(1))

export const VerseRef = Schema.Struct({
  book: Schema.Literals(BOOK_IDS),
  chapter: PositiveInt,
  verse: PositiveInt,
})
export type VerseRef = typeof VerseRef.Type

export const Passage = Schema.Struct({
  start: VerseRef,
  end: VerseRef,
})
export type Passage = typeof Passage.Type

const ordinalOf = (ref: VerseRef): number => bookByOsis(ref.book)?.ordinal ?? 0

export const compareVerse = (a: VerseRef, b: VerseRef): number =>
  ordinalOf(a) - ordinalOf(b) || a.chapter - b.chapter || a.verse - b.verse
