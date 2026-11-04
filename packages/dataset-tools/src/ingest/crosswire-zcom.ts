import { inflateSync } from "node:zlib"
import {
  BOOK_IDS,
  chapterCount,
  type CommentaryBook,
  compareVerse,
  parseReference,
  type Passage,
  toOsis,
  verseCount,
  type BookId,
  type CommentarySection,
  type VerseRef,
} from "@reformed-bible/core"
import { Effect, Result, Schema } from "effect"
import {
  type ChapterStart,
  parseOsisEntry,
  parseOsisText,
  type OsisTextError,
} from "./osis-text.ts"

export const ZComFailures = ["missing-file", "corrupt", "too-large", "misplaced-entries"] as const

export class ZComError extends Schema.TaggedError<ZComError, { readonly brand: unique symbol }>()(
  "ZComError",
  {
    reason: Schema.Literals(ZComFailures),
    detail: Schema.String,
  },
) {}

export type Testament = "ot" | "nt"

/**
 * The module's driver, as its `.conf` names it in `ModDrv`. A zCom slot is 10 bytes with a 16-bit
 * entry size; a zCom4 slot is 12 bytes with a 32-bit size.
 */
export type ZComDriver = "zCom" | "zCom4"

export interface ZComFiles {
  readonly bzs: Uint8Array
  readonly bzv: Uint8Array
  readonly bzz: Uint8Array
}

/** The three files of one testament of a module, from the unzipped files under `moduleDir`. */
export const testamentFiles = (
  files: Readonly<Record<string, Uint8Array>>,
  moduleDir: string,
  testament: Testament,
) =>
  Effect.gen(function* () {
    const read = (ext: string) => {
      const path = `${moduleDir}/${testament}.${ext}`
      const bytes = files[path]
      return bytes === undefined
        ? Effect.fail(new ZComError({ reason: "missing-file", detail: path }))
        : Effect.succeed(bytes)
    }
    const module: ZComFiles = {
      bzs: yield* read("bzs"),
      bzv: yield* read("bzv"),
      bzz: yield* read("bzz"),
    }
    return module
  })

export interface ZComEntry {
  readonly book: BookId | undefined
  readonly chapter: number
  readonly verse: number
  readonly slot: string
  /** Where the entry's text sits in the module: the block, and the byte offset within it. */
  readonly block: number
  readonly offset: number
  readonly text: string
}

export interface MisplacedEntry {
  readonly slot: string
  readonly ref: string | undefined
}

const SLOT_BYTES: Readonly<Record<ZComDriver, number>> = { zCom: 10, zCom4: 12 }
const BLOCK_BYTES = 12
const MAX_BLOCK_BYTES = 64 * 1024 * 1024
const OLD_TESTAMENT_BOOKS = 39
const WRAP_BYTES = 65536

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
 * Reads every entry of one testament of a zCom or zCom4 module, decompressing its blocks with
 * zlib. Slots that point at the same text as the slot before them are links that extend one entry
 * over several verses, so each entry is returned once, at its first slot.
 *
 * A zCom slot stores its entry's size in 16 bits, so a longer entry's stated size has wrapped. Its
 * true size is the stated size plus as many whole 65,536 bytes as fit before the next indexed
 * entry in the block, or the block's end. An entry that several slots link to reads all the way
 * there, in either driver: in Calvin's chapters where every verse links to one entry, the other
 * verse sections follow it unindexed, as do the comments on the later verses of a link in
 * Jamieson-Fausset-Brown.
 */
