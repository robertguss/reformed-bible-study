import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "@effect/vitest"
import type { BookId, TextRun } from "@reformed-bible/core"
import { Effect } from "effect"
import { POOLE_LAYOUT } from "../../src/ingest/poole.ts"
import { readTeiCommentary } from "../../src/ingest/tei-commentary.ts"

const GENESIS = readFileSync(
  join(import.meta.dirname, "../fixtures/poole-sample/A55363-genesis-1-1-3.xml"),
  "utf8",
)

const plain = (runs: ReadonlyArray<TextRun>): string => runs.map((run) => run.text).join("")

const tei = (book: string, prolog = "") =>
  `${prolog}<TEI xmlns="http://www.tei-c.org/ns/1.0"><text><body><div type="book"><head>A BOOK.</head>${book}</div></body></text></TEI>`

const chapter = (n: number, ...paragraphs: ReadonlyArray<string>) =>
  `<div n="${n}" type="chapter"><head>CHAP.</head>${paragraphs.join("")}</div>`

const verse = (n: number, text: string) => `<p n="${n}">${n} ${text}</p>`

const read = (xml: string, book: BookId) =>
  Effect.gen(function* () {
    const [only] = yield* readTeiCommentary("poole-annotations", xml, [book], POOLE_LAYOUT)
    return only?.sections ?? []
  })

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
})
