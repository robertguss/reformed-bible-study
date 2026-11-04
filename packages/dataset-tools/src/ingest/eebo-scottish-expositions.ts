import { BOOK_IDS, type BookId } from "@reformed-bible/core"
import type { EeboCommentator } from "./eebo-commentators.ts"
import type { SourceSpec } from "./download.ts"
import type { TeiCommentaryLayout } from "./tei-commentary.ts"

/** The raw TEI file of an EEBO-TCP text, pinned to a repository commit and its SHA-256. */
const tcp = (id: string, commit: string, sha256: string, megabytes: number): SourceSpec => ({
  url: `https://raw.githubusercontent.com/textcreationpartnership/${id}/${commit}/${id}.xml`,
  sha256,
  maxBytes: megabytes * 1024 * 1024,
})

const books = (first: BookId, last: BookId): ReadonlyArray<BookId> =>
  BOOK_IDS.slice(BOOK_IDS.indexOf(first), BOOK_IDS.indexOf(last) + 1)

/**
 * The expositions quote the text before expounding it, opening each quotation, its `bibl` or its
 * epigraph with the verse, printed as `Ver. 1.`, `V. 7.`, `v. 1`, `Vers. 3.`, `Verse 5.` or a bare
 * `9.`.
 */
const VERSE_LABEL = /^(?:V(?:ers?e?)?\s*[.,:]?\s*)?(\d+)/i

const corrections = (
  labels: ReadonlyArray<readonly [opening: string, verse: number]>,
): NonNullable<TeiCommentaryLayout["labelCorrections"]> =>
  labels.map(([opening, verse]) => ({ opening, verse }))

/** Each psalm is a `Psalm` division inside the volume's `text` division. */
const PSALMS: TeiCommentaryLayout = {
  bookDivisions: new Set(["text"]),
  chapterDivisions: new Set(["Psalm"]),
  verseLabel: VERSE_LABEL,
}

/** Dickson's Psalms in three volumes (1653 to 1655), Matthew (1651) and the Epistles (1659). */
export const DICKSON: EeboCommentator = {
  resourceId: "dickson",
  works: [
    {
      source: tcp(
        "A35941",
        "cbe8ed339902b750e453f31a6bcaedf43f6e6e84",
        "001a504e442083ad9a789ef3be2f25c36a305bf89458e1c313e5369c9faa7439",
        2,
      ),
      books: ["Ps"],
      layout: PSALMS,
    },
    {
      source: tcp(
        "A35945",
        "5fecb86a9388c0ca2f12ff67d8d541d5d8515e43",
        "4295af71f391a2cde4234c9454c7bb2a0057597c1fc8b2124095aa1d7be289f5",
        2,
      ),
      books: ["Ps"],
      layout: { ...PSALMS, labelCorrections: corrections([["Ver. 8 LORD, how long", 3]]) },
    },
    {
      // The body is the book, with no division of its own. The imprimatur is printed as a text of
      // its own inside the title page, which has no heading, so that division is left out.
      source: tcp(
        "A35943",
        "c9fcfdc4df67ded3e296b9d6a9ab78bb0236e9a9",
        "25a7833bdbb9c39fd7377e5ed314b6bf01dc7cbcc97a761fdf15b34b0a28fb07",
        2,
      ),
      books: ["Ps"],
      layout: {
        skipDivisions: /^$/,
        chapterDivisions: new Set(["Psalm"]),
        verseLabel: VERSE_LABEL,
        labelCorrections: corrections([
          ["Vers. 9. Remember the Word", 49],
          ["Vers. 12. Concerning thy Testimonies", 152],
          ["Vers. • 66.", 166],
          ["Vers. 149. Let my cry", 169],
        ]),
      },
    },
    {
      // The discourse on the title of the New Testament, before the Gospel's own division, is left out.
      source: tcp(
        "A35949",
        "902f0588787d794e2212b9dd36b20bdeb8d07048",
        "1a38122be08c90310dfce02b499cfc0fc99a6701082f410ab5b25eb46ca6fa6f",
        2,
      ),
      books: ["Matt"],
      layout: {
        bookDivisions: new Set(["part"]),
        chapterDivisions: new Set(["chapter"]),
        verseLabel: VERSE_LABEL,
        labelCorrections: corrections([
          ["Verse 18. For the Son of man", 8],
          ["Ver. 8. And when he was departed", 9],
          ["Ver. 17. And if I by Beelzebub", 27],
          ["Ver. 15. And when they were come to the multitude", 14],
        ]),
      },
    },
    {
      // Each epistle is a `letter` division. The one with no heading, after Hebrews, is Dickson's
      // separate English work on Hebrews with observations, which is left out. 2 Corinthians 7 and
      // 2 Thessalonians 1 print their first verses unlabelled in the chapter's argument.
      source: tcp(
        "A35951",
        "b04a2217988531c6e67913179f0051eaf19b882e",
        "f5c47823b3b3d4bd452e30d170e1ae1cca1982802b6de18b7399c819dc20a73b",
        4,
      ),
      books: books("Rom", "Jude"),
      layout: {
        bookDivisions: new Set(["letter"]),
        skipDivisions: /^$/,
        chapterDivisions: new Set(["chapter"]),
        verseLabel: VERSE_LABEL,
        unlabelledOpening: true,
        labelCorrections: corrections([
          ["Vers. 16. — Salute one", 16],
          ["Vers. 17. — For Christ sent", 17],
        ]),
      },
    },
  ],
}

