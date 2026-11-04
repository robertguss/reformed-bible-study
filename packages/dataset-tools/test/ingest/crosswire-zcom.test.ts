import { readFileSync } from "node:fs"
import { join } from "node:path"
import { deflateSync } from "node:zlib"
import { describe, expect, it } from "@effect/vitest"
import type { TextRun } from "@reformed-bible/core"
import { Effect } from "effect"
import kjv from "../../../../dataset/versification/kjv.json" with { type: "json" }
import { commentaryBookFromZCom, readZCom } from "../../src/ingest/crosswire-zcom.ts"

const fixture = (name: string): string =>
  readFileSync(join(import.meta.dirname, "../fixtures/calvin-romans-sample", `${name}.xml`), "utf8")

const plain = (runs: ReadonlyArray<TextRun>): string => runs.map((run) => run.text).join("")

/**
 * Slot labels of one testament in SWORD's KJV layout, written out independently of the code under
 * test: two testament heading slots, then per book a heading slot, and per chapter a heading slot
 * followed by its verses.
 */
const testamentSlots = (testament: "ot" | "nt"): ReadonlyArray<string> => {
  const all = Object.entries(kjv.books)
  const books = testament === "ot" ? all.slice(0, 39) : all.slice(39)
  const slots = ["", ""]
  for (const [book, chapters] of books) {
    slots.push(book)
    chapters.forEach((verses, c) => {
      slots.push(`${book}.${c + 1}`)
      for (let v = 1; v <= verses; v++) slots.push(`${book}.${c + 1}.${v}`)
    })
  }
  return slots
}

/** Text stored in a block. Each slot listed points at it; with no slots it is unindexed. */
interface Part {
  readonly text: string
  readonly slots?: ReadonlyArray<string>
}

/** Every verse slot of a chapter, for an entry that all of the chapter's slots link to. */
const chapterSlots = (book: string, chapter: number): ReadonlyArray<string> => {
  const verses = (kjv.books as Readonly<Record<string, ReadonlyArray<number>>>)[book]?.[chapter - 1]
  return Array.from({ length: verses ?? 0 }, (_, v) => `${book}.${chapter}.${v + 1}`)
}

/**
 * Builds the zCom files of one testament, one compressed block per inner list. Like the real
 * module, each slot stores its entry's size in 16 bits, so a longer entry's size wraps.
 */
const buildModule = (testament: "ot" | "nt", blocks: ReadonlyArray<ReadonlyArray<Part>>) => {
  const slots = testamentSlots(testament)
  const bzv = Buffer.alloc(slots.length * 10)
  const inflated = blocks.map((parts, block) => {
    let offset = 0
    const bytes = parts.map((part) => {
      const text = Buffer.from(part.text, "utf8")
      for (const label of part.slots ?? []) {
        const index = slots.indexOf(label)
        bzv.writeUInt32LE(block, index * 10)
        bzv.writeUInt32LE(offset, index * 10 + 4)
        bzv.writeUInt16LE(text.length % 65536, index * 10 + 8)
      }
      offset += text.length
      return text
    })
    return Buffer.concat(bytes)
  })
  const compressed = inflated.map((bytes) => deflateSync(bytes))
  const bzs = Buffer.alloc(blocks.length * 12)
  let offset = 0
  compressed.forEach((bytes, i) => {
    bzs.writeUInt32LE(offset, i * 12)
    bzs.writeUInt32LE(bytes.length, i * 12 + 4)
    bzs.writeUInt32LE(inflated[i]!.length, i * 12 + 8)
    offset += bytes.length
  })
  return { bzs, bzv, bzz: Buffer.concat(compressed) }
}

const start = (ref: string, id: string) =>
  `<div annotateRef="Bible:${ref}" annotateType="commentary" osisID="${ref}" sID="${id}" type="section"/>`
const end = (ref: string, id: string) =>
  `<div annotateRef="Bible:${ref}" annotateType="commentary" eID="${id}" osisID="${ref}" type="section"/>`
const section = (ref: string, id: string, body: string) =>
  `${start(ref, id)}<div sID="${id}p" type="x-p"/>${body}<div eID="${id}p" type="x-p"/>${end(ref, id)}`

const romans = [
  [{ text: fixture("Matt.1.2"), slots: ["Matt.1.2"] }],
  [
    { text: fixture("Rom.8.27"), slots: ["Rom.8.27"] },
    { text: fixture("Rom.8.28"), slots: ["Rom.8.28", "Rom.8.29"] },
    { text: fixture("Rom.8.31"), slots: ["Rom.8.31"] },
    { text: section("Rom.9.3", "r93", "For I could wish."), slots: ["Rom.9.3"] },
  ],
]

