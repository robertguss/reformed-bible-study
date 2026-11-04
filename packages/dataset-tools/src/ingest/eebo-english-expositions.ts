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

/**
 * Perkins's sermons on the Sermon on the Mount (1608), his Galatians (1604), whose sixth chapter
 * Ralph Cudworth supplied, and his sermons on Hebrews 11 (1607).
 */
export const PERKINS: EeboCommentator = {
  resourceId: "perkins",
  works: [
    {
      // One `verse` division per verse or group of verses, numbered by its `n`, such as `1,2`. The
      // division of chapter 7 carries no number and no heading.
      source: tcp(
        "A09432",
        "8443950eebec55426973cca9e5521e3b6b888e7f",
        "44a594790115130ed01f224d2ca28e5f9699827a83fcc4400f8ff082d5f5899d",
        4,
      ),
      books: ["Matt"],
      layout: {
        chapterDivisions: new Set(["chapter"]),
        lastChapter: 7,
        verseDivisions: new Set(["verse"]),
      },
    },
    {
      // Perkins's chapters 1 to 5 and Cudworth's supplement on chapter 6 are two texts, each with its
      // own body. Each verse is quoted under its bare number, such as `1 Then 14. yeares after`,
      // `v. 11.` or `The Text. 2.`; the print sets 6:11 as `II`. The conclusion on the epistle's
      // postscript, after chapter 6, is left out.
      source: tcp(
        "A09383",
        "ebff529c59fd1e8abd939a874ccd2c2f8695f5fe",
        "51fd71894f44638d3b3f8abc199867a851f7824684daaf5d5a4ae991fcc235d6",
        4,
      ),
      books: ["Gal", "Gal"],
      layout: {
        chapterDivisions: new Set(["chapter"]),
        verseLabel: /^(?:The Text\.\s*)?(?:V(?:er(?:se)?)?\.\s*)?(\d+|II)\b/i,
        labelCorrections: [{ opening: "II Ye see how large a letter", verse: 11 }],
      },
    },
    {
      // One division per example of faith, quoting its verses under labels such as `VERSE 4.` or
      // `HEBREVVES. 11.7.`; the heading of Enoch's example quotes 11:5 with `Verse 5.` in its margin.
      // The commentary on Hebrews 12:1 bound after the chapter is left out.
      source: tcp(
        "A09376",
        "3f2c42ad46f0d343a8e471e99c07c1ffb6167172",
        "d332157a97e585329c411f77e7d15ec97535f9841ce5885c2120d21872aeb64f",
        2,
      ),
      books: ["Heb"],
      layout: {
        skipWithinBook: /12\. Chapter/,
        chapterDivisions: new Set(),
        onlyChapter: 11,
        verseLabel: /(?:\bVERSE\.?\s*|HEBREVVES\.\s*11\.\s*)(\d+)/i,
        headingLabels: true,
      },
    },
  ],
}

/**
 * Gouge's Hebrews (1655), published after his death by his son Thomas Gouge, as numbered sections.
 * A verse's exposition opens with a section quoting it, such as `Verse 4.`, `HEB. 1. 8.` or `Heb. 4.
 * 7.`, or headed with it, as `Of the meaning of Heb. 11. 2.` The sections after it, on its words and
 * doctrines, continue it, and so do the resolutions and observations that close a passage, which
 * quote it again from its first verse.
 */
