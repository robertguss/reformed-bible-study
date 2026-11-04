import { BOOK_IDS, CommentaryBook, type BookId } from "@reformed-bible/core"
import { Effect } from "effect"
import { writeNormalized } from "../normalized.ts"
import { download, type SourceSpec } from "./download.ts"
import { readTeiCommentary, type TeiCommentaryLayout } from "./tei-commentary.ts"

export const POOLE_RESOURCE_ID = "poole-annotations"

const FIRST_OF_VOLUME_TWO = BOOK_IDS.indexOf("Jer")

/** The two EEBO-TCP volumes, pinned to the commit that added each text: Genesis to Isaiah, then Jeremiah to Revelation. */
export const POOLE_VOLUMES: ReadonlyArray<{
  readonly source: SourceSpec
  readonly books: ReadonlyArray<BookId>
}> = [
  {
    source: {
      url: "https://raw.githubusercontent.com/textcreationpartnership/A55363/41a5d66565a933814dd6a5486595f6a2ae45e29f/A55363.xml",
      sha256: "fc494999def0b470be3e1d826d1bb310fe2e627da7d9946067485ddc92fbe6b5",
      maxBytes: 32 * 1024 * 1024,
    },
    books: BOOK_IDS.slice(0, FIRST_OF_VOLUME_TWO),
  },
  {
    source: {
      url: "https://raw.githubusercontent.com/textcreationpartnership/A55368/eadd8a9fdb03365d0d54aa36287b7defb034cc8c/A55368.xml",
      sha256: "88e15a73286b932440edfa76936b374ba63360ffea2d62d0d3ba514c5cf9a6e6",
      maxBytes: 32 * 1024 * 1024,
    },
    books: BOOK_IDS.slice(FIRST_OF_VOLUME_TWO),
  },
]

/** The first volume calls its books `book` divisions and the second `biblical_commentary`; the Psalms are `Psalm` divisions. */
export const POOLE_LAYOUT: TeiCommentaryLayout = {
  bookDivisions: new Set(["book", "biblical_commentary"]),
  chapterDivisions: new Set(["chapter", "Psalm"]),
}

/** Ingests Poole's Annotations from both pinned volumes into one normalized commentary file per book. */
export const ingestPoole = (repoRoot: string) =>
  Effect.gen(function* () {
    let books = 0
    let sections = 0
    for (const volume of POOLE_VOLUMES) {
      const bytes = yield* download(repoRoot, volume.source)
      const read = yield* readTeiCommentary(
        POOLE_RESOURCE_ID,
        new TextDecoder("utf-8").decode(bytes),
        volume.books,
        POOLE_LAYOUT,
      )
      for (const book of read) {
        yield* writeNormalized(
          repoRoot,
          POOLE_RESOURCE_ID,
          `${book.book}.json`,
          CommentaryBook,
          book,
        )
        books++
        sections += book.sections.length
      }
    }
    return { books, sections }
  })
