import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "@effect/vitest"
import { BOOK_IDS, type BookId, type TextRun } from "@reformed-bible/core"
import { Effect } from "effect"
import { OWEN } from "../../src/ingest/eebo-english-expositions.ts"
import { POOLE_LAYOUT } from "../../src/ingest/poole.ts"
import { readTeiCommentary, type TeiCommentaryLayout } from "../../src/ingest/tei-commentary.ts"

const fixture = (path: string) =>
  readFileSync(join(import.meta.dirname, "../fixtures", path), "utf8")

const GENESIS = fixture("poole-sample/A55363-genesis-1-1-3.xml")

const plain = (runs: ReadonlyArray<TextRun>): string => runs.map((run) => run.text).join("")

const tei = (book: string, prolog = "") =>
  `${prolog}<TEI xmlns="http://www.tei-c.org/ns/1.0"><text><body><div type="book"><head>A BOOK.</head>${book}</div></body></text></TEI>`

const chapter = (n: number, ...paragraphs: ReadonlyArray<string>) =>
  `<div n="${n}" type="chapter"><head>CHAP.</head>${paragraphs.join("")}</div>`

const verse = (n: number, text: string) => `<p n="${n}">${n} ${text}</p>`

const read = (xml: string, book: BookId, layout: TeiCommentaryLayout = POOLE_LAYOUT) =>
  Effect.gen(function* () {
    const [only] = yield* readTeiCommentary("poole-annotations", xml, [book], layout)
    return only?.sections ?? []
  })

const refs = (sections: ReadonlyArray<{ readonly ref: string }>) => sections.map((s) => s.ref)

const section = <S extends { readonly ref: string }>(sections: ReadonlyArray<S>, ref: string) =>
  sections.find((s) => s.ref === ref)

const sha256 = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex")

