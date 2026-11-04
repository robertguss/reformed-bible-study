import type { BookId } from "@reformed-bible/core"
import type { EeboCommentator } from "./eebo-commentators.ts"
import type { SourceSpec } from "./download.ts"
import type { TeiCommentaryLayout } from "./tei-commentary.ts"

/** The raw TEI file of an EEBO-TCP text, pinned to a repository commit and its SHA-256. */
const tcp = (id: string, commit: string, sha256: string, megabytes: number): SourceSpec => ({
  url: `https://raw.githubusercontent.com/textcreationpartnership/${id}/${commit}/${id}.xml`,
  sha256,
  maxBytes: megabytes * 1024 * 1024,
})

const HOSEA: ReadonlyArray<BookId> = ["Hos"]

/** Each chapter of the later volumes holds one `verse` division per verse, numbered by its `n`. */
const BURROUGHS_VERSES = {
  bookDivisions: new Set(["exposition"]),
  chapterDivisions: new Set(["chapter"]),
  verseDivisions: new Set(["verse"]),
} satisfies TeiCommentaryLayout

/**
 * Burroughs's lectures on Hosea in four volumes (1650 to 1652), published after his death by
 * Thomas Goodwin and others. His work ends at Hosea 13:11.
 */
export const BURROUGHS: EeboCommentator = {
  resourceId: "burroughs",
  works: [
    {
      // Chapters 1 to 3, one `lecture` division per lecture, each quoting its passage under a label
      // such as `HOSEA 2. 6. 7.`, `CHAP. 2. VER 1. 2.` or `HOSEA 1. the middle of the 11. verse.`
      // The lectures' `n` numbers the lecture, not the verse. A label that names its verse only in
      // words, such as `the middle of the second verse`, is not read, so that lecture continues the
      // section before it.
      source: tcp(
        "A30572",
        "9d79dda40ac3ba000f216a39a4f9fd75e3ababcd",
        "7285f62cc15cc983040f6583cbf56be492d43f3101965c2552b79cdaa9dfa54a",
        4,
      ),
      books: HOSEA,
      layout: {
        chapterDivisions: new Set(["chapter"]),
        verseDivisions: new Set(["lecture"]),
        verseLabel:
          /^(?:CHAP|HOSEA)\.?\s*\d+\.\s*(?:VERS?\.?\s*|the middle (?:part )?of the\s*)?(\d+)/i,
      },
    },
    {
      // Chapters 4 to 7, printed as two expositions, of chapters 4 and 5 and of chapters 6 and 7.
      source: tcp(
        "A77979",
        "c44e912f225c0e3227af6cdd7c08047e2de01c5f",
        "5fcec105916403ed27741ab4adc266769a8c99b0ac0cfabd8a8d9a659a588f2f",
        4,
      ),
      books: ["Hos", "Hos"],
      layout: { ...BURROUGHS_VERSES, bookDivisions: new Set(["biblical_commentary"]) },
    },
    {
      // Chapters 8 to 10. The division of chapter 8 carries no number.
      source: tcp(
        "A30574",
        "b3b4775028b2fbd99109ed7c9e5650282c28a608",
        "2e2b8bddf2c870ef076ec3337e48f9cbaf7ae03bf894ace41de367142898f590",
        2,
      ),
      books: HOSEA,
      layout: { ...BURROUGHS_VERSES, firstChapter: 8 },
    },
    {
      // Chapters 11 to 13, to the end of his lectures at 13:11.
      source: tcp(
        "A30575",
        "2c63020e5c99f0efbb636473997cd0a32aa6645e",
        "1f9b4f69197fe7a92b37819d67ed737ef98195631e9a1f91ab109405b3d53052",
        2,
      ),
      books: HOSEA,
      layout: { ...BURROUGHS_VERSES, lastVerse: { book: "Hos", chapter: 13, verse: 11 } },
    },
  ],
}

/** Thomas Hall's Samaria's Downfall (1660), on the last five verses of Hosea 13, after Burroughs's. */
export const THOMAS_HALL: EeboCommentator = {
  resourceId: "thomas-hall",
  works: [
    {
      // The body is one `verse` division per verse, headed `HOSEA 13. 12.` and then `VERSE 13.`
      source: tcp(
        "A45340",
        "c060b52321857d637e2ae9327e2b9b9d79333f74",
        "c8896c36c7735eecedc4ebfa40a6219dbd59a0d30b970749b6388228be7c30f2",
        1,
      ),
      books: HOSEA,
      layout: {
        chapterDivisions: new Set(),
        onlyChapter: 13,
        verseDivisions: new Set(["verse"]),
        verseLabel: /^(?:HOSEA 13\.|VERSE) (\d+)\./,
      },
    },
  ],
}

/** Sibbes's sermons on Hosea 14 (1639) and his commentary on 2 Corinthians 1 (1655). */
export const SIBBES: EeboCommentator = {
  resourceId: "sibbes",
  works: [
    {
      // Each sermon quotes its text under a label such as `HOS. 14.4, 5.`, numbering the chapter's
      // verses as ten: the sermons labelled 14.9 quote the King James Version's 14:8, and those
      // labelled 14.10 its 14:9. The ninth sermon, labelled 14.6, quotes 14:7. The treatise bound
      // after the sermons, The Saints Priviledge, is left out.
      source: tcp(
        "A12190",
        "79784393b66c04bf6bd68f6b086ea964d3d7fd60",
        "b4836ff30e5d6aa8d5fabffb1315b930ff71b89ae2423b47702fd688567989db",
        2,
      ),
      books: HOSEA,
      layout: {
        bookDivisions: new Set(["sermons"]),
        chapterDivisions: new Set(),
        onlyChapter: 14,
        verseDivisions: new Set(["sermon"]),
        verseLabel: /^Hos\.\s*14\.\s*(\d+)/i,
        verseLabelMoves: new Map([
          ["Hos.14.9", 8],
          ["Hos.14.10", 9],
        ]),
        labelCorrections: [{ opening: "THE NINTH SERMON.", verse: 7 }],
      },
    },
    {
      // One `commentary_on_verse` division per verse or pair of verses, numbered by its `n`.
      source: tcp(
        "A60194",
        "59c1e9e1f5ff478c7f76b3759f241654d034b6f1",
        "3b4b7b28e0bcfd5aad8de9b676e4c505f2615ab8a77b5bd8974548489c1ed159",
        4,
      ),
      books: ["2Cor"],
      layout: {
        bookDivisions: new Set(["commentary"]),
        chapterDivisions: new Set(),
        onlyChapter: 1,
        verseDivisions: new Set(["commentary_on_verse"]),
      },
    },
  ],
}

/** Manton's Jude (1658), one `verse` division per verse, numbered by its `n`. */
export const MANTON: EeboCommentator = {
  resourceId: "manton",
  works: [
    {
      source: tcp(
        "A89503",
        "4e5021c1685e6a949d874b309d336c6e9a4b6e79",
        "59106e5f3f487d5277b379a4e610a2c3626fb466dc20d332d4719ad3f7e6dfeb",
        2,
      ),
      books: ["Jude"],
      layout: {
        bookDivisions: new Set(["biblical_commentary"]),
        chapterDivisions: new Set(),
        verseDivisions: new Set(["verse"]),
      },
    },
  ],
}

/** The English expositions of single books. */
export const ENGLISH_EXPOSITIONS: ReadonlyArray<EeboCommentator> = [
  BURROUGHS,
  THOMAS_HALL,
  SIBBES,
  MANTON,
]