export const GOUGE: EeboCommentator = {
  resourceId: "gouge",
  works: [
    {
      source: tcp(
        "A41670",
        "836a9df4b169578b54d3c8763784dff81a9df482",
        "515eb5d0856ec079d20ec508bbe6346546ca7e5ae6619c7de76f1b755bebe586",
        16,
      ),
      books: ["Heb"],
      layout: {
        chapterDivisions: new Set(["chapter"]),
        firstChapter: 1,
        verseDivisions: new Set(["section"]),
        verseLabel:
          /(?:^V(?:erse|ers?)?\.?\s*|\bHebr?(?:ews)?[.:▪]?\s*(?:Chap\.\s*)?\d+[.,:▪]+\s*(?:V(?:erse|ers?)?[.,]?\s*)?)(\d+)/i,
        requotedLabels: true,
        // Sections whose label the print or the transcription lost: the gaps in `Heb. 〈◊〉 . 2 •… .`
        // (12:1), `•… eb. 11. 22.`, `Heb. 11. •… 6.` and `H •… b. 12▪ 14.`, the heading
        // `Of the meaning of Heb. 12. 13.` over a quotation of 12:12, and 12:25, whose quotation is
        // labelled `Heb. 12.` and then `Vers. 25.`
        labelCorrections: [
          { opening: "§. 2. Of Gods Witnesses.", verse: 1 },
          { opening: "§. 67. Of the meaning of Heb. 12. 13.", verse: 12 },
          { opening: "§. 71. Of Peace.", verse: 14 },
          { opening: "§. 123. Of Circumspection about Gods Word.", verse: 25 },
          { opening: "§. 115. Of Joseph and his name.", verse: 22 },
          { opening: "§. 251. Of Mockings", verse: 36 },
        ],
      },
    },
  ],
}

/** Owen's exposition of Hebrews 1 and 2 (1668), then its continuation on chapters 6 to 10 (1680). */
export const OWEN: EeboCommentator = {
  resourceId: "owen-hebrews",
  works: [
    {
      // The volume opens with Owen's Exercitations, a text of its own whose divisions are headed
      // `Exercitatio I.` and on, and which is left out. The exposition after it holds one
      // `exposition_of_verse` division per verse or group of verses, with no `n`. Owen heads each
      // verse or group in Roman figures, such as `Verse III.` or `Verse X, XI, XII.`, and only those
      // headings are read. The divisions after a heading, on the Greek text and its translations,
      // carry labels in Arabic figures that are not read, so they continue its section: those on
      // chapter 2 number verses 2 to 4 as 3 to 5, and those on verses 5 to 9 follow Owen's heading
      // on the five verses together, before he takes them one by one.
      source: tcp(
        "A53696",
        "9d50bd00a05ed39e29d7faa14c3e1b6782a799cd",
        "b9b5ae57350821a7fa834c5d8238dcd8144030ab3725603cfd401aa215fcc9a7",
        5,
      ),
      books: ["Heb"],
      layout: {
        bookDivisions: new Set(["biblical_exegesis"]),
        skipDivisions: /^Exercitatio\b/,
        chapterDivisions: new Set(["chapter"]),
        verseDivisions: new Set(["exposition_of_verse"]),
        verseLabel: /^Verse ([IVXL]+)\b/,
      },
    },
    {
      // The whole body is Hebrews; each chapter holds one division per verse or group of verses,
      // numbered by its `n`.
      source: tcp(
        "A53678",
        "e5d5779408ec6294b29a69cf555b3b0659ad107b",
        "0436c101f08640cf6de5f3b6a1cad6bc81b9056b4f19a89ab0e62996faed2b87",
        8,
      ),
      books: ["Heb"],
      layout: {
        chapterDivisions: new Set(["exegesis_of_chapter"]),
        verseDivisions: new Set(["exegesis_of_verse", "exegesis_of_verses"]),
      },
    },
  ],
}

/** Junius's Apocalypsis (1592) in English: the verses of Revelation with his notes in the margin. */
export const JUNIUS: EeboCommentator = {
  resourceId: "junius",
  works: [
    {
      // One paragraph per verse, numbered by its `n`. Chapter 9 numbers 9:16 and 9:17 as 15 and 16.
      source: tcp(
        "A16102",
        "33f7d64d1a34b358b98f3fc2192b40af38d12b43",
        "78031fa4f53504b42189376bfff5b18ca133f42b2c126082d73387cdc420f858",
        1,
      ),
      books: ["Rev"],
      layout: {
        chapterDivisions: new Set(["chapter"]),
        labelCorrections: [
          { opening: "15 And the number of the troupes", verse: 16 },
          { opening: "16 I also saw horses in a vision", verse: 17 },
        ],
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
  PERKINS,
  GOUGE,
  OWEN,
  JUNIUS,
]
