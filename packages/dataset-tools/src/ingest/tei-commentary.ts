import {
  chapterCount,
  toOsis,
  verseCount,
  type BookId,
  type CommentaryBook,
  type CommentarySection,
  type TextRun,
  type VerseRef,
} from "@reformed-bible/core"
import { Effect, Schema } from "effect"
import { attribute, decodeEntities, elementName, parser, TEXT, type XmlNode } from "./xml-tree.ts"

export class TeiCommentaryError extends Schema.TaggedError<
  TeiCommentaryError,
  { readonly brand: unique symbol }
>()("TeiCommentaryError", {
  detail: Schema.String,
}) {}

/**
 * Which TEI divisions hold a book, a chapter and a verse, by their `type` attribute, and how one
 * work departs from the common layout. Each departure is optional and left out for Poole and Owen.
 */
export interface TeiCommentaryLayout {
  /** Left out when the text's whole body is its single book. */
  readonly bookDivisions?: ReadonlySet<string>
  /**
   * Matched against each division's heading. A matching division, such as the Apocrypha or a
   * preface, holds no listed book and is left out with everything inside it.
   */
  readonly skipDivisions?: RegExp
  readonly chapterDivisions: ReadonlySet<string>
  /** Given when the book has no chapter divisions because the work expounds this one chapter. */
  readonly onlyChapter?: number
  /** The chapter an unnumbered first chapter division holds, as in a volume that begins mid-book. */
  readonly firstChapter?: number
  /**
   * Given when each chapter holds one division per verse or group of verses, named by its `n`
   * attribute, such as `4, 5, 6`, or by its label when the layout gives a label pattern. Otherwise
   * a verse is a paragraph numbered by its `n` attribute.
   */
  readonly verseDivisions?: ReadonlySet<string>
  /**
   * Given when each chapter division sits inside the first of its verse divisions, as Durham prints
   * each chapter inside its first lecture. The verse divisions after it, up to the next chapter,
   * belong to that chapter.
   */
  readonly chaptersInFirstVerseDivision?: boolean
  /**
   * Given when verses are told by printed labels, such as `Ver. 1.` or `HOSEA 13. 12.`, and not by
   * `n` attributes, which may number lectures, sermons or points instead. The pattern is matched
   * only at a label position: a quotation, `bibl` or epigraph, read from its first `bibl` when it
   * has one, or a verse division's heading. Its first group is the verse. A verse named in prose is
   * never read. A labelled quotation opens a section, and a verse division opens one at its first
   * matching label, so a lecture whose labels run from verse 8 to 14 is one section.
   */
  readonly verseLabel?: RegExp
  /**
   * Printed verse labels moved to the verse their text quotes, keyed by the label as an OSIS
   * reference: `Hos.14.10` to 9 where a sermon labelled 14.10 quotes the King James Version's 14:9.
   */
  readonly verseLabelMoves?: ReadonlyMap<string, number>
  /** The last verse the work expounds, where its last section ends instead of at the chapter's end. */
  readonly lastVerse?: VerseRef
}

const childrenOf = (node: XmlNode): ReadonlyArray<XmlNode> => {
  const name = elementName(node)
  return name === undefined ? [] : ((node[name] ?? []) as ReadonlyArray<XmlNode>)
}

/** A text run as it reads: entities decoded and the long s printed as s. */
const printed = (text: string): string => decodeEntities(text).replaceAll("ſ", "s")