export const readZCom = (
  testament: Testament,
  files: ZComFiles,
  driver: ZComDriver = "zCom",
): Effect.Effect<ReadonlyArray<ZComEntry>, ZComError> =>
  Effect.gen(function* () {
    const slots = testamentSlots(testament)
    const slotBytes = SLOT_BYTES[driver]
    const slotCount = files.bzv.byteLength / slotBytes
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

    const indexed: Array<{
      readonly slot: number
      readonly block: number
      readonly offset: number
      readonly size: number
      linked: boolean
    }> = []
    const offsets = new Map<number, Array<number>>()
    let previous: (typeof indexed)[number] | undefined
    for (let i = 0; i < slots.length; i++) {
      const at = i * slotBytes
      const blockNumber = verseIndex.getUint32(at, true)
      const offset = verseIndex.getUint32(at + 4, true)
      const size =
        driver === "zCom4" ? verseIndex.getUint32(at + 8, true) : verseIndex.getUint16(at + 8, true)
      if (size === 0) {
        previous = undefined
        continue
      }
      if (previous?.block === blockNumber && previous.offset === offset) {
        previous.linked = true
        continue
      }
      previous = { slot: i, block: blockNumber, offset, size, linked: false }
      indexed.push(previous)
      const inBlock = offsets.get(blockNumber)
      if (inBlock === undefined) offsets.set(blockNumber, [offset])
      else inBlock.push(offset)
    }
    for (const inBlock of offsets.values()) inBlock.sort((a, b) => a - b)

    const decoder = new TextDecoder("utf-8")
    const entries: Array<ZComEntry> = []
    for (const { slot: i, block: blockNumber, offset, size, linked } of indexed) {
      const bytes = yield* block(blockNumber)
      if (offset + size > bytes.byteLength) {
        return yield* fail("corrupt", `slot ${i} reads past the end of block ${blockNumber}`)
      }
      const next = offsets.get(blockNumber)?.find((o) => o > offset) ?? bytes.byteLength
      const room = next - offset - size
      const end =
        linked && room >= 0
          ? next
          : room < 0 || driver === "zCom4"
            ? offset + size
            : next - (room % WRAP_BYTES)
      const slot = slots[i] as Slot
      entries.push({
        ...slot,
        slot: slotLabel(slot),
        block: blockNumber,
        offset,
        text: decoder.decode(bytes.subarray(offset, end)),
      })
    }
    return entries
  })

/** A chapter (`Ps.1`) or verse (`Ps.1.1`) reference inside `book`, or undefined for anything else. */
const parseRef = (
  book: BookId,
  ref: string | undefined,
): { readonly chapter: number; readonly verse: number | undefined } | undefined => {
  const match = ref?.match(/^([^.]+)\.(\d+)(?:\.(\d+))?$/)
  if (match === null || match === undefined || match[1] !== book) return undefined
  const chapter = Number(match[2])
  if (chapter < 1 || chapter > chapterCount(book)) return undefined
  if (match[3] === undefined) return { chapter, verse: undefined }
  const verse = Number(match[3])
  return verse >= 1 && verse <= verseCount(book, chapter) ? { chapter, verse } : undefined
}

/**
 * The pericope heading each section of a harmony's entries, keyed by the entry's slot and listed in
 * the entry's section order. A section with no heading before it has an empty list.
 */
export type HarmonyPericopes = ReadonlyMap<string, ReadonlyArray<ReadonlyArray<Passage>>>

/**
 * Reads the pericope headings of a harmony, such as Calvin's Harmony of the Gospels, in the
 * module's reading order: by block, then by offset within the block, across all of the harmony's
 * books, since one pericope's comments are filed under whichever book each heads. A pericope is
 * headed by the tables that come before its first comment, with no comment between them; the
 * first row of each names one passage per cell. Those passages head every comment from there up
 * to the next heading. Only passages within the harmony's books are kept, so a cell citing another
 * book, or one that does not read as a reference, adds nothing.
 */
export const harmonyPericopes = (
  entries: ReadonlyArray<ZComEntry>,
  books: ReadonlyArray<BookId>,
): Effect.Effect<HarmonyPericopes, OsisTextError> =>
  Effect.gen(function* () {
    const inHarmony = new Set(books)
    const within = (p: Passage) => inHarmony.has(p.start.book) && p.end.book === p.start.book
    const passagesOf = (row: ReadonlyArray<string>): ReadonlyArray<Passage> =>
      row.flatMap((cell) => {
        const parsed = parseReference(cell)
        return Result.isSuccess(parsed) ? parsed.success.filter(within) : []
      })
    const ordered = entries
      .filter((entry) => entry.book !== undefined && inHarmony.has(entry.book))
      .sort((a, b) => a.block - b.block || a.offset - b.offset)
    const pericopes = new Map<string, ReadonlyArray<ReadonlyArray<Passage>>>()
    let heading: ReadonlyArray<Passage> = []
    let headingOpen = false
    for (const entry of ordered) {
      const { sections, tables } = yield* parseOsisEntry(entry.text)
      const headings: Array<ReadonlyArray<Passage>> = []
      for (let i = 0; i <= sections.length; i++) {
        for (const table of tables) {
          if (table.sectionsBefore !== i) continue
          const passages = passagesOf(table.firstRow)
          heading = headingOpen ? [...heading, ...passages] : passages
          headingOpen = true
        }
        if (i === sections.length) break
        headings.push(heading)
        headingOpen = false
      }
      pericopes.set(entry.slot, headings)
    }
    return pericopes
  })

