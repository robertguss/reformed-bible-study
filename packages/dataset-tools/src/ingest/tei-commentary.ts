import {
  chapterCount,
  toOsis,
  verseCount,
  type BookId,
  type CommentaryBook,
  type CommentarySection,
  type TextRun,
} from "@reformed-bible/core"
import { Effect, Schema } from "effect"
import { XMLParser } from "fast-xml-parser"

export class TeiCommentaryError extends Schema.TaggedError<
  TeiCommentaryError,
  { readonly brand: unique symbol }
>()("TeiCommentaryError", {
  detail: Schema.String,
}) {}

/** Which TEI divisions hold a book and which hold a chapter, by their `type` attribute. */
export interface TeiCommentaryLayout {
  readonly bookDivisions: ReadonlySet<string>
  readonly chapterDivisions: ReadonlySet<string>
}

// Entities stay unprocessed, so nothing a document type definition declares is ever expanded.
const parser = new XMLParser({
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: false,
  processEntities: false,
  htmlEntities: false,
  ignoreDeclaration: true,
  ignorePiTags: true,
})

const PREDEFINED: Readonly<Record<string, string>> = {
  lt: "<",
  gt: ">",
  amp: "&",
  quot: '"',
  apos: "'",
}

const decodeEntities = (text: string): string =>
  text.replace(/&(lt|gt|amp|quot|apos|#\d+|#x[0-9a-fA-F]+);/g, (whole, name: string) => {
    if (!name.startsWith("#")) return PREDEFINED[name] ?? whole
    const code = name.startsWith("#x") ? Number.parseInt(name.slice(2), 16) : Number(name.slice(1))
    return code <= 0x10ffff ? String.fromCodePoint(code) : whole
  })

type XmlNode = Readonly<Record<string, unknown>>

const ATTRIBUTES = ":@"
const TEXT = "#text"

const elementName = (node: XmlNode): string | undefined =>
  Object.keys(node).find((key) => key !== ATTRIBUTES && key !== TEXT)

const childrenOf = (node: XmlNode): ReadonlyArray<XmlNode> => {
  const name = elementName(node)
  return name === undefined ? [] : ((node[name] ?? []) as ReadonlyArray<XmlNode>)
}

const attribute = (node: XmlNode, name: string): string | undefined => {
  const attributes = node[ATTRIBUTES] as Readonly<Record<string, unknown>> | undefined
  const value = attributes?.[name]
  return typeof value === "string" ? value : undefined
}

const textOf = (nodes: ReadonlyArray<XmlNode>): string =>
  nodes
    .map((node) => {
      const text = node[TEXT]
      return typeof text === "string" ? decodeEntities(text) : textOf(childrenOf(node))
    })
    .join("")

const descendants = (nodes: ReadonlyArray<XmlNode>, name: string): ReadonlyArray<XmlNode> =>
  nodes.flatMap((node) => [
    ...(elementName(node) === name ? [node] : []),
    ...descendants(childrenOf(node), name),
  ])

/** Builds one paragraph of runs, collapsing whitespace and merging runs of the same emphasis. */
class Runs {
  private readonly runs: Array<TextRun> = []

  add(text: string, emphasis: boolean): void {
    const last = this.runs.at(-1)
    let collapsed = text.replace(/\s+/g, " ")
    if (last === undefined || last.text.endsWith(" ")) collapsed = collapsed.trimStart()
    if (collapsed === "") return
    if (last !== undefined && (last.emphasis === true) === emphasis) {
      this.runs[this.runs.length - 1] = { ...last, text: last.text + collapsed }
    } else {
      this.runs.push(emphasis ? { text: collapsed, emphasis: true } : { text: collapsed })
    }
  }

  done(): Array<TextRun> {
    const last = this.runs.at(-1)
    if (last !== undefined) this.runs[this.runs.length - 1] = { ...last, text: last.text.trimEnd() }
    return this.runs.filter((run) => run.text !== "")
  }
}

/** A block's printed text, the annotations keyed to it, its marginal notes, and whether it reports missing pages. */
interface Piece {
  readonly paragraphs: ReadonlyArray<ReadonlyArray<TextRun>>
  readonly notes: ReadonlyArray<ReadonlyArray<TextRun>>
  readonly missing: boolean
}

const LINE_BREAK_GLYPHS = new Set(["char:EOLhyphen", "char:EOLunhyphen"])

