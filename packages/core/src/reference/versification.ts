import kjv from "../../../../dataset/versification/kjv.json" with { type: "json" }
import type { BookId } from "./books.ts"

const chapters: Readonly<Record<string, ReadonlyArray<number>>> = kjv.books

/** Number of chapters in a book under the canonical KJV versification. */
export const chapterCount = (book: BookId): number => chapters[book]?.length ?? 0

/** Number of verses in a chapter under the canonical KJV versification, or 0 when the chapter does not exist. */
export const verseCount = (book: BookId, chapter: number): number =>
  chapters[book]?.[chapter - 1] ?? 0
