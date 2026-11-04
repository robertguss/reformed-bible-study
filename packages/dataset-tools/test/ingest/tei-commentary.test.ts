import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "@effect/vitest"
import { BOOK_IDS, type BookId, type TextRun } from "@reformed-bible/core"
import { Effect } from "effect"
import { OWEN_LAYOUT } from "../../src/ingest/owen.ts"
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
        OWEN_LAYOUT,
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
