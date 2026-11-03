import { readFileSync } from "node:fs"
import { join } from "node:path"
import { deflateSync } from "node:zlib"
import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import kjv from "../../../../dataset/versification/kjv.json" with { type: "json" }
import { commentaryBookFromZCom, readZCom } from "../../src/ingest/crosswire-zcom.ts"

const fixture = (name: string): string =>
  readFileSync(join(import.meta.dirname, "../fixtures/calvin-romans-sample", `${name}.xml`), "utf8")

/**
 * New Testament slot labels in SWORD's KJV layout, written out independently of the code under
 * test: two testament heading slots, then per book a heading slot, and per chapter a heading slot
 * followed by its verses.
 */
const ntSlots = (): ReadonlyArray<string> => {
  const books = Object.entries(kjv.books).slice(39)
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

/** Builds New Testament zCom files with one compressed block per book. `link:X` points a slot at X's entry. */
const buildNt = (entries: Readonly<Record<string, string>>) => {
  const slots = ntSlots()
  const bzv = Buffer.alloc(slots.length * 10)
  const blocks: Array<{ book: string; parts: Array<Buffer>; size: number }> = []
  const where = new Map<string, { block: number; offset: number; size: number }>()
  for (const [label, text] of Object.entries(entries)) {
    if (text.startsWith("link:")) continue
    const book = label.split(".")[0] ?? ""
    let block = blocks.findIndex((b) => b.book === book)
    if (block === -1) block = blocks.push({ book, parts: [], size: 0 }) - 1
    const target = blocks[block]!
    const bytes = Buffer.from(text, "utf8")
    where.set(label, { block, offset: target.size, size: bytes.length })
    target.parts.push(bytes)
    target.size += bytes.length
  }
  for (const [label, text] of Object.entries(entries)) {
    const at = where.get(text.startsWith("link:") ? text.slice(5) : label)!
    const index = slots.indexOf(label)
    bzv.writeUInt32LE(at.block, index * 10)
    bzv.writeUInt32LE(at.offset, index * 10 + 4)
    bzv.writeUInt16LE(at.size, index * 10 + 8)
  }
  const compressed = blocks.map((b) => deflateSync(Buffer.concat(b.parts)))
  const bzs = Buffer.alloc(blocks.length * 12)
  let offset = 0
  compressed.forEach((bytes, i) => {
    bzs.writeUInt32LE(offset, i * 12)
    bzs.writeUInt32LE(bytes.length, i * 12 + 4)
    bzs.writeUInt32LE(blocks[i]!.size, i * 12 + 8)
    offset += bytes.length
  })
  return { bzs, bzv, bzz: Buffer.concat(compressed) }
}

const sample = {
  "Matt.1.2": fixture("Matt.1.2"),
  "Rom.8.27": fixture("Rom.8.27"),
  "Rom.8.28": fixture("Rom.8.28"),
  "Rom.8.29": "link:Rom.8.28",
  "Rom.8.31": fixture("Rom.8.31"),
}

describe("CrossWire zCom commentary", () => {
  it("lays out slots as the real module does", () => {
    // In the real CalvinCommentaries module, Romans 8:28 sits at New Testament slot 5132.
    expect(ntSlots().indexOf("Rom.8.28")).toBe(5132)
    expect(ntSlots()).toHaveLength(8246)
  })

  it.effect(
    "decodes fixture blocks and ends the section at Romans 8:28 where the next starts",
    () =>
      Effect.gen(function* () {
        const entries = yield* readZCom("nt", buildNt(sample))
        expect(entries.map((entry) => entry.slot)).toEqual([
          "Matt.1.2",
          "Rom.8.27",
          "Rom.8.28",
          "Rom.8.31",
        ])
        expect(entries[2]?.text).toBe(sample["Rom.8.28"])
        const { book, misplaced } = yield* commentaryBookFromZCom(
          "calvin-commentaries",
          "Rom",
          entries,
        )
        expect(misplaced).toEqual([])
        expect(book.resourceId).toBe("calvin-commentaries")
        expect(book.book).toBe("Rom")
        expect(book.sections.map((section) => section.ref)).toEqual([
          "Rom.8.27",
          "Rom.8.28-Rom.8.30",
          "Rom.8.31-Rom.16.27",
        ])
        expect(book.sections[1]?.notes).toHaveLength(1)
      }),
  )

  it.effect("skips sections outside the requested book", () =>
    Effect.gen(function* () {
      const entries = yield* readZCom("nt", buildNt(sample))
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
        buildNt({ "Rom.8.27": fixture("Rom.8.27"), "Rom.8.29": fixture("Rom.8.28") }),
      )
      const { book, misplaced } = yield* commentaryBookFromZCom(
        "calvin-commentaries",
        "Rom",
        entries,
      )
      expect(misplaced).toEqual([{ slot: "Rom.8.29", ref: "Rom.8.28" }])
      expect(book.sections.map((section) => section.ref)).toEqual(["Rom.8.27-Rom.16.27"])
    }),
  )
})