/**
 * Reads one block's mixed content. A note leaves its sign in the text, as `(a)`, and its own text
 * becomes an annotation paragraph, or a marginal note when it sat in the margin. A gap is kept as the
 * mark that describes it, such as `〈◊〉` for an illegible word. A line-end hyphen is closed up.
 */
const pieceOf = (nodes: ReadonlyArray<XmlNode>): Piece => {
  const main = new Runs()
  const annotations: Array<ReadonlyArray<TextRun>> = []
  const margins: Array<ReadonlyArray<TextRun>> = []
  let missing = false

  const walk = (
    into: Runs,
    children: ReadonlyArray<XmlNode>,
    emphasis: boolean,
    inNote: boolean,
  ) => {
    for (const node of children) {
      const text = node[TEXT]
      if (typeof text === "string") {
        into.add(decodeEntities(text), emphasis)
        continue
      }
      const name = elementName(node)
      const inner = childrenOf(node)
      if (name === undefined || name === "pb" || name === "figure") continue
      if (name === "note" && !inNote) {
        const sign = attribute(node, "n")
        const note = new Runs()
        if (sign !== undefined) {
          into.add(` (${sign})`, false)
          note.add(`(${sign}) `, false)
        }
        walk(note, inner, false, true)
        const runs = note.done()
        if (runs.length > 0)
          (attribute(node, "place") === "margin" ? margins : annotations).push(runs)
      } else if (name === "gap") {
        if (attribute(node, "reason") === "missing") missing = true
        const mark = textOf(descendants(inner, "desc")).replace(/\s+/g, " ").trim()
        into.add(mark === "" ? "〈…〉" : mark, emphasis)
      } else if (name === "g" && LINE_BREAK_GLYPHS.has(attribute(node, "ref") ?? "")) continue
      else if (name === "expan" && descendants(inner, "ex").length > 0) {
        into.add(textOf(descendants(inner, "ex")).trim(), emphasis)
      } else if (name === "lb" || name === "p" || name === "item") {
        into.add(" ", emphasis)
        walk(into, inner, emphasis, inNote)
      } else walk(into, inner, emphasis || name === "hi", inNote)
    }
  }

  walk(main, nodes, false, false)
  const text = main.done()
  return {
    paragraphs: [...(text.length > 0 ? [text] : []), ...annotations],
    notes: margins,
    missing,
  }
}

/** What one child of a chapter contributes: a verse paragraph, or text that opens or continues one. */
type Item =
  | { readonly kind: "verse"; readonly marker: number | undefined; readonly piece: Piece }
  | { readonly kind: "lead"; readonly piece: Piece }
  | { readonly kind: "trail"; readonly piece: Piece }

const marker = (node: XmlNode): number | undefined => {
  const n = attribute(node, "n")
  return n !== undefined && /^\d+$/.test(n) ? Number(n) : undefined
}

/** Each paragraph, heading or other block inside a container such as an argument, as pieces in order. */
const piecesOf = (nodes: ReadonlyArray<XmlNode>): ReadonlyArray<Piece> =>
  nodes.flatMap((node) => {
    const name = elementName(node)
    if (name === undefined || name === "pb") return []
    if (name === "div" || name === "argument") return piecesOf(childrenOf(node))
    if (name === "head" || name === "p") return [pieceOf(childrenOf(node))]
    return [pieceOf([node])]
  })

/**
 * The items of a chapter, in order. The chapter's own heading, such as `CHAP. I.`, is left out. Other
 * headings and arguments open the verse after them; anything else that is not a paragraph, such as
 * a page gap or a closing doxology, continues the verse before it.
 */
const chapterItems = (nodes: ReadonlyArray<XmlNode>): ReadonlyArray<Item> => {
  const items: Array<Item> = []
  let label = true
  const visit = (children: ReadonlyArray<XmlNode>) => {
    for (const node of children) {
      const name = elementName(node)
      if (name === undefined) {
        if (textOf([node]).trim() !== "") items.push({ kind: "trail", piece: pieceOf([node]) })
        continue
      }
      if (name === "pb") continue
      const first = label
      label = false
      if (name === "head" && first) continue
      if (name === "p") {
        items.push({ kind: "verse", marker: marker(node), piece: pieceOf(childrenOf(node)) })
      } else if (name === "head") items.push({ kind: "lead", piece: pieceOf(childrenOf(node)) })
      else if (name === "argument") {
        for (const piece of piecesOf(childrenOf(node))) items.push({ kind: "lead", piece })
      } else if (name === "div") visit(childrenOf(node))
      else items.push({ kind: "trail", piece: pieceOf([node]) })
    }
  }
  visit(nodes)
  return items
}

