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

/**
 * The later expositions print their labels as the earlier ones do, and also as `Verses 3, 4.`, or
 * with a dash where a quotation resumes a verse, as `Vers.—22.`
 */
const PRINTED_VERSE_LABEL = /^(?:V(?:ers?e?s?)?\s*[.,:]?\s*[—-]?\s*)?(\d+)/i

/** Fergusson's Galatians and Ephesians (1659), Philippians and Colossians (1656) and Thessalonians (1674). */
export const FERGUSSON: EeboCommentator = {
  resourceId: "fergusson",
  works: [
    {
      // Each chapter holds one division per verse or group of verses, named by its heading.
      source: tcp(
        "A41197",
        "e4f2b013c9935da8fdca4276a2f1493fd1564e75",
        "140823cc0ca835eda48a3dc99d4025ef928530e997e92a25e5fecbc82b00f0d2",
        2,
      ),
      books: ["Gal", "Eph"],
      layout: {
        bookDivisions: new Set(["exposition"]),
        chapterDivisions: new Set(["chapter"]),
        verseDivisions: new Set(["verse_and_explication"]),
        verseLabel: PRINTED_VERSE_LABEL,
        labelCorrections: corrections([["Vers. 5, To the praise of the glory", 6]]),
      },
    },
    {
      source: tcp(
        "A41199",
        "2594d75ed573e36bc1f7c3e7e43b30890bde0d65",
        "4dc19ceb12d897d399f961c4f2263123ba6166f06c358334cee364f6b04f80b6",
        1,
      ),
      books: ["Phil", "Col"],
      layout: {
        bookDivisions: new Set(["exposition"]),
        chapterDivisions: new Set(["chapter"]),
        verseDivisions: new Set(["verse_and_commentary"]),
        verseLabel: PRINTED_VERSE_LABEL,
      },
    },
    {
      // The verses are quoted inside each chapter, as Dickson quotes them, with no divisions of their own.
      source: tcp(
        "A41200",
        "6f0a2bc0748e13bc6746fc40d4c22bcd3a9453ae",
        "de5a2e9d7e1603bb97a878dc7ff92e5c764136b712efbe69aabb2bb4ff329268",
        2,
      ),
      books: ["1Thess", "2Thess"],
      layout: {
        bookDivisions: new Set(["part"]),
        chapterDivisions: new Set(["chapter"]),
        verseLabel: PRINTED_VERSE_LABEL,
      },
    },
  ],
}

/** Nisbet's First and Second Epistles of Peter (1658), one division per verse or group of verses. */
export const NISBET: EeboCommentator = {
  resourceId: "nisbet",
  works: [
    {
      source: tcp(
        "A52355",
        "990ba497dc0985fafe64ead1cc450c8641829f98",
        "1003822fea145d1dbe97c0597faba434a18e3bbfe34856ae1fb03d4878811ede",
        2,
      ),
      books: ["1Pet", "2Pet"],
      layout: {
        bookDivisions: new Set(["epistle_and_exposition"]),
        chapterDivisions: new Set(["chapter"]),
        verseDivisions: new Set(["verse_and_commentary"]),
      },
    },
  ],
}

/** Each chapter of Leighton's 1 Peter holds one `verse` division per verse or group of verses. */
const LEIGHTON_VERSES = {
  chapterDivisions: new Set(["chapter"]),
  verseDivisions: new Set(["verse"]),
  verseLabel: PRINTED_VERSE_LABEL,
} satisfies TeiCommentaryLayout

/** Leighton's 1 Peter in two volumes (1693 and 1694), the second edited by James Fall. */
export const LEIGHTON: EeboCommentator = {
  resourceId: "leighton",
  works: [
    {
      source: tcp(
        "A47642",
        "bb3ae7614949e416a4e3ee73c355cfc275a09529",
        "6cd3541c381a53bc7b6812ebe1cbf8191acabaab2c89627116138581056b64fc",
        2,
      ),
      books: ["1Pet"],
      layout: LEIGHTON_VERSES,
    },
    {
      // The chapters are numbered only by their headings, such as `1 Ep. St. Peter Chap. III.`
      source: tcp(
        "A47643",
        "887bdc6b09426957eec4f696115c47a65381a7e4",
        "989dc80eaf2197ca1085a55518382031b09f434984978705b676c6a68de30e94",
        2,
      ),
      books: ["1Pet"],
      layout: {
        ...LEIGHTON_VERSES,
        bookDivisions: new Set(["commentary"]),
        chapterHeading: /Chap\. ([IVX]+)\./,
      },
    },
  ],
}

/** Durham's Song of Solomon (1668), Isaiah 53 (1683) and Revelation (1658). */
export const DURHAM: EeboCommentator = {
  resourceId: "durham",
  works: [
    {
      // Each chapter holds one `verse` division per verse or group of verses, numbered by its `n`.
      // The Key of the Song, before the first chapter, opens it.
      source: tcp(
        "A37032",
        "80439c1c4f5dd1ccc944c4e36dbb7a46f169b3b9",
        "154c499be578da4fce2ac0e3e36e96d788d66767c5971c02b8deacbd69cc89b9",
        2,
      ),
      books: ["Song"],
      layout: {
        bookDivisions: new Set(["text"]),
        chapterDivisions: new Set(["chapter"]),
        verseDivisions: new Set(["verse"]),
      },
    },
    {
      // The sermons are the whole body, each headed by the verse it preaches on, as `ISAIAH LIII.IV, V.`
      source: tcp(
        "A81890",
        "86207e94a311496851da520621a77e5c060f6168",
        "a9dec81d88c2ee3bd60f5fe1768c6509e3c69dc07aba9255cd3e49e175840e45",
        4,
      ),
      books: ["Isa"],
      layout: {
        chapterDivisions: new Set(["chapter"]),
        onlyChapter: 53,
        verseDivisions: new Set(["sermon"]),
        verseLabel: /^ISAIAH LIII\.\s*([IVX]+)\b/,
      },
    },
    {
      // Each chapter division sits inside its first lecture, and each lecture quotes the passage it
      // expounds, so it is one section from its first verse. The third lecture on chapter 7 quotes
      // its passage in its first paragraph.
      source: tcp(
        "A37035",
        "13e7822e3c0d16389dede31038081da3d71dbf51",
        "1c007243e2232409815eafd1e83c383332c760e5a323e5b16fe5b0ef9a2d7088",
        6,
      ),
      books: ["Rev"],
      layout: {
        bookDivisions: new Set(["text"]),
        chapterDivisions: new Set(["chapter"]),
        verseDivisions: new Set(["lecture"]),
        chaptersInFirstVerseDivision: true,
        verseLabel: VERSE_LABEL,
        openingParagraphLabel: true,
      },
    },
  ],
}

/** The Scottish expositions of single books. */
export const SCOTTISH_EXPOSITIONS: ReadonlyArray<EeboCommentator> = [
  DICKSON,
  HUTCHESON,
  FERGUSSON,
  NISBET,
  LEIGHTON,
  DURHAM,
]