type Body = Omit<CommentarySection, "ref" | "parallels">

interface Placed {
  readonly start: VerseRef
  readonly section: Body
  readonly pericope: ReadonlyArray<Passage>
}

/**
 * A section's range and parallels: it ends before the next section in its book, at the end of its
 * chapter, or at the end of its pericope's passage in its own book, whichever comes first. Its
 * parallels are its pericope's passages in other books.
 */
const rangeOf = (
  book: BookId,
  { start, pericope }: Placed,
  next: Placed | undefined,
): Pick<CommentarySection, "ref" | "parallels"> => {
  let end: VerseRef = {
    book,
    chapter: start.chapter,
    verse:
      next === undefined || next.start.chapter !== start.chapter
        ? verseCount(book, start.chapter)
        : next.start.verse - 1,
  }
  const own = pericope.find(
    (p) =>
      p.start.book === book && compareVerse(p.start, start) <= 0 && compareVerse(start, p.end) <= 0,
  )
  if (own !== undefined && compareVerse(own.end, end) < 0) end = own.end
  const parallels = [
    ...new Set(pericope.filter((p) => p.start.book !== book).map((p) => toOsis(p))),
  ]
  const ref = toOsis({ start, end })
  return parallels.length === 0 ? { ref } : { ref, parallels }
}

interface VerseEntry {
  readonly entry: ZComEntry
  readonly opening: boolean
  /** The module slots whose texts make up the entry's text, in order. */
  readonly sources: ReadonlyArray<string>
}

/**
 * The book's verse entries in slot order, each with whether it opens its chapter. The entry in a
 * chapter's own slot, such as a chapter introduction, is read as the start of the chapter's first
 * verse entry, or stands at the chapter's first verse when the chapter has none. The book's own
 * slot holds its introduction, which is left out.
 */
const verseEntries = (
  book: BookId,
  entries: ReadonlyArray<ZComEntry>,
): ReadonlyArray<VerseEntry> => {
  const read: Array<VerseEntry> = []
  let chapterSlot: ZComEntry | undefined
  let chapter = 0
  const standAlone = () => {
    if (chapterSlot === undefined) return
    const slot = `${book}.${chapterSlot.chapter}.1`
    read.push({
      entry: { ...chapterSlot, verse: 1, slot },
      opening: true,
      sources: [chapterSlot.slot],
    })
    chapterSlot = undefined
  }
  for (const entry of entries) {
    if (entry.book !== book || entry.chapter === 0) continue
    if (entry.verse === 0) {
      standAlone()
      chapterSlot = entry
      continue
    }
    const opening = entry.chapter !== chapter
    chapter = entry.chapter
    if (chapterSlot?.chapter === entry.chapter) {
      read.push({
        entry: { ...entry, text: chapterSlot.text + entry.text },
        opening,
        sources: [chapterSlot.slot, entry.slot],
      })
      chapterSlot = undefined
    } else {
      standAlone()
      read.push({ entry, opening, sources: [entry.slot] })
    }
  }
  standAlone()
  return read
}

/**
 * Builds one book's commentary from its zCom entries. A section ends before the next section in
 * its book or at the end of its own chapter, whichever comes first.
 *
 * An entry with no section markers, as in Henry's and Jamieson-Fausset-Brown's modules, is one
 * section at its slot's verse, read as `parseOsisText` reads it, with `chapterStart` saying where
 * a chapter's own text starts. The entry that opens a chapter starts at the chapter's first verse:
 * it carries the chapter's introduction or heading, and in a few chapters Henry's comment on the
 * first verse opens the entry of the second.
 *
 * Otherwise every section in an entry is placed at its own verse. A chapter-level section (`Ps.1`)
 * opens the chapter's first verse section in the same entry, or stands at the chapter's first verse
 * when the entry has none; once the chapter's verse sections have begun, a later one is front
 * matter and is left out. With the pericopes of the book's harmony, a section headed by one also
 * ends with its pericope's passage in this book, and lists the pericope's passages in the other
 * books as its parallels.
 *
 * An entry whose first section is not the verse of its slot is reported as misplaced and left out,
 * as is a section outside the book, or a second, different section on a verse that already has one.
 * A section repeated word for word, as at the start of a block, is placed once.
 */
