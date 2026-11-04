import { deflateSync } from "node:zlib"
import kjv from "../../../../dataset/versification/kjv.json" with { type: "json" }

/**
 * Slot labels of one testament in SWORD's KJV layout, written out independently of the code under
 * test: two testament heading slots, then per book a heading slot, and per chapter a heading slot
 * followed by its verses.
 */
export const testamentSlots = (testament: "ot" | "nt"): ReadonlyArray<string> => {
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
export interface Part {
  readonly text: string
  readonly slots?: ReadonlyArray<string>
}

/** Every verse slot of a chapter, for an entry that all of the chapter's slots link to. */
export const chapterSlots = (book: string, chapter: number): ReadonlyArray<string> => {
  const verses = (kjv.books as Readonly<Record<string, ReadonlyArray<number>>>)[book]?.[chapter - 1]
  return Array.from({ length: verses ?? 0 }, (_, v) => `${book}.${chapter}.${v + 1}`)
}

/**
 * Builds the zCom files of one testament, one compressed block per inner list. Like the real
 * module, each slot stores its entry's size in 16 bits, so a longer entry's size wraps.
 */
export const buildModule = (testament: "ot" | "nt", blocks: ReadonlyArray<ReadonlyArray<Part>>) => {
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

export const start = (ref: string, id: string) =>
  `<div annotateRef="Bible:${ref}" annotateType="commentary" osisID="${ref}" sID="${id}" type="section"/>`
export const end = (ref: string, id: string) =>
  `<div annotateRef="Bible:${ref}" annotateType="commentary" eID="${id}" osisID="${ref}" type="section"/>`
export const section = (ref: string, id: string, body: string) =>
  `${start(ref, id)}<div sID="${id}p" type="x-p"/>${body}<div eID="${id}p" type="x-p"/>${end(ref, id)}`