const textOf = (nodes: ReadonlyArray<XmlNode>): string =>
  nodes
    .map((node) => {
      const text = node[TEXT]
      return typeof text === "string" ? printed(text) : textOf(childrenOf(node))
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
        into.add(printed(text), emphasis)
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

const LABEL_BLOCKS = new Set(["q", "bibl", "epigraph"])

/** The verse a label block's text names, read from its first `bibl` when it has one. */
const labelOf = (node: XmlNode, pattern: RegExp): number | undefined => {
  const [bibl] = descendants([node], "bibl")
  const text = textOf(childrenOf(bibl ?? node))
  const verse = pattern.exec(text.replace(/\s+/g, " ").trim())?.[1]
  return verse === undefined ? undefined : Number(verse)
}

/** The verse named by a verse division's first heading or epigraph that carries a label. */
const divisionLabelOf = (division: XmlNode, pattern: RegExp): number | undefined => {
  for (const node of childrenOf(division)) {
    const name = elementName(node)
    const verse = name === "head" || name === "epigraph" ? labelOf(node, pattern) : undefined
    if (verse !== undefined) return verse
  }
  return undefined
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
 * a page gap or a closing doxology, continues the verse before it. Given a label pattern, a labelled
 * quotation is a verse item instead, and every paragraph continues the verse before it.
 */
const chapterItems = (
  nodes: ReadonlyArray<XmlNode>,
  verseLabel: RegExp | undefined,
): ReadonlyArray<Item> => {
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
      const verse =
        verseLabel !== undefined && LABEL_BLOCKS.has(name) ? labelOf(node, verseLabel) : undefined
      if (name === "p") {
        const piece = pieceOf(childrenOf(node))
        items.push(
          verseLabel === undefined
            ? { kind: "verse", marker: marker(node), piece }
            : { kind: "trail", piece },
        )
      } else if (name === "head") items.push({ kind: "lead", piece: pieceOf(childrenOf(node)) })
      else if (name === "argument") {
        for (const piece of piecesOf(childrenOf(node))) items.push({ kind: "lead", piece })
      } else if (name === "div") visit(childrenOf(node))
      else if (verse !== undefined)
        items.push({ kind: "verse", marker: verse, piece: pieceOf([node]) })
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

const joinPieces = (pieces: ReadonlyArray<Piece>): Piece => ({
  paragraphs: pieces.flatMap((piece) => piece.paragraphs),
  notes: pieces.flatMap((piece) => piece.notes),
  missing: pieces.some((piece) => piece.missing),
})

/**
 * The items of a chapter written as one division per verse or group of verses. Each division is a
 * verse item at the first verse its `n` attribute, or else its label, names, so divisions opening
 * on the same verse share a section. The chapter's own heading is left out. The text before the
 * first division opens it, or is verse 1 when the first division begins later, as when the chapter's
 * introduction runs on into the first verse's exposition. The text after the last division, such as
 * `FINIS.`, is left out.
 */
const verseDivisionItems = (
  nodes: ReadonlyArray<XmlNode>,
  verseDivisions: ReadonlySet<string>,
  verseLabel: RegExp | undefined,
): ReadonlyArray<Item> => {
  const isVerse = (node: XmlNode) =>
    elementName(node) === "div" && verseDivisions.has(attribute(node, "type") ?? "")
  const intro: Array<Piece> = []
  const items: Array<Item> = []
  let label = true
  for (const node of nodes.slice(0, nodes.findLastIndex(isVerse) + 1)) {
    const name = elementName(node)
    if (name === undefined || name === "pb") continue
    const first = label
    label = false
    if (isVerse(node)) {
      const n = /^\d+/.exec(attribute(node, "n") ?? "")?.[0]
      const numbered = n === undefined ? undefined : Number(n)
      items.push({
        kind: "verse",
        marker: verseLabel === undefined ? numbered : divisionLabelOf(node, verseLabel),
        piece: joinPieces(piecesOf(childrenOf(node))),
      })
    } else if (items.length > 0) items.push({ kind: "trail", piece: joinPieces(piecesOf([node])) })
    else if (!(first && name === "head")) intro.push(...piecesOf([node]))
  }
  if (intro.length === 0) return items
  const opening = items[0]
  return opening?.kind === "verse" && opening.marker !== 1
    ? [{ kind: "verse", marker: 1, piece: joinPieces(intro) }, ...items]
    : [...intro.map((piece): Item => ({ kind: "lead", piece })), ...items]
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
 * of the chapter, or the work's last verse when it ends in this chapter. Text before the first verse
 * section, such as a book's argument or a psalm's title, opens it, and a paragraph whose verse
 * cannot be told continues the section before it. A marker the layout moves keys its section to the
 * verse it is moved to.
 */
const sectionsOf = (
  book: BookId,
  { chapter, intro, items }: ChapterItems,
  layout: TeiCommentaryLayout,
): Effect.Effect<ReadonlyArray<CommentarySection>, TeiCommentaryError> =>
  Effect.gen(function* () {
    const { lastVerse, verseLabelMoves } = layout
    const max =
      lastVerse?.book === book && lastVerse.chapter === chapter
        ? lastVerse.verse
        : verseCount(book, chapter)
    const moved = (m: number | undefined) =>
      m === undefined ? m : (verseLabelMoves?.get(`${book}.${chapter}.${m}`) ?? m)
    const markers = items.flatMap((item) => (item.kind === "verse" ? [moved(item.marker)] : []))
    const numbers =
      layout.verseDivisions === undefined
        ? numberMarkers(markers, max)
        : markers.map((m) => (m !== undefined && m >= 1 && m <= max ? m : undefined))
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

/** The text of a division's first heading, with its whitespace collapsed. */
const headingOf = (division: XmlNode): string => {
  const head = childrenOf(division).find((node) => elementName(node) === "head")
  return head === undefined ? "" : textOf(childrenOf(head)).replace(/\s+/g, " ").trim()
}

const withChildren = (node: XmlNode, children: ReadonlyArray<XmlNode>): XmlNode => {
  const name = elementName(node)
  return name === undefined ? node : { ...node, [name]: children }
}

/**
 * Rebuilds a book printed with each chapter division inside its first verse division, such as a
 * lecture, as chapter divisions holding their verse divisions. That first verse division holds the
 * chapter's text in place of the chapter division, without the chapter's own heading, and the verse
 * divisions after it, up to the next chapter, follow it.
 */
const gatherChapters = (
  nodes: ReadonlyArray<XmlNode>,
  isChapter: (node: XmlNode) => boolean,
  isVerse: (node: XmlNode) => boolean,
): ReadonlyArray<XmlNode> => {
  const gathered: Array<XmlNode> = []
  let chapter: { readonly node: XmlNode; readonly children: Array<XmlNode> } | undefined
  const close = () => {
    if (chapter !== undefined) gathered.push(withChildren(chapter.node, chapter.children))
  }
  for (const node of nodes) {
    const inner = isVerse(node) ? childrenOf(node).find(isChapter) : undefined
    if (inner !== undefined) {
      close()
      const text = childrenOf(inner)
      const opening = text.find((child) => !["pb", undefined].includes(elementName(child)))
      const own =
        opening !== undefined && elementName(opening) === "head"
          ? text.filter((child) => child !== opening)
          : text
      const first = childrenOf(node).flatMap((child) => (child === inner ? own : [child]))
      chapter = { node: inner, children: [withChildren(node, first)] }
    } else if (isChapter(node)) {
      close()
      chapter = { node, children: [...childrenOf(node)] }
    } else if (chapter === undefined) gathered.push(node)
    else chapter.children.push(node)
  }
  close()
  return gathered
}

/**
 * One book's chapters. Chapter divisions are numbered by their `n` attribute, checked the way verse
 * markers are; a book printed without them is its single chapter, or the one chapter the layout
 * names. Text before a chapter division, such as the book's argument, opens that chapter, and text
 * after the last one is left out.
 */
const bookChapters = (book: BookId, division: XmlNode, layout: TeiCommentaryLayout) =>
  Effect.gen(function* () {
    const isChapter = (node: XmlNode) =>
      elementName(node) === "div" && layout.chapterDivisions.has(attribute(node, "type") ?? "")
    const isVerse = (node: XmlNode) =>
      elementName(node) === "div" &&
      layout.verseDivisions?.has(attribute(node, "type") ?? "") === true
    const children =
      layout.chaptersInFirstVerseDivision === true
        ? gatherChapters(childrenOf(division), isChapter, isVerse)
        : childrenOf(division)
    const divisions = children.filter(isChapter)
    const itemsOf = (nodes: ReadonlyArray<XmlNode>) =>
      layout.verseDivisions === undefined
        ? chapterItems(nodes, layout.verseLabel)
        : verseDivisionItems(nodes, layout.verseDivisions, layout.verseLabel)
    if (divisions.length === 0) {
      const only = layout.onlyChapter ?? (chapterCount(book) === 1 ? 1 : undefined)
      if (only === undefined)
        return yield* fail(`${book} has no chapter divisions but ${chapterCount(book)} chapters`)
      return [{ chapter: only, intro: [], items: itemsOf(children) }]
    }
    const markers = divisions.map((node, i) =>
      i === 0 ? (marker(node) ?? layout.firstChapter) : marker(node),
    )
    const numbers = numberMarkers(markers, chapterCount(book))
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
        const items = itemsOf(childrenOf(node))
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
 * each annotation as a paragraph, with marginal notes as the section's notes. A commentary written
 * as one exposition per verse or group of verses, given `verseDivisions`, has a section at each
 * division's first verse instead.
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
    const { bookDivisions, skipDivisions } = layout
    const isBook = (node: XmlNode) =>
      bookDivisions === undefined
        ? elementName(node) === "body"
        : elementName(node) === "div" && bookDivisions.has(attribute(node, "type") ?? "")
    const isSkipped = (node: XmlNode) =>
      skipDivisions !== undefined &&
      elementName(node) === "div" &&
      skipDivisions.test(headingOf(node))
    const findBooks = (nodes: ReadonlyArray<XmlNode>): ReadonlyArray<XmlNode> =>
      nodes.flatMap((node) => {
        if (isSkipped(node)) return []
        return isBook(node) ? [node] : findBooks(childrenOf(node))
      })
    const divisions = findBooks(tree)
    if (divisions.length !== books.length) {
      return yield* fail(`found ${divisions.length} book divisions for ${books.length} books`)
    }
    const read: Array<CommentaryBook> = []
    for (const [i, book] of books.entries()) {
      const chapters = yield* bookChapters(book, divisions[i] as XmlNode, layout)
      const sections: Array<CommentarySection> = []
      for (const chapter of chapters) sections.push(...(yield* sectionsOf(book, chapter, layout)))
      read.push({ resourceId, book, sections })
    }
    return read
  })