export const commentaryBookFromZCom = (
  resourceId: string,
  book: BookId,
  entries: ReadonlyArray<ZComEntry>,
  pericopes: HarmonyPericopes = new Map(),
  chapterStart: ChapterStart = "introduction",
): Effect.Effect<
  { readonly book: CommentaryBook; readonly misplaced: ReadonlyArray<MisplacedEntry> },
  OsisTextError
> =>
  Effect.gen(function* () {
    const placed = new Map<string, Placed>()
    const misplaced: Array<MisplacedEntry> = []
    for (const { entry, opening: opensChapter, sources } of verseEntries(book, entries)) {
      const { sections: parsed } = yield* parseOsisEntry(entry.text)
      if (parsed.length === 0) {
        const section = yield* parseOsisText(entry.text, opensChapter ? chapterStart : undefined)
        const verse = opensChapter ? 1 : entry.verse
        const key = `${entry.chapter}.${verse}`
        if (section.paragraphs.length === 0 && section.notes.length === 0) continue
        if (placed.has(key)) misplaced.push({ slot: entry.slot, ref: entry.slot })
        else
          placed.set(key, {
            start: { book, chapter: entry.chapter, verse },
            section,
            pericope: [],
          })
        continue
      }
      const headings = sources.flatMap((slot) => pericopes.get(slot) ?? [])
      const found: Array<Placed & { readonly ref: string }> = []
      const strays: Array<MisplacedEntry> = []
      const begun = new Set<number>()
      let intro:
        | {
            readonly ref: string
            readonly chapter: number
            readonly section: Body
            readonly pericope: ReadonlyArray<Passage>
          }
        | undefined
      const standIntro = () => {
        if (intro === undefined) return
        const start = { book, chapter: intro.chapter, verse: 1 }
        found.push({ ref: intro.ref, start, section: intro.section, pericope: intro.pericope })
        intro = undefined
      }
      for (const [i, { ref, paragraphs, notes }] of parsed.entries()) {
        const pericope = headings[i] ?? []
        const at = parseRef(book, ref)
        if (ref === undefined || at === undefined) {
          strays.push({ slot: entry.slot, ref })
          continue
        }
        const section = { paragraphs, notes }
        if (at.verse === undefined) {
          standIntro()
          if (!begun.has(at.chapter)) intro = { ref, chapter: at.chapter, section, pericope }
          continue
        }
        if (intro?.chapter !== at.chapter) standIntro()
        const opening = intro?.section
        intro = undefined
        begun.add(at.chapter)
        found.push({
          ref,
          start: { book, chapter: at.chapter, verse: at.verse },
          section:
            opening === undefined
              ? section
              : {
                  paragraphs: [...opening.paragraphs, ...section.paragraphs],
                  notes: [...opening.notes, ...section.notes],
                },
          pericope,
        })
      }
      standIntro()
      const first = found[0]
      if (
        first === undefined ||
        first.start.chapter !== entry.chapter ||
        first.start.verse !== entry.verse
      ) {
        misplaced.push({ slot: entry.slot, ref: first?.ref ?? parsed[0]?.ref })
        continue
      }
      misplaced.push(...strays)
      for (const { ref, ...at } of found) {
        const { start, section } = at
        const key = `${start.chapter}.${start.verse}`
        const already = placed.get(key)
        if (already === undefined) placed.set(key, at)
        else if (JSON.stringify(already.section) !== JSON.stringify(section))
          misplaced.push({ slot: entry.slot, ref })
      }
    }
    const ordered = [...placed.values()].sort((a, b) => compareVerse(a.start, b.start))
    const sections = ordered.map((at, i) => ({
      ...rangeOf(book, at, ordered[i + 1]),
      ...at.section,
    }))
    return { book: { resourceId, book, sections }, misplaced }
  })