/**
 * Numbers a run of markers from 1 to `max`. A marker is trusted when it follows the marker before it
 * or precedes the marker after it, so one misprinted number between two good ones is caught. The
 * untrusted markers between two trusted ones take the numbers between them when exactly that many
 * are free; otherwise each keeps its own number if it still fits in order, or gets none.
 */
const numberMarkers = (
  markers: ReadonlyArray<number | undefined>,
  max: number,
): ReadonlyArray<number | undefined> => {
  const valid = (m: number | undefined): m is number => m !== undefined && m >= 1 && m <= max
  const trusted = markers.map((m, i) => {
    if (!valid(m)) return false
    const before = i === 0 ? 0 : markers[i - 1]
    const after = i === markers.length - 1 ? max + 1 : markers[i + 1]
    return before === m - 1 || after === m + 1
  })
  const numbers: Array<number | undefined> = markers.map((m, i) => (trusted[i] ? m : undefined))
  let i = 0
  while (i < markers.length) {
    if (trusted[i]) {
      i++
      continue
    }
    let end = i
    while (end < markers.length && !trusted[end]) end++
    const from = (i === 0 ? undefined : numbers[i - 1]) ?? 0
    const to = (end === markers.length ? undefined : numbers[end]) ?? max + 1
    if (to - from - 1 === end - i) {
      for (let k = i; k < end; k++) numbers[k] = from + 1 + (k - i)
    } else {
      let last = from
      for (let k = i; k < end; k++) {
        const m = markers[k]
        if (m !== undefined && m > last && m < to) {
          numbers[k] = m
          last = m
        }
      }
    }
    i = end
  }
  return numbers
}

interface ChapterItems {
  readonly chapter: number
  readonly intro: ReadonlyArray<Piece>
  readonly items: ReadonlyArray<Item>
}

/**
 * Where pages are missing, the chapter heading that followed them can be lost with them, so the
 * next chapter's verses run on inside this one. A verse number past the chapter's end, after a
 * missing-pages gap, starts the following chapter when the source has no division of its own for it.
 */
const splitAfterMissingPages = (
  book: BookId,
  { chapter, intro, items }: ChapterItems,
  divided: ReadonlySet<number>,
): ReadonlyArray<ChapterItems> => {
  let missing = false
  const next = chapter + 1
  for (let i = 0; i < items.length; i++) {
    const item = items[i] as Item
    if (
      missing &&
      item.kind === "verse" &&
      item.marker !== undefined &&
      item.marker > verseCount(book, chapter) &&
      next <= chapterCount(book) &&
      !divided.has(next)
    ) {
      return [
        { chapter, intro, items: items.slice(0, i) },
        ...splitAfterMissingPages(
          book,
          { chapter: next, intro: [], items: items.slice(i) },
          divided,
        ),
      ]
    }
    missing ||= item.piece.missing
  }
  return [{ chapter, intro, items }]
}

/**
 * One chapter's sections, each from its own verse to the verse before the next section or the end
 * of the chapter. Text before the first verse section, such as a book's argument or a psalm's
 * title, opens it, and a paragraph whose verse cannot be told continues the section before it.
 */
const sectionsOf = (
  book: BookId,
  { chapter, intro, items }: ChapterItems,
): Effect.Effect<ReadonlyArray<CommentarySection>, TeiCommentaryError> =>
  Effect.gen(function* () {
    const max = verseCount(book, chapter)
    const numbers = numberMarkers(
      items.flatMap((item) => (item.kind === "verse" ? [item.marker] : [])),
      max,
    )
    const open: Array<{ readonly verse: number; readonly pieces: Array<Piece> }> = []
    const opening: Array<Piece> = [...intro]
    let lead: Array<Piece> = []
    let v = 0
    for (const item of items) {
      const current = open.at(-1)
      if (item.kind === "lead") {
        lead.push(item.piece)
        continue
      }
      if (item.kind === "trail") {
        ;(current?.pieces ?? opening).push(item.piece)
        continue
      }
      const verse = numbers[v++]
      if (verse === undefined || verse === current?.verse) {
        ;(current?.pieces ?? opening).push(...lead, item.piece)
      } else if (current !== undefined && verse < current.verse) {
        return yield* new TeiCommentaryError({
          detail: `${book}.${chapter}: verse ${verse} follows verse ${current.verse}`,
        })
      } else
        open.push({
          verse,
          pieces: [...(current === undefined ? opening : []), ...lead, item.piece],
        })
      lead = []
    }
    const last = open.at(-1)
    if (last === undefined) {
      if (opening.length + lead.length > 0) open.push({ verse: 1, pieces: [...opening, ...lead] })
    } else last.pieces.push(...lead)
    return open.map(({ verse, pieces }, i) => {
      const end = (open[i + 1]?.verse ?? max + 1) - 1
      return {
        ref: toOsis({ start: { book, chapter, verse }, end: { book, chapter, verse: end } }),
        paragraphs: pieces.flatMap((piece) => piece.paragraphs),
        notes: pieces.flatMap((piece) => piece.notes),
      }
    })
  })

