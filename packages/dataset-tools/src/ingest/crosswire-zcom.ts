import { inflateSync } from "node:zlib"
import {
  BOOK_IDS,
  chapterCount,
  type CommentaryBook,
  toOsis,
  verseCount,
  type BookId,
  type CommentarySection,
  type VerseRef,
} from "@reformed-bible/core"
import { Effect, Schema } from "effect"
import { parseOsisEntry, type OsisTextError } from "./osis-text.ts"

export const ZComFailures = ["missing-file", "corrupt", "too-large", "misplaced-entries"] as const

export class ZComError extends Schema.TaggedError<ZComError, { readonly brand: unique symbol }>()(
  "ZComError",
  {
    reason: Schema.Literals(ZComFailures),
    detail: Schema.String,
  },
) {}

export type Testament = "ot" | "nt"

export interface ZComFiles {
  readonly bzs: Uint8Array
  readonly bzv: Uint8Array
  readonly bzz: Uint8Array
}

export interface ZComEntry {
  readonly book: BookId | undefined
  readonly chapter: number
  readonly verse: number
  readonly slot: string
  readonly text: string
}

export interface MisplacedEntry {
  readonly slot: string
  readonly ref: string | undefined
}

const SLOT_BYTES = 10
const BLOCK_BYTES = 12
const MAX_BLOCK_BYTES = 64 * 1024 * 1024
const OLD_TESTAMENT_BOOKS = 39

interface Slot {
  readonly book: BookId | undefined
  readonly chapter: number
  readonly verse: number
}

const testamentSlots = (testament: Testament): ReadonlyArray<Slot> => {
  const books =
    testament === "ot"
      ? BOOK_IDS.slice(0, OLD_TESTAMENT_BOOKS)
      : BOOK_IDS.slice(OLD_TESTAMENT_BOOKS)
  const slots: Array<Slot> = [
    { book: undefined, chapter: 0, verse: 0 },
    { book: undefined, chapter: 0, verse: 0 },
  ]
  for (const book of books) {
    slots.push({ book, chapter: 0, verse: 0 })
    for (let chapter = 1; chapter <= chapterCount(book); chapter++) {
      slots.push({ book, chapter, verse: 0 })
      for (let verse = 1; verse <= verseCount(book, chapter); verse++) {
        slots.push({ book, chapter, verse })
      }
    }
  }
  return slots
}

const slotLabel = ({ book, chapter, verse }: Slot): string => {
  if (book === undefined) return ""
  if (chapter === 0) return book
  if (verse === 0) return `${book}.${chapter}`
  return `${book}.${chapter}.${verse}`
}

const view = (bytes: Uint8Array) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)

const fail = (reason: ZComError["reason"], detail: string) =>
  Effect.fail(new ZComError({ reason, detail }))

/**
 * Reads every entry of one testament of a zCom module, decompressing its blocks with zlib. Slots
 * that point at the same text as the slot before them are links that extend one entry over
 * several verses, so each entry is returned once, at its first slot.
 */
export const readZCom = (
  testament: Testament,
  files: ZComFiles,
): Effect.Effect<ReadonlyArray<ZComEntry>, ZComError> =>
  Effect.gen(function* () {
    const slots = testamentSlots(testament)
    const slotCount = files.bzv.byteLength / SLOT_BYTES
    if (slotCount !== slots.length) {
      return yield* fail(
        "corrupt",
        `${testament}.bzv has ${slotCount} slots; KJV versification has ${slots.length}`,
      )
    }
    const blockIndex = view(files.bzs)
    const verseIndex = view(files.bzv)
    const blockCount = Math.floor(files.bzs.byteLength / BLOCK_BYTES)
    const blocks = new Map<number, Uint8Array>()
    const block = (n: number) =>
      Effect.gen(function* () {
        const cached = blocks.get(n)
        if (cached !== undefined) return cached
        if (n >= blockCount) return yield* fail("corrupt", `block ${n} is not in the block index`)
        const offset = blockIndex.getUint32(n * BLOCK_BYTES, true)
        const size = blockIndex.getUint32(n * BLOCK_BYTES + 4, true)
        const declared = blockIndex.getUint32(n * BLOCK_BYTES + 8, true)
        if (declared > MAX_BLOCK_BYTES)
          return yield* fail("too-large", `block ${n} declares ${declared} bytes`)
        const inflated = yield* Effect.try({
          try: () =>
            new Uint8Array(
              inflateSync(files.bzz.subarray(offset, offset + size), { maxOutputLength: declared }),
            ),
          catch: (error) =>
            new ZComError({ reason: "corrupt", detail: `block ${n}: ${String(error)}` }),
        })
        blocks.set(n, inflated)
        return inflated
      })

    const decoder = new TextDecoder("utf-8")
    const entries: Array<ZComEntry> = []
    let previous = ""
    for (let i = 0; i < slots.length; i++) {
      const at = i * SLOT_BYTES
      const blockNumber = verseIndex.getUint32(at, true)
      const offset = verseIndex.getUint32(at + 4, true)
      const size = verseIndex.getUint16(at + 8, true)
      if (size === 0) {
        previous = ""
        continue
      }
      const pointer = `${blockNumber}:${offset}:${size}`
      if (pointer === previous) continue
      previous = pointer
      const bytes = yield* block(blockNumber)
      if (offset + size > bytes.byteLength) {
        return yield* fail("corrupt", `slot ${i} reads past the end of block ${blockNumber}`)
      }
      const slot = slots[i] as Slot
      entries.push({
        ...slot,
        slot: slotLabel(slot),
        text: decoder.decode(bytes.subarray(offset, offset + size)),
      })
    }
    return entries
  })

const verseBefore = (ref: VerseRef): VerseRef =>
  ref.verse > 1
    ? { ...ref, verse: ref.verse - 1 }
    : { ...ref, chapter: ref.chapter - 1, verse: verseCount(ref.book, ref.chapter - 1) }

export const commentaryBookFromZCom = (
  resourceId: string,
  book: BookId,
  entries: ReadonlyArray<ZComEntry>,
): Effect.Effect<
  { readonly book: CommentaryBook; readonly misplaced: ReadonlyArray<MisplacedEntry> },
  OsisTextError
> =>
  Effect.gen(function* () {
    const placed: Array<{
      readonly start: VerseRef
      readonly section: Omit<CommentarySection, "ref">
    }> = []
    const misplaced: Array<MisplacedEntry> = []
    for (const entry of entries) {
      if (entry.book !== book) continue
      const parsed = yield* parseOsisEntry(entry.text)
      if (entry.verse === 0 || parsed.ref !== entry.slot) {
        misplaced.push({ slot: entry.slot, ref: parsed.ref })
        continue
      }
      placed.push({
        start: { book, chapter: entry.chapter, verse: entry.verse },
        section: { paragraphs: parsed.paragraphs, notes: parsed.notes },
      })
    }
    const lastChapter = chapterCount(book)
    const bookEnd: VerseRef = { book, chapter: lastChapter, verse: verseCount(book, lastChapter) }
    const sections = placed.map(({ start, section }, i) => {
      const next = placed[i + 1]
      const end = next === undefined ? bookEnd : verseBefore(next.start)
      return { ref: toOsis({ start, end }), ...section }
    })
    return { book: { resourceId, book, sections }, misplaced }
  })
