import { bookByOsis } from "./books.ts"
import type { Passage, VerseRef } from "./passage.ts"
import { verseCount } from "./versification.ts"

const verseOsis = (ref: VerseRef): string => `${ref.book}.${ref.chapter}.${ref.verse}`

const sameVerse = (a: VerseRef, b: VerseRef): boolean =>
  a.book === b.book && a.chapter === b.chapter && a.verse === b.verse

/** OSIS form of a passage: `Rom.8.28` for one verse, `Rom.8.28-Rom.9.3` for a range. */
export const toOsis = (passage: Passage): string =>
  sameVerse(passage.start, passage.end)
    ? verseOsis(passage.start)
    : `${verseOsis(passage.start)}-${verseOsis(passage.end)}`

const isWholeChapter = ({ start, end }: Passage): boolean =>
  start.book === end.book &&
  start.chapter === end.chapter &&
  start.verse === 1 &&
  end.verse === verseCount(end.book, end.chapter)

/** Reader-facing form of a passage, such as "Romans 8:28-30" or "Psalm 23". */
export const formatPassage = (passage: Passage): string => {
  const { start, end } = passage
  const startBook = bookByOsis(start.book)
  const head = startBook?.chapterName ?? start.book
  if (isWholeChapter(passage)) return `${head} ${start.chapter}`
  const first = `${head} ${start.chapter}:${start.verse}`
  if (sameVerse(start, end)) return first
  if (start.book !== end.book) {
    const endBook = bookByOsis(end.book)
    return `${first}-${endBook?.chapterName ?? end.book} ${end.chapter}:${end.verse}`
  }
  if (start.chapter !== end.chapter) return `${first}-${end.chapter}:${end.verse}`
  return `${first}-${end.verse}`
}