describe("CrossWire zCom commentary", () => {
  it("lays out slots as the real module does", () => {
    // In the real CalvinCommentaries module, Romans 8:28 sits at New Testament slot 5132.
    expect(testamentSlots("nt").indexOf("Rom.8.28")).toBe(5132)
    expect(testamentSlots("nt")).toHaveLength(8246)
    expect(testamentSlots("ot")).toHaveLength(24115)
  })

  it.effect(
    "decodes fixture blocks and ends the section at Romans 8:28 where the next starts",
    () =>
      Effect.gen(function* () {
        const entries = yield* readZCom("nt", buildModule("nt", romans))
        expect(entries.map((entry) => entry.slot)).toEqual([
          "Matt.1.2",
          "Rom.8.27",
          "Rom.8.28",
          "Rom.8.31",
          "Rom.9.3",
        ])
        expect(entries[2]?.text).toBe(fixture("Rom.8.28"))
        const { book, misplaced } = yield* commentaryBookFromZCom(
          "calvin-commentaries",
          "Rom",
          entries,
        )
        expect(misplaced).toEqual([])
        expect(book.resourceId).toBe("calvin-commentaries")
        expect(book.book).toBe("Rom")
        expect(book.sections.map((s) => s.ref).slice(0, 2)).toEqual([
          "Rom.8.27",
          "Rom.8.28-Rom.8.30",
        ])
        expect(book.sections[1]?.notes).toHaveLength(1)
      }),
  )

  it.effect("ends a chapter's last section at the chapter's last verse", () =>
    Effect.gen(function* () {
      const entries = yield* readZCom("nt", buildModule("nt", romans))
      const { book } = yield* commentaryBookFromZCom("calvin-commentaries", "Rom", entries)
      expect(book.sections.map((s) => s.ref).slice(2)).toEqual([
        "Rom.8.31-Rom.8.39",
        "Rom.9.3-Rom.9.33",
      ])
    }),
  )

  it.effect("skips sections outside the requested book", () =>
    Effect.gen(function* () {
      const entries = yield* readZCom("nt", buildModule("nt", romans))
      const { book } = yield* commentaryBookFromZCom("calvin-commentaries", "Rom", entries)
      const text = JSON.stringify(book)
      expect(text).not.toContain("Matt.")
      expect(text).not.toContain("Ishmael")
    }),
  )

  it.effect("reports a slot whose own verse reference disagrees with its position", () =>
    Effect.gen(function* () {
      const entries = yield* readZCom(
        "nt",
        buildModule("nt", [
          [
            { text: fixture("Rom.8.27"), slots: ["Rom.8.27"] },
            { text: fixture("Rom.8.28"), slots: ["Rom.8.29"] },
          ],
        ]),
      )
      const { book, misplaced } = yield* commentaryBookFromZCom(
        "calvin-commentaries",
        "Rom",
        entries,
      )
      expect(misplaced).toEqual([{ slot: "Rom.8.29", ref: "Rom.8.28" }])
      expect(book.sections.map((entry) => entry.ref)).toEqual(["Rom.8.27-Rom.8.39"])
    }),
  )

  it.effect("takes an entry's size past 65,535 bytes from where the next entry starts", () =>
    Effect.gen(function* () {
      const long = section(
        "Gen.1.1",
        "g1",
        `In the beginning. ${"Calvin writes at length. ".repeat(3000)}Here the comment closes.`,
      )
      expect(Buffer.byteLength(long)).toBeGreaterThan(65536)
      const copy = section("Gen.1.5", "g5", "On the first day.")
      const entries = yield* readZCom(
        "ot",
        buildModule("ot", [
          [
            { text: long, slots: ["Gen.1.1"] },
            { text: section("Gen.1.2", "g2", "Without form."), slots: ["Gen.1.2"] },
            // A second copy of a later entry that no slot points at, as the real module holds
            // for a few verses of the Harmony of the Law.
            { text: copy },
            { text: copy, slots: ["Gen.1.5"] },
          ],
        ]),
      )
      expect(entries.map((entry) => entry.text)).toEqual([
        long,
        section("Gen.1.2", "g2", "Without form."),
        copy,
      ])
      const { book, misplaced } = yield* commentaryBookFromZCom(
        "calvin-commentaries",
        "Gen",
        entries,
      )
      expect(misplaced).toEqual([])
      expect(book.sections.map((s) => s.ref)).toEqual([
        "Gen.1.1",
        "Gen.1.2-Gen.1.4",
        "Gen.1.5-Gen.1.31",
      ])
      expect(plain(book.sections[0]?.paragraphs[0] ?? [])).toMatch(/Here the comment closes\.$/)
    }),
  )

  describe("a chapter whose verse slots all link to one entry", () => {
    const psalms = buildModule("ot", [
      [
        {
          text: `${start("Ps.1", "c1")}<div sID="c1p" type="x-p"/>PSALM 1. The sum of the whole.<div eID="c1p" type="x-p"/>${section("Ps.1.1", "v1", "Blessed is the man.")}`,
          slots: chapterSlots("Ps", 1),
        },
        {
          text: ` Calvin's version of verse two. ${section("Ps.1.2", "v2", "His delight is in the law.")} ${section("Ps.1.4", "v4", "The ungodly are not so.")}${end("Ps.1", "c1")}`,
        },
        {
          text: `${start("Ps.2", "c2")}PSALM 2.${section("Ps.2.1", "w1", "Why do the heathen rage?")}${end("Ps.2", "c2")}`,
          slots: chapterSlots("Ps", 2),
        },
        {
          text: `${start("Ps.53", "c53")}This psalm being almost identical with the fourteenth.${end("Ps.53", "c53")}`,
          slots: chapterSlots("Ps", 53),
        },
      ],
    ])

    it.effect("yields every verse section found after the entry, each at its own verse", () =>
      Effect.gen(function* () {
        const entries = yield* readZCom("ot", psalms)
        expect(entries.map((entry) => entry.slot)).toEqual(["Ps.1.1", "Ps.2.1", "Ps.53.1"])
        const { book, misplaced } = yield* commentaryBookFromZCom(
          "calvin-commentaries",
          "Ps",
          entries,
        )
        expect(misplaced).toEqual([])
        expect(book.sections.map((s) => [s.ref, s.paragraphs.map(plain)])).toEqual([
          ["Ps.1.1", ["PSALM 1. The sum of the whole.", "Blessed is the man."]],
          ["Ps.1.2-Ps.1.3", ["His delight is in the law."]],
          ["Ps.1.4-Ps.1.6", ["The ungodly are not so."]],
          ["Ps.2.1-Ps.2.12", ["PSALM 2.", "Why do the heathen rage?"]],
          ["Ps.53.1-Ps.53.6", ["This psalm being almost identical with the fourteenth."]],
        ])
      }),
    )

    it.effect("places a section repeated at the start of the next block once", () =>
      Effect.gen(function* () {
        const intro = `${start("Ps.119", "c119")}PSALM 119.`
        const entries = yield* readZCom(
          "ot",
          buildModule("ot", [
            [
              {
                text: `${start("Ps.118", "c118")}${section("Ps.118.1", "a1", "O praise the Lord.")}`,
                slots: chapterSlots("Ps", 118),
              },
              {
                text: `${section("Ps.118.5", "a5", "I called upon the Lord.")}${end("Ps.118", "c118")}${intro}${section("Ps.119.1", "b1", "Blessed are the undefiled.")}${section("Ps.119.3", "b3", "They also do no iniquity.")}`,
              },
            ],
            [
              {
                text: `${intro}${section("Ps.119.1", "b1", "Blessed are the undefiled.")}${start("Ps.119", "vol5")}COMMENTARY ON THE BOOK OF PSALMS, VOLUME FIFTH${end("Ps.119", "vol5")}`,
                slots: chapterSlots("Ps", 119),
              },
              { text: section("Ps.119.121", "b121", "I have done judgment.") },
            ],
          ]),
        )
        const { book, misplaced } = yield* commentaryBookFromZCom(
          "calvin-commentaries",
          "Ps",
          entries,
        )
        expect(misplaced).toEqual([])
        expect(book.sections.map((s) => [s.ref, s.paragraphs.map(plain)])).toEqual([
          ["Ps.118.1-Ps.118.4", ["O praise the Lord."]],
          ["Ps.118.5-Ps.118.29", ["I called upon the Lord."]],
          ["Ps.119.1-Ps.119.2", ["PSALM 119.", "Blessed are the undefiled."]],
          ["Ps.119.3-Ps.119.120", ["They also do no iniquity."]],
          ["Ps.119.121-Ps.119.176", ["I have done judgment."]],
        ])
      }),
    )

    it.effect("reports a second, different section on a verse that already has one", () =>
      Effect.gen(function* () {
        const entries = yield* readZCom(
          "ot",
          buildModule("ot", [
            [
              {
                text: `${start("Ps.3", "c3")}${section("Ps.3.1", "d1", "Lord, how are they increased.")}`,
                slots: chapterSlots("Ps", 3),
              },
              { text: section("Ps.3.2", "d2", "Many there be.") },
              {
                text: `${start("Ps.4", "c4")}${section("Ps.4.1", "f1", "Hear me when I call.")}`,
                slots: chapterSlots("Ps", 4),
              },
              { text: section("Ps.3.2", "e2", "A different comment.") },
            ],
          ]),
        )
        const { book, misplaced } = yield* commentaryBookFromZCom(
          "calvin-commentaries",
          "Ps",
          entries,
        )
        expect(misplaced).toEqual([{ slot: "Ps.4.1", ref: "Ps.3.2" }])
        expect(book.sections.map((s) => [s.ref, s.paragraphs.map(plain)])).toEqual([
          ["Ps.3.1", ["Lord, how are they increased."]],
          ["Ps.3.2-Ps.3.8", ["Many there be."]],
          ["Ps.4.1-Ps.4.8", ["Hear me when I call."]],
        ])
      }),
    )
  })
})
