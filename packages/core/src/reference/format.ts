import { bookByOsis, type BookId } from "./books.ts"
import type { Passage, VerseRef } from "./passage.ts"
import { verseCount } from "./versification.ts"

const verseOsis = (ref: VerseRef): string => `${ref.book}.${ref.chapter}.${ref.verse}`

const sameVerse = (a: VerseRef, b: VerseRef): boolean =>
  a.book === b.book && a.chapter === b.chapter && a.verse === b.verse

export const toOsis = (passage: Passage): string =>
  sameVerse(passage.start, passage.end)
    ? verseOsis(passage.start)
    : `${verseOsis(passage.start)}-${verseOsis(passage.end)}`

const isWholeChapter = ({ start, end }: Passage): boolean =>
  start.book === end.book &&
  start.chapter === end.chapter &&
  start.verse === 1 &&
  end.verse === verseCount(end.book, end.chapter)

const chapterHead = (book: BookId): string => bookByOsis(book)?.chapterName ?? book

export const formatPassage = (passage: Passage): string => {
  const { start, end } = passage
  const head = chapterHead(start.book)
  if (isWholeChapter(passage)) return `${head} ${start.chapter}`
  const first = `${head} ${start.chapter}:${start.verse}`
  if (sameVerse(start, end)) return first
  if (start.book !== end.book) {
    return `${first}-${chapterHead(end.book)} ${end.chapter}:${end.verse}`
  }
  if (start.chapter !== end.chapter) return `${first}-${end.chapter}:${end.verse}`
  return `${first}-${end.verse}`
}