describe("readTeiCommentary", () => {
  it.effect("keys each verse paragraph to the verse its own marker names", () =>
    Effect.gen(function* () {
      const sections = yield* read(GENESIS, "Gen")
      expect(sections.map((s) => s.ref)).toEqual(["Gen.1.1", "Gen.1.2", "Gen.1.3-Gen.1.31"])
      const [first, second] = sections.map((s) => s.paragraphs.map(plain))
      expect(second?.slice(0, 2)).toEqual([
        "2. And the Earth (e) was without form and void (f), and darkness was upon the face (g) of the deep: and the Spirit of God (h) moved upon the face of the Waters (*).",
        "(e) The same confused mass or heap is here called both Earth, from its most solid and substantial part; and the deep, from its vast bulk and depth; and Waters, from its outward face and covering. See Psal. 104. 6. 2 Pet. 3. 5.",
      ])
      // The book's argument opens the first verse, which the print leaves unnumbered.
      expect(first?.slice(0, 1)).toEqual(["The ARGUMENT."])
      expect(first?.[2]).toBe(
        "IN (*) the beginning (a) God Created (b) the Heaven and the Earth (c).",
      )
      expect(first?.[4]).toBe("(b) Made out of nothing.")
    }),
  )

  it.effect("keeps each illegible-character gap as its visible mark", () =>
    Effect.gen(function* () {
      const [first] = yield* read(GENESIS, "Gen")
      expect(first?.notes.map(plain)).toEqual([
        "(*) 〈◊〉 •…6. 102. 〈◊〉 ▪ •…. 146. 6. 〈◊〉 24. Jer. 〈◊〉 ▪ 51. 15. 〈◊〉 12. 1. Acts 〈◊〉 1•…. 17. 24. 〈◊〉 11. 3.",
      ])
    }),
  )

  it.effect("does not expand an entity declared in a document type definition", () =>
    Effect.gen(function* () {
      const sections = yield* read(
        tei(
          chapter(1, verse(1, "Before &xxe; after.")),
          `<!DOCTYPE TEI [<!ENTITY xxe "EXPANDED">]>`,
        ),
        "Obad",
      )
      expect(sections.map((s) => s.paragraphs.map(plain))).toEqual([["1 Before &xxe; after."]])
    }),
  )

  it.effect("places a misprinted verse marker between the two verses around it", () =>
    Effect.gen(function* () {
      const sections = yield* read(
        tei(
          chapter(
            1,
            verse(1, "Grace be unto you."),
            verse(2, "We give thanks."),
            verse(2, "Remembering your work of faith."),
            verse(4, "Knowing your election."),
            verse(5, "For our gospel came not unto you in word only."),
          ),
        ),
        "1Thess",
      )
      expect(sections.map((s) => [s.ref, plain(s.paragraphs[0] ?? [])])).toEqual([
        ["1Thess.1.1", "1 Grace be unto you."],
        ["1Thess.1.2", "2 We give thanks."],
        ["1Thess.1.3", "2 Remembering your work of faith."],
        ["1Thess.1.4", "4 Knowing your election."],
        ["1Thess.1.5-1Thess.1.10", "5 For our gospel came not unto you in word only."],
      ])
    }),
  )

  it.effect("starts the next chapter where missing pages took its heading with them", () =>
    Effect.gen(function* () {
      const sections = yield* read(
        tei(
          chapter(
            10,
            verse(
              11,
              `And that ye may teach.<gap reason="missing"><desc>〈2… pages missing〉</desc></gap>`,
            ),
            verse(25, "And whosoever beareth ought of the carcass of them."),
          ) + chapter(12, verse(1, "And the LORD spake unto Moses.")),
        ),
        "Lev",
      )
      expect(sections.map((s) => s.ref)).toEqual([
        "Lev.10.11-Lev.10.20",
        "Lev.11.25-Lev.11.47",
        "Lev.12.1-Lev.12.8",
      ])
      expect(plain(sections[0]?.paragraphs[0] ?? [])).toBe(
        "11 And that ye may teach.〈2… pages missing〉",
      )
    }),
  )

  it.effect("reads the Poole and Owen excerpts byte for byte as they were first ingested", () =>
    Effect.gen(function* () {
      const poole = yield* readTeiCommentary("poole-annotations", GENESIS, ["Gen"], POOLE_LAYOUT)
      const owen = yield* readTeiCommentary(
        "owen-hebrews",
        fixture("owen-sample/A53678-hebrews-6-and-10-excerpt.xml"),
        ["Heb"],
        OWEN.works[1]!.layout,
      )
      expect(sha256(poole)).toBe("6300d33a140d30211f0a881fd812c43632426b276a4139d2b614e7c32d07a064")
      expect(sha256(owen)).toBe("c7d2336da2c609eb52d5f45bc1afd62f81fc96391c965c1793133bd2dbfcbd13")
    }),
  )

  it.effect("skips a book division the layout names as holding no listed book", () =>
    Effect.gen(function* () {
      const division = (head: string) =>
        `<div type="book"><head>${head}.</head>${chapter(1, verse(1, `The text of ${head}.`))}</div>`
      const matthew = BOOK_IDS.indexOf("Matt")
      const divisions = [
        ...BOOK_IDS.slice(0, matthew).map(division),
        division("TOBIT"),
        ...BOOK_IDS.slice(matthew).map(division),
      ]
      const books = yield* readTeiCommentary(
        "poole-annotations",
        `<TEI xmlns="http://www.tei-c.org/ns/1.0"><text><body>${divisions.join("")}</body></text></TEI>`,
        BOOK_IDS,
        { ...POOLE_LAYOUT, skipDivisions: /^TOBIT\./ },
      )
      expect(books.map((b) => b.book)).toEqual(BOOK_IDS)
      const [first] = books[matthew]?.sections ?? []
      expect(first?.paragraphs.map(plain)).toEqual(["1 The text of Matt."])
    }),
  )

  it.effect("reads a body without chapter divisions as the one chapter the layout names", () =>
    Effect.gen(function* () {
      const sections = yield* read(
        `<TEI xmlns="http://www.tei-c.org/ns/1.0"><text><body><head>A CLOUD OF WITNESSES.</head>${verse(1, "Now faith is the substance of things hoped for.")}${verse(3, "Through faith we understand that the worlds were framed.")}</body></text></TEI>`,
        "Heb",
        { chapterDivisions: new Set(["chapter"]), onlyChapter: 11 },
      )
      expect(refs(sections)).toEqual(["Heb.11.1-Heb.11.2", "Heb.11.3-Heb.11.40"])
    }),
  )

  it.effect(
    "keys a lecture to the run of verses its quoted labels open, not to its own number",
    () =>
      Effect.gen(function* () {
        const sections = yield* read(
          fixture("durham-sample/A37035-revelation-5-excerpt.xml"),
          "Rev",
          {
            bookDivisions: new Set(["text"]),
            chapterDivisions: new Set(["chapter"]),
            verseDivisions: new Set(["lecture"]),
            chaptersInFirstVerseDivision: true,
            verseLabel: /^(?:Vers\. )?(\d+)\./,
          },
        )
        expect(refs(sections)).toEqual(["Rev.5.1-Rev.5.7", "Rev.5.8-Rev.5.14", "Rev.6.1-Rev.6.17"])
        const lecture1 = section(sections, "Rev.5.1-Rev.5.7")?.paragraphs.map(plain) ?? []
        expect(lecture1[0]).toBe("LECTURE I.")
        expect(lecture1[1]).toMatch(/^Vers\. 1\. ANd I saw in the right hand of him/)
        expect(lecture1).not.toContain("CHAP. V.")
        const lecture2 = section(sections, "Rev.5.8-Rev.5.14")?.paragraphs.map(plain) ?? []
        expect(lecture2[0]).toBe("LECTURE II.")
        expect(lecture2).toContain(
          "THis is the third part of the Chapter, and expresseth the main scope of what went before, to wit, the exalting of the Mediator.",
        )
      }),
  )

  it.effect("reads a lecture's label from its first paragraph where it quotes its text there", () =>
    Effect.gen(function* () {
      const sections = yield* read(
        fixture("durham-sample/A37035-revelation-7-excerpt.xml"),
        "Rev",
        {
          bookDivisions: new Set(["text"]),
          chapterDivisions: new Set(["chapter"]),
          verseDivisions: new Set(["lecture"]),
          chaptersInFirstVerseDivision: true,
          verseLabel: /^(?:Vers\. )?(\d+)\./,
          openingParagraphLabel: true,
        },
      )
      expect(refs(sections)).toEqual([
        "Rev.7.1",
        "Rev.7.2-Rev.7.3",
        "Rev.7.4-Rev.7.8",
        "Rev.7.9-Rev.7.17",
      ])
      const lecture3 = section(sections, "Rev.7.4-Rev.7.8")?.paragraphs.map(plain) ?? []
      expect(lecture3[0]).toBe("LECTURE III.")
      expect(lecture3[1]).toMatch(/^Vers\. 4\. And I heard the number of them which were sealed/)
    }),
  )

  it.effect("numbers chapter divisions without n attributes by their headings", () =>
    Effect.gen(function* () {
      const sections = yield* read(
        fixture("leighton-sample/A47643-1-peter-3-excerpt.xml"),
        "1Pet",
        {
          bookDivisions: new Set(["commentary"]),
          chapterDivisions: new Set(["chapter"]),
          verseDivisions: new Set(["verse"]),
          chapterHeading: /Chap\. ([IVX]+)\./,
        },
      )
      // With no label pattern and no n attributes, each chapter's divisions are one section.
      expect(refs(sections)).toEqual([
        "1Pet.3.1-1Pet.3.22",
        "1Pet.4.1-1Pet.4.19",
        "1Pet.5.1-1Pet.5.14",
      ])
    }),
  )

  it.effect("opens a section only at a quoted verse label, never at a verse named in prose", () =>
    Effect.gen(function* () {
      const sections = yield* read(
        fixture("dickson-sample/A35941-psalms-1-and-2-excerpt.xml"),
        "Ps",
        {
          bookDivisions: new Set(["text"]),
          chapterDivisions: new Set(["Psalm"]),
          verseLabel: /^(?:V(?:ers?)?\. )?(\d+)/,
        },
      )
      expect(refs(sections)).toEqual([
        "Ps.1.1-Ps.1.2",
        "Ps.1.3-Ps.1.4",
        "Ps.1.5",
        "Ps.1.6",
        "Ps.2.1-Ps.2.3",
        "Ps.2.4-Ps.2.6",
        "Ps.2.7-Ps.2.8",
        "Ps.2.9",
        "Ps.2.10-Ps.2.12",
      ])
      // The argument, which names ver. 4 in prose, opens the psalm's first section.
      expect(plain(sections[0]?.paragraphs[0] ?? [])).toMatch(
        /^THis Psalme teacheth.* ver\. 4\. Another reason/,
      )
      // A paragraph numbered as the exposition's second point stays with verse 9.
      expect(section(sections, "Ps.2.9")?.paragraphs.map(plain).at(-1)).toMatch(
        /^2\. Though Christs Church be weak/,
      )
    }),
  )

  it.effect("reads a verse division's number from its heading when it has no n attribute", () =>
    Effect.gen(function* () {
      const sections = yield* read(
        fixture("hall-sample/A45340-hosea-13-12-and-13-excerpt.xml"),
        "Hos",
        {
          chapterDivisions: new Set(),
          verseDivisions: new Set(["verse"]),
          onlyChapter: 13,
          verseLabel: /^(?:HOSEA 13\.|VERSE) (\d+)\./,
        },
      )
      expect(refs(sections)).toEqual(["Hos.13.12", "Hos.13.13-Hos.13.16"])
      expect(plain(sections[0]?.paragraphs[0] ?? [])).toBe("HOSEA 13. 12.")
    }),
  )

  const BURROUGHS: TeiCommentaryLayout = {
    bookDivisions: new Set(["exposition"]),
    chapterDivisions: new Set(["chapter"]),
    verseDivisions: new Set(["verse"]),
  }

  it.effect("numbers an unnumbered first chapter division from the volume's first chapter", () =>
    Effect.gen(function* () {
      const sections = yield* read(
        fixture("burroughs-sample/A30574-hosea-8-to-10-excerpt.xml"),
        "Hos",
        { ...BURROUGHS, firstChapter: 8 },
      )
      expect(refs(sections)).toEqual([
        "Hos.8.1-Hos.8.3",
        "Hos.8.4-Hos.8.10",
        "Hos.8.11-Hos.8.14",
        "Hos.9.1-Hos.9.17",
        "Hos.10.1-Hos.10.14",
        "Hos.10.15",
      ])
    }),
  )

  it.effect("numbers an unnumbered last chapter division from the volume's last chapter", () =>
    Effect.gen(function* () {
      const sections = yield* read(fixture("perkins-sample/A09432-matthew-7-excerpt.xml"), "Matt", {
        chapterDivisions: new Set(["chapter"]),
        verseDivisions: new Set(["verse"]),
        lastChapter: 7,
      })
      expect(refs(sections)).toEqual([
        "Matt.6.34",
        "Matt.7.1",
        "Matt.7.2",
        "Matt.7.3-Matt.7.27",
        "Matt.7.28-Matt.7.29",
      ])
    }),
  )

  const HEBREWS_11 = fixture("perkins-sample/A09376-hebrews-11-excerpt.xml")

  const PERKINS_HEBREWS: TeiCommentaryLayout = {
    chapterDivisions: new Set(),
    onlyChapter: 11,
    verseLabel: /(?:\bVERSE\.?\s*|HEBREVVES\.\s*11\.\s*)(\d+)/i,
  }

  it.effect("leaves out a division inside the book whose heading the layout names", () =>
    Effect.gen(function* () {
      const sections = yield* read(HEBREWS_11, "Heb", {
        ...PERKINS_HEBREWS,
        skipWithinBook: /12\. Chapter/,
      })
      expect(refs(sections).at(-1)).toBe("Heb.11.40")
      expect(section(sections, "Heb.11.40")?.paragraphs.map(plain).at(-1)).toMatch(
        /^BEcause some man might much maruel/,
      )
      expect(JSON.stringify(sections)).not.toContain("Wherfore, let vs also")
    }),
  )

  it.effect("opens a section at a heading's verse label where the layout reads labels there", () =>
    Effect.gen(function* () {
      const sections = yield* read(HEBREWS_11, "Heb", {
        ...PERKINS_HEBREWS,
        skipWithinBook: /12\. Chapter/,
        headingLabels: true,
      })
      // Enoch's heading quotes 11:5 with Verse 5. in its margin, so his example opens verse 5.
      expect(refs(sections).slice(0, 5)).toEqual([
        "Heb.11.1",
        "Heb.11.2-Heb.11.3",
        "Heb.11.4",
        "Heb.11.5-Heb.11.6",
        "Heb.11.7-Heb.11.34",
      ])
      expect(section(sections, "Heb.11.5-Heb.11.6")?.paragraphs.map(plain)).toEqual([
        expect.stringMatching(/^The second is of Henoch: in these words; By faith Henoch/),
        expect.stringMatching(/^THe second example of faith/),
        "Let the meaning of the words be first examined.",
      ])
      expect(plain(section(sections, "Heb.11.7-Heb.11.34")?.paragraphs[0] ?? [])).toBe(
        "Noahs Faith.",
      )
    }),
  )

  it.effect("continues a verse's section where a later section quotes earlier verses again", () =>
    Effect.gen(function* () {
      const sections = yield* read(fixture("gouge-sample/A41670-hebrews-1-excerpt.xml"), "Heb", {
        chapterDivisions: new Set(["chapter"]),
        firstChapter: 1,
        verseDivisions: new Set(["section"]),
        verseLabel: /(?:^V(?:erse|ers?)?\.?\s*|\bHEB(?:REWS)?\.?\s*\d+\.\s*(?:Vers\.\s*)?)(\d+)/i,
        requotedLabels: true,
      })
      expect(refs(sections)).toEqual([
        "Heb.1.1-Heb.1.3",
        "Heb.1.4-Heb.1.7",
        "Heb.1.8",
        "Heb.1.9",
        "Heb.1.10-Heb.1.14",
      ])
      // The resolution of verses 8 and 9 quotes verse 8 again, and stays with verse 9.
      expect(section(sections, "Heb.1.9")?.paragraphs.map(plain)[0]).toBe(
        "§. 114. Of the extent of Righteousnesse.",
      )
      expect(section(sections, "Heb.1.9")?.paragraphs.map(plain)).toContain(
        "§. 125. Of the resolution of v. 8, 9.",
      )
    }),
  )

  it.effect("keys a sermon to the verse its text quotes where the layout moves its label", () =>
    Effect.gen(function* () {
      const sections = yield* read(fixture("sibbes-sample/A12190-hosea-14-excerpt.xml"), "Hos", {
        bookDivisions: new Set(["sermons"]),
        chapterDivisions: new Set(),
        verseDivisions: new Set(["sermon"]),
        onlyChapter: 14,
        verseLabel: /^HOS\. 14\.(\d+)\./,
        verseLabelMoves: new Map([["Hos.14.10", 9]]),
      })
      expect(refs(sections)).toEqual(["Hos.14.8", "Hos.14.9"])
      expect(plain(section(sections, "Hos.14.9")?.paragraphs[0] ?? [])).toBe(
        "THE FOVRTEENTH SERMON.",
      )
    }),
  )

  const QUOTED: TeiCommentaryLayout = {
    bookDivisions: new Set(["book"]),
    chapterDivisions: new Set(["chapter"]),
    verseLabel: /^Vers?\.\s*(\d+)/,
  }

  const quoted = (label: string, text: string) =>
    `<q><hi>${label}</hi> ${text}</q><p>Exposition of ${label}</p>`

  it.effect("keys a corrected label to the verse its text quotes, whatever its neighbours", () =>
    Effect.gen(function* () {
      const layout: TeiCommentaryLayout = {
        ...QUOTED,
        labelCorrections: [
          { opening: "Ver. 8 LORD, how long", verse: 3 },
          { opening: "Vers. 16. — Salute one", verse: 16 },
        ],
      }
      const psalm = yield* read(
        tei(
          chapter(
            94,
            quoted("Ver. 1.", "O LORD God, to whom vengeance belongeth."),
            quoted("Ver. 8", "LORD, how long shall the wicked triumph?"),
            quoted("Ver. 5.", "They break in pieces thy people."),
            quoted("Ver. 8.", "Understand, ye brutish among the people."),
          ),
        ),
        "Ps",
        layout,
      )
      // A label misprinted as a later verse would otherwise pull verses 3 to 7 into verse 8.
      expect(refs(psalm)).toEqual([
        "Ps.94.1-Ps.94.2",
        "Ps.94.3-Ps.94.4",
        "Ps.94.5-Ps.94.7",
        "Ps.94.8-Ps.94.23",
      ])
      const romans = yield* read(
        tei(
          chapter(
            16,
            quoted("Vers. 14.", "Salute Asyncritus, Phlegon."),
            quoted("Vers. 16.", "— Salute one another with an holy kiss."),
            quoted("Vers. 16.", "— The Churches of Christ salute you."),
            quoted("Vers. 17.", "Now I beseech you, Brethren."),
          ),
        ),
        "Rom",
        layout,
      )
      // Both halves of verse 16 carry its label, and the first stays at 16 rather than filling 15.
      expect(refs(romans)).toEqual(["Rom.16.14-Rom.16.15", "Rom.16.16", "Rom.16.17-Rom.16.27"])
      expect(section(romans, "Rom.16.16")?.paragraphs.map(plain)).toEqual([
        "Vers. 16. — Salute one another with an holy kiss.",
        "Exposition of Vers. 16.",
        "Vers. 16. — The Churches of Christ salute you.",
        "Exposition of Vers. 16.",
      ])
    }),
  )

  it.effect("keys the verses a chapter prints unlabelled in its argument as its verse 1", () =>
    Effect.gen(function* () {
      const sections = yield* read(
        tei(
          chapter(
            1,
            "<argument><p>Ver. 1. Paul, and Sylvanus, and Timotheus. 2. Grace unto you.</p></argument>",
            "<p>In the direction of the Epistle the same persons salute them.</p>",
            quoted("Vers. 3.", "Wee are bound to thank God alwaies for you."),
          ),
        ),
        "2Thess",
        { ...QUOTED, unlabelledOpening: true },
      )
      expect(refs(sections)).toEqual(["2Thess.1.1-2Thess.1.2", "2Thess.1.3-2Thess.1.12"])
      // The argument and the exposition after it stay in the order printed.
      expect(sections[0]?.paragraphs.map(plain)).toEqual([
        "Ver. 1. Paul, and Sylvanus, and Timotheus. 2. Grace unto you.",
        "In the direction of the Epistle the same persons salute them.",
      ])
    }),
  )

  it.effect("ends the last section at the work's last verse rather than the chapter's end", () =>
    Effect.gen(function* () {
      const division = (n: number, text: string) =>
        `<div n="${n}" type="verse"><head>VER. ${n}.</head><p>${text}</p></div>`
      const sections = yield* read(
        `<TEI xmlns="http://www.tei-c.org/ns/1.0"><text><body><div type="exposition"><div n="13" type="chapter"><head>CHAP. XIII.</head>${division(10, "I will be thy King.")}${division(11, "I gave thee a King in mine anger.")}</div></div></body></text></TEI>`,
        "Hos",
        { ...BURROUGHS, lastVerse: { book: "Hos", chapter: 13, verse: 11 } },
      )
      expect(refs(sections)).toEqual(["Hos.13.10", "Hos.13.11"])
    }),
  )

  it.effect("opens a section only at a verse label printed at the start of a quotation", () =>
    Effect.gen(function* () {
      const sections = yield* read(
        fixture("jackson-annotations-sample/A46823-genesis-1-excerpt.xml"),
        "Gen",
        {
          bookDivisions: new Set(["book"]),
          chapterDivisions: new Set(["chapter"]),
          openingLabel: /^Vers\. (\d+)\./,
        },
      )
      expect(refs(sections)).toEqual(["Gen.1.1", "Gen.1.2", "Gen.1.3-Gen.1.31"])
      // The unlabelled quotation before the first label is verse 1, though its note names the
      // second verse in prose.
      const first = sections[0]?.paragraphs.map(plain) ?? []
      expect(first[0]).toBe("IN the beginning God created the heaven and the earth.]")
      expect(first[1]).toContain("as it is afterwards described in the second verse")
      // An unlabelled quotation continues the verse before it.
      expect(section(sections, "Gen.1.2")?.paragraphs.map(plain)).toEqual([
        "Vers. 2. And the earth was without form, and void.]",
        expect.stringMatching(/^That is, the earth was on the first day created/),
        "And darknesse was upon the face of the deep.]",
        expect.stringMatching(/^By the deep, is meant that confused Chaos/),
        "And the Spirit of God moved upon the face of the waters.]",
        expect.stringMatching(/^The word here translated moved, is metaphoricall/),
      ])
    }),
  )

  const DIODATI: TeiCommentaryLayout = {
    bookDivisions: new Set(["commentary_on_book"]),
    chapterDivisions: new Set(["chapter"]),
    openingLabel: /^V\. (\d+)\./,
  }

  it.effect("reads the chapters a division inside the book gathers as the book's own", () =>
    Effect.gen(function* () {
      const sections = yield* read(
        fixture("diodati-annotations-sample/A36033-genesis-1-excerpt.xml"),
        "Gen",
        { ...DIODATI, chapterGroups: new Set(["annotations"]) },
      )
      expect(refs(sections)).toEqual(["Gen.1.1", "Gen.1.2", "Gen.1.3-Gen.1.31"])
      const first = sections[0]?.paragraphs.map(plain) ?? []
      expect(first[0]).toBe("THE ARGVMENT.")
      expect(first[1]).toMatch(/^IN the beginning\] God giving the world its first being/)
      expect(JSON.stringify(sections)).not.toContain("ANNOTATIONS VPON")
    }),
  )

  const CHRONICLES = fixture("diodati-annotations-sample/A36033-1-chronicles-3-to-5-excerpt.xml")

  it.effect("keys a chapter's unlabelled first note to the verse its heading names", () =>
    Effect.gen(function* () {
      const sections = yield* read(CHRONICLES, "1Chr", {
        ...DIODATI,
        chaptersResume: true,
        headingVerse: /\bVERS\. ([IVXLC]+)\./,
      })
      const opening = (ref: string) => plain(section(sections, ref)?.paragraphs[0] ?? [])
      // CHAP. III. VERS. I. and CHAP. IV. VERS. XXIV., in Roman figures.
      expect(opening("1Chr.3.1-1Chr.3.4")).toMatch(/^DAniel\] who seemeth to be the same as/)
      expect(opening("1Chr.4.24-1Chr.4.30")).toMatch(/^NEmuel\] in these names/)
    }),
  )

  it.effect("continues a chapter where the print resumes it under a heading of its own", () =>
    Effect.gen(function* () {
      const sections = yield* read(CHRONICLES, "1Chr", {
        ...DIODATI,
        chaptersResume: true,
        headingVerse: /\bVERS\. ([IVXLC]+)\./,
      })
      expect(refs(sections).filter((ref) => ref.startsWith("1Chr.4."))).toEqual([
        "1Chr.4.1",
        "1Chr.4.2",
        "1Chr.4.3-1Chr.4.23",
        "1Chr.4.24-1Chr.4.30",
        "1Chr.4.31-1Chr.4.39",
        "1Chr.4.40",
        "1Chr.4.41-1Chr.4.42",
        "1Chr.4.43",
      ])
      expect(refs(sections).at(-1)).toBe("1Chr.5.2-1Chr.5.26")
    }),
  )

  it.effect("starts the next chapter where a label after missing pages falls back", () =>
    Effect.gen(function* () {
      const sections = yield* read(
        fixture("jackson-annotations-sample/A46807-psalms-4-to-6-excerpt.xml"),
        "Ps",
        {
          bookDivisions: new Set(["book"]),
          chapterDivisions: new Set(["Psalm"]),
          openingLabel: /^Vers\. (\d+)\./,
        },
      )
      expect(refs(sections)).toEqual([
        "Ps.4.1-Ps.4.3",
        "Ps.4.4-Ps.4.8",
        "Ps.5.3",
        "Ps.5.4-Ps.5.12",
        "Ps.6.1-Ps.6.10",
      ])
      expect(plain(section(sections, "Ps.5.3")?.paragraphs[0] ?? [])).toMatch(
        /^Vers\. 3\. My voice shalt thou hear in the morning/,
      )
    }),
  )

  it.effect("moves a run the transcription keys out of order back to where it was printed", () =>
    Effect.gen(function* () {
      const sections = yield* read(
        fixture("westminster-annotations-sample/A36467-1-kings-8-and-9-excerpt.xml"),
        "1Kgs",
        {
          bookDivisions: new Set(["book"]),
          chapterDivisions: new Set(["chapter"]),
          openingLabel: /^V(?:ers)?\. (\d+)\./,
          misplaced: [
            {
              from: "Solomon discerning this to be a sign",
              through: "Call to minde their sins.",
              after: "Upon that manifestation of Gods glory,",
            },
          ],
        },
      )
      expect(refs(sections)).toEqual([
        "1Kgs.8.11",
        "1Kgs.8.12",
        "1Kgs.8.13-1Kgs.8.46",
        "1Kgs.8.47-1Kgs.8.48",
        "1Kgs.8.49",
        "1Kgs.8.50-1Kgs.8.66",
        "1Kgs.9.1-1Kgs.9.14",
        "1Kgs.9.15",
        "1Kgs.9.16-1Kgs.9.28",
      ])
      expect(section(sections, "1Kgs.8.12")?.paragraphs.map(plain)).toEqual([
        "V. 12. Then] Upon that manifestation of Gods glory, Solomon discerning this to be a sign of Gods gracious presence quickly makes known as much.",
        expect.stringMatching(/^said\] 2 Chron\. 6\. 1\./),
      ])
      // The note on Millo, which the misplaced pages interrupted, still ends verse 15.
      expect(section(sections, "1Kgs.9.15")?.paragraphs.map(plain).at(-1)).toMatch(
        /^Hezekiah repaired it, 2 Chron\. 32\. 5\./,
      )
    }),
  )

  it.effect("prints the long s as s in headings, paragraphs and margin notes", () =>
    Effect.gen(function* () {
      const sections = yield* read(
        fixture("burroughs-sample/A30574-hosea-8-to-10-excerpt.xml"),
        "Hos",
        { ...BURROUGHS, firstChapter: 8 },
      )
      const altars = section(sections, "Hos.8.11-Hos.8.14")?.paragraphs.map(plain) ?? []
      expect(altars).toContain("And then, Ephraim hath made many Altars to sin.")
      expect(altars).toContainEqual(
        expect.stringMatching(/^God still remembers the first and the chief Actors in sin /),
      )
      expect(section(sections, "Hos.8.4-Hos.8.10")?.notes.map(plain)).toContain("Ieroboams sin.")
      expect(JSON.stringify(sections)).not.toContain("ſ")
    }),
  )
})
