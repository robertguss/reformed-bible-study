import { BOOK_IDS, BOOK_SLUGS, type BookId, bookBySlug } from "@reformed-bible/core"
import { Schema, SchemaGetter } from "effect"

const KnownSlug = Schema.String.check(
  Schema.makeFilter((slug: string) =>
    bookBySlug(slug) === undefined ? "unknown book" : undefined,
  ),
)

/**
 * A book as it appears in a passage URL. The slug table is frozen in core, so a URL that works
 * today keeps working; an unknown slug fails to decode and the URL falls through to not found.
 */
export const BookSlug = KnownSlug.pipe(
  Schema.decodeTo(Schema.Literals(BOOK_IDS), {
    // The check above admits only known slugs, so the lookup always finds a book.
    decode: SchemaGetter.transform((slug: string): BookId => bookBySlug(slug)?.id ?? "Gen"),
    encode: SchemaGetter.transform((book: BookId) => BOOK_SLUGS[book]),
  }),
)
