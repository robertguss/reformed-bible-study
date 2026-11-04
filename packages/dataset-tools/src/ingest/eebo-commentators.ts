import {
  CommentaryBook,
  compareVerse,
  parseOsis,
  type BookId,
  type CommentarySection,
} from "@reformed-bible/core"
import { Effect, Schema } from "effect"
import { writeNormalized } from "../normalized.ts"
import { download, type SourceSpec } from "./download.ts"
import { ANNOTATION_SETS } from "./eebo-annotation-sets.ts"
import { ENGLISH_EXPOSITIONS } from "./eebo-english-expositions.ts"
import { SCOTTISH_EXPOSITIONS } from "./eebo-scottish-expositions.ts"
import { readTeiCommentary, type TeiCommentaryLayout } from "./tei-commentary.ts"

/** One pinned EEBO-TCP volume, the books it holds in order, and how its TEI is laid out. */
export interface EeboWork {
  readonly source: SourceSpec
  readonly books: ReadonlyArray<BookId>
  readonly layout: TeiCommentaryLayout
}

/** A commentator ships as one resource, whose works are read in the order given. */
export interface EeboCommentator {
  readonly resourceId: string
  readonly works: ReadonlyArray<EeboWork>
}

/**
 * Every commentator the shared ingest reads. Each group of commentators is declared in its own
 * module, and its array is spread in here on its own line.
 */
export const EEBO_COMMENTATORS: ReadonlyArray<EeboCommentator> = [
  // One `...GROUP,` line per group module.
  ...ANNOTATION_SETS,
  ...SCOTTISH_EXPOSITIONS,
  ...ENGLISH_EXPOSITIONS,
]

/** A later volume holds verses of a book that an earlier volume already holds. */
export class VolumeOverlapError extends Schema.TaggedError<
  VolumeOverlapError,
  { readonly brand: unique symbol }
>()("VolumeOverlapError", {
  resourceId: Schema.String,
  book: Schema.String,
  chapter: Schema.Int,
}) {}

/**
 * Ingests one commentator: reads each work in order, appends each book's sections in volume order,
 * and writes one normalized commentary file per book once every volume is read. A volume whose
 * first section on a book does not begin after the last section an earlier volume holds fails.
 */
export const ingestEeboCommentator = (repoRoot: string, commentator: EeboCommentator) =>
  Effect.gen(function* () {
    const { resourceId } = commentator
    const merged = new Map<BookId, Array<CommentarySection>>()
    for (const work of commentator.works) {
      const bytes = yield* download(repoRoot, work.source)
      const read = yield* readTeiCommentary(
        resourceId,
        new TextDecoder("utf-8").decode(bytes),
        work.books,
        work.layout,
      )
      for (const { book, sections } of read) {
        const earlier = merged.get(book) ?? []
        const [last, next] = [earlier.at(-1), sections[0]]
        if (last !== undefined && next !== undefined) {
          const { end } = yield* Effect.fromResult(parseOsis(last.ref))
          const { start } = yield* Effect.fromResult(parseOsis(next.ref))
          if (compareVerse(start, end) <= 0)
            return yield* new VolumeOverlapError({ resourceId, book, chapter: start.chapter })
        }
        merged.set(book, [...earlier, ...sections])
      }
    }
    let sections = 0
    for (const [book, bookSections] of merged) {
      yield* writeNormalized(repoRoot, resourceId, `${book}.json`, CommentaryBook, {
        resourceId,
        book,
        sections: bookSections,
      })
      sections += bookSections.length
    }
    return { books: merged.size, sections }
  })