/** Hutcheson's Job (1669), the Minor Prophets in three volumes (1654) and John (1657). */
export const HUTCHESON: EeboCommentator = {
  resourceId: "hutcheson",
  works: [
    {
      // Each chapter holds one `verse` or `verses` division per lecture, named by its epigraph.
      source: tcp(
        "A45240",
        "940db82d0d01b33332a999bc0528e2f802520a5b",
        "f240ff268630286304d6862758d076f5962d8b11b92c68a076520c60889a93c2",
        8,
      ),
      books: ["Job"],
      layout: {
        bookDivisions: new Set(["exposition_of_Job"]),
        chapterDivisions: new Set(["chapter"]),
        verseDivisions: new Set(["verse", "verses"]),
        verseLabel: VERSE_LABEL,
        labelCorrections: corrections([
          ["Vers. 22. For what pleasure", 21],
          ["Ver. 3. Behold, now I have opened", 2],
        ]),
      },
    },
    {
      source: tcp(
        "A86936",
        "f37db7aca903c580baf23d3d0dd2439095f612a1",
        "816747e12c98fae1837058a904dfcb73543b544d79a06d5e5c69003defb89c76",
        2,
      ),
      books: books("Hos", "Amos"),
      layout: {
        bookDivisions: new Set(["exposition"]),
        chapterDivisions: new Set(["chapter"]),
        verseLabel: VERSE_LABEL,
      },
    },
    {
      source: tcp(
        "A86934",
        "436aeee746152a26b243092d78fc9a4c1251f0b7",
        "08a7c55bd430cecd70eaad8a808a986f40d0475b55dc5c24005caec008b2c5bc",
        2,
      ),
      books: books("Obad", "Zeph"),
      layout: {
        bookDivisions: new Set(["exposition_of_prophecy"]),
        chapterDivisions: new Set(["chapter"]),
        verseLabel: VERSE_LABEL,
      },
    },
    {
      source: tcp(
        "A86932",
        "d3cbea4793683ccdebe42cffbc2138deb7907585",
        "afcb597ecc4985c5fe97e6b1458a8a06e271f093d337ee07afac451e9caacc06",
        2,
      ),
      books: books("Hag", "Mal"),
      layout: {
        bookDivisions: new Set(["exposition_of_prophecy"]),
        chapterDivisions: new Set(["chapter"]),
        verseLabel: VERSE_LABEL,
      },
    },
    {
      // Each chapter holds one `verse` division per verse or group of verses, named by its epigraph.
      source: tcp(
        "A45241",
        "721483c781b9c5bae7e81a537d08e4982db02ab2",
        "d755f249e55400e09a6bdae30d56abb904899c17fa5633eb3055d838f4bdbb0d",
        4,
      ),
      books: ["John"],
      layout: {
        bookDivisions: new Set(["text"]),
        chapterDivisions: new Set(["chapter"]),
        verseDivisions: new Set(["verse"]),
        verseLabel: VERSE_LABEL,
      },
    },
  ],
}

/** The Scottish expositions of single books. */
export const SCOTTISH_EXPOSITIONS: ReadonlyArray<EeboCommentator> = [DICKSON, HUTCHESON]