const fail = (detail: string) => Effect.fail(new TeiCommentaryError({ detail }))

/**
 * One book's chapters. Chapter divisions are numbered by their `n` attribute, checked the way verse
 * markers are; a book printed without them is its single chapter. Text before a chapter division,
 * such as the book's argument, opens that chapter, and text after the last one is left out.
 */
const bookChapters = (book: BookId, division: XmlNode, layout: TeiCommentaryLayout) =>
  Effect.gen(function* () {
    const children = childrenOf(division)
    const isChapter = (node: XmlNode) =>
      elementName(node) === "div" && layout.chapterDivisions.has(attribute(node, "type") ?? "")
    const divisions = children.filter(isChapter)
    if (divisions.length === 0) {
      if (chapterCount(book) !== 1)
        return yield* fail(`${book} has no chapter divisions but ${chapterCount(book)} chapters`)
      return [{ chapter: 1, intro: [], items: chapterItems(children) }]
    }
    const numbers = numberMarkers(divisions.map(marker), chapterCount(book))
    for (const [i, n] of numbers.entries()) {
      if (n === undefined || (i > 0 && n <= (numbers[i - 1] ?? 0))) {
        const label = attribute(divisions[i] as XmlNode, "n")
        return yield* fail(`${book}: chapter division ${i + 1} (n="${label}") cannot be placed`)
      }
    }
    const divided = new Set(numbers as ReadonlyArray<number>)
    const chapters: Array<ChapterItems> = []
    let intro: Array<Piece> = []
    let label = true
    let d = 0
    for (const node of children) {
      if (isChapter(node)) {
        const chapter = numbers[d++] as number
        const items = chapterItems(childrenOf(node))
        chapters.push(...splitAfterMissingPages(book, { chapter, intro, items }, divided))
        intro = []
        label = false
      } else if (elementName(node) !== undefined && elementName(node) !== "pb") {
        if (!(label && elementName(node) === "head")) intro.push(...piecesOf([node]))
        label = false
      }
    }
    return chapters
  })

/**
 * Reads a TEI commentary that prints the sacred text verse by verse with its annotations as notes,
 * as the EEBO-TCP transcriptions do. Each book division, in document order, is the next of `books`.
 * Every verse paragraph becomes a section at the verse its marker names: the verse as printed, then
 * each annotation as a paragraph, with marginal notes as the section's notes.
 */
export const readTeiCommentary = (
  resourceId: string,
  xml: string,
  books: ReadonlyArray<BookId>,
  layout: TeiCommentaryLayout,
): Effect.Effect<ReadonlyArray<CommentaryBook>, TeiCommentaryError> =>
  Effect.gen(function* () {
    const tree = yield* Effect.try({
      try: () => parser.parse(xml) as ReadonlyArray<XmlNode>,
      catch: (error) => new TeiCommentaryError({ detail: String(error) }),
    })
    const findBooks = (nodes: ReadonlyArray<XmlNode>): ReadonlyArray<XmlNode> =>
      nodes.flatMap((node) =>
        elementName(node) === "div" && layout.bookDivisions.has(attribute(node, "type") ?? "")
          ? [node]
          : findBooks(childrenOf(node)),
      )
    const divisions = findBooks(tree)
    if (divisions.length !== books.length) {
      return yield* fail(`found ${divisions.length} book divisions for ${books.length} books`)
    }
    const read: Array<CommentaryBook> = []
    for (const [i, book] of books.entries()) {
      const chapters = yield* bookChapters(book, divisions[i] as XmlNode, layout)
      const sections: Array<CommentarySection> = []
      for (const chapter of chapters) sections.push(...(yield* sectionsOf(book, chapter)))
      read.push({ resourceId, book, sections })
    }
    return read
  })
