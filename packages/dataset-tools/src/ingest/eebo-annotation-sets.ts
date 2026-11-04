import { BOOK_IDS, type BookId } from "@reformed-bible/core"
import type { EeboCommentator } from "./eebo-commentators.ts"
import type { SourceSpec } from "./download.ts"

/** The raw TEI file of an EEBO-TCP text, pinned to a repository commit and its SHA-256. */
const tcp = (id: string, commit: string, sha256: string, megabytes: number): SourceSpec => ({
  url: `https://raw.githubusercontent.com/textcreationpartnership/${id}/${commit}/${id}.xml`,
  sha256,
  maxBytes: megabytes * 1024 * 1024,
})

const books = (first: BookId, last: BookId): ReadonlyArray<BookId> =>
  BOOK_IDS.slice(BOOK_IDS.indexOf(first), BOOK_IDS.indexOf(last) + 1)

/**
 * The annotation sets open each verse's notes with its label at the start of a paragraph or
 * quotation, printed as `V. 4.`, `Vers. 12.`, `VER. 3.`, `Verse 1.` or `Vers, 19.`.
 */
const NOTE_LABEL = /^V(?:[ei]rs?e?)?\s*[.,:▪]*\s*(\d+)/i

/** The annotations "by the joynt-labour of certain learned divines" (1645): the whole Bible. */
export const WESTMINSTER_ANNOTATIONS: EeboCommentator = {
  resourceId: "westminster-annotations",
  works: [
    {
      source: tcp(
        "A36467",
        "0e119c5f2e72f8865b464dc2b54c3f05b14a93dc",
        "d1c1b664fa4e9098a8ca487053ea6255125133b2902830102e8ec6a7ef3d6836",
        16,
      ),
      books: BOOK_IDS,
      // The Gospels and Epistles are `gospel` and `epistle` divisions. The arguments of Joel to
      // Revelation, printed together between Malachi and Matthew, are `epitome` divisions and hold
      // no book. The two pages of image 154 are keyed in reverse, so the notes on 1 Kings 8:12 to
      // 8:47 sit inside chapter 9, after its verse 15; they go back to the sentence they continue.
      layout: {
        bookDivisions: new Set(["book", "gospel", "epistle"]),
        chapterDivisions: new Set(["chapter", "Psalm"]),
        openingLabel: NOTE_LABEL,
        misplaced: [
          {
            from: "Solomon discerning this to be a sign",
            through: "Call to minde their sins.",
            after: "Upon that manifestation of Gods glory,",
          },
        ],
      },
    },
  ],
}

/** Diodati's Pious Annotations (1643): the whole Bible, with the Apocrypha left out. */
export const DIODATI_ANNOTATIONS: EeboCommentator = {
  resourceId: "diodati-annotations",
  works: [
    {
      source: tcp(
        "A36033",
        "72c52c7061499b6548e3acd004bc90f7c6778b5f",
        "20f186b5b505b004fbb462e43e30bc6c7a700a306e59651612243cc99eeaee5f",
        8,
      ),
      books: BOOK_IDS,
      // The Apocrypha are `book` divisions inside one `commentary_on_books` division, so they are
      // never read as a listed book. Genesis to 2 Samuel, Ecclesiastes and the Song print their
      // chapters inside an `annotations` division after the argument, and many chapter headings
      // name the verse of their first note, as `CHAP. XXII. VER. I.` does. First Chronicles resumes
      // chapter 4 at verse 24 under a heading of its own.
      layout: {
        bookDivisions: new Set(["commentary_on_book"]),
        chapterDivisions: new Set(["chapter", "Psalm"]),
        chapterGroups: new Set(["annotations"]),
        chaptersResume: true,
        openingLabel: NOTE_LABEL,
        headingVerse: /\bV[EI]RS?E?\s*[.:]?\s*(\d+|[IVXLC]+)\b/i,
      },
    },
  ],
}

/** Arthur Jackson's annotations in four volumes (1643 to 1682): Genesis to the Song, and Isaiah. */
export const JACKSON_ANNOTATIONS: EeboCommentator = {
  resourceId: "jackson-annotations",
  works: [
    {
      // The Pentateuch quotes each lemma as its own quotation, with the verse in a `bibl`.
      source: tcp(
        "A46823",
        "d0392a158bb33a6d9e3080d0cfec734b04b9c20a",
        "d80f83eaeb51d36410a35d9515d1a3127c815e720097fbb3e0aef28bd1c16233",
        4,
      ),
      books: books("Gen", "Deut"),
      layout: {
        bookDivisions: new Set(["book"]),
        chapterDivisions: new Set(["chapter"]),
        openingLabel: NOTE_LABEL,
      },
    },
    {
      source: tcp(
        "A46811",
        "135e58c5bdf9c0146ea5073c2557c7e9d86b2ad5",
        "432554456345bf63bdc9c02ea5b6ac310ef0b4e531fe8253e670370ae0b29486",
        4,
      ),
      books: books("Josh", "Esth"),
      layout: {
        bookDivisions: new Set(["annotations"]),
        chapterDivisions: new Set(["chapter"]),
        openingLabel: NOTE_LABEL,
      },
    },
    {
      source: tcp(
        "A46807",
        "ae1d85b031c88588c37ff7705a4d027b5f64e116",
        "4822a90b8bec76a04f9b0d4499a2ae10c407ad76568a86137a9190bc91360cf2",
        8,
      ),
      books: books("Job", "Song"),
      layout: {
        bookDivisions: new Set(["book"]),
        chapterDivisions: new Set(["chapter", "Psalm"]),
        openingLabel: NOTE_LABEL,
      },
    },
    {
      source: tcp(
        "A46816",
        "5a3c5bf86b3027954e3e1d49c7f914099b115fda",
        "8845e62bf05502875bfbd4766ca05e48127558902a2473df65b41efaf0a12ff9",
        4,
      ),
      books: ["Isa"],
      layout: {
        bookDivisions: new Set(["text"]),
        chapterDivisions: new Set(["chapter"]),
        openingLabel: NOTE_LABEL,
      },
    },
  ],
}

/** The three whole-Bible and Old Testament annotation sets. */
export const ANNOTATION_SETS: ReadonlyArray<EeboCommentator> = [
  WESTMINSTER_ANNOTATIONS,
  DIODATI_ANNOTATIONS,
  JACKSON_ANNOTATIONS,
]
