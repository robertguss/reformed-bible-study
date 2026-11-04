import type { TextRun } from "@reformed-bible/core"
import { Effect, Schema } from "effect"
import { XMLParser } from "fast-xml-parser"

export class OsisTextError extends Schema.TaggedError<
  OsisTextError,
  { readonly brand: unique symbol }
>()("OsisTextError", {
  detail: Schema.String,
}) {}

/** One `div type="section"` of an entry, under the reference its start tag annotates. */
export interface OsisSection {
  readonly ref: string | undefined
  readonly paragraphs: ReadonlyArray<ReadonlyArray<TextRun>>
  readonly notes: ReadonlyArray<ReadonlyArray<TextRun>>
}

/**
 * One table of an entry: the plain text of each cell of its first row, and how many of the entry's
 * sections had begun before it. In Calvin's harmonies the first row names each book's passage of
 * the pericope that follows.
 */
export interface OsisTable {
  readonly firstRow: ReadonlyArray<string>
  readonly sectionsBefore: number
}

export interface OsisEntry {
  readonly sections: ReadonlyArray<OsisSection>
  readonly tables: ReadonlyArray<OsisTable>
}

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

class Paragraphs {
  readonly done: Array<Array<TextRun>> = []
  private current: Array<TextRun> = []

  add(text: string, emphasis: boolean): void {
    const last = this.current.at(-1)
    let collapsed = text.replace(/\s+/g, " ")
    if (last?.text.endsWith(" ") === true) collapsed = collapsed.trimStart()
    if (collapsed === "") return
    if (last !== undefined && (last.emphasis === true) === emphasis) {
      this.current[this.current.length - 1] = { ...last, text: last.text + collapsed }
    } else {
      this.current.push(emphasis ? { text: collapsed, emphasis: true } : { text: collapsed })
    }
  }

  break(): void {
    const runs = trimRuns(this.current)
    if (runs.length > 0) this.done.push(runs)
    this.current = []
  }
}

const trimRuns = (runs: ReadonlyArray<TextRun>): Array<TextRun> => {
  const trimmed = runs.map((run, i) => {
    let text = run.text
    if (i === 0) text = text.trimStart()
    if (i === runs.length - 1) text = text.trimEnd()
    return { ...run, text }
  })
  return trimmed.filter((run) => run.text !== "")
}

const joinParagraphs = (paragraphs: ReadonlyArray<ReadonlyArray<TextRun>>): Array<TextRun> => {
  const runs: Array<TextRun> = []
  paragraphs.forEach((paragraph, i) => {
    if (i > 0) {
      const last = runs.at(-1)
      if (last !== undefined && last.emphasis !== true) {
        runs[runs.length - 1] = { ...last, text: `${last.text}\n\n` }
      } else runs.push({ text: "\n\n" })
    }
    for (const run of paragraph) {
      const last = runs.at(-1)
      if (last !== undefined && last.emphasis !== true && run.emphasis !== true) {
        runs[runs.length - 1] = { ...last, text: last.text + run.text }
      } else runs.push(run)
    }
  })
  return runs
}

const elementName = (node: XmlNode): string | undefined =>
  Object.keys(node).find((key) => key !== ATTRIBUTES && key !== TEXT)

const attribute = (node: XmlNode, name: string): string | undefined => {
  const attributes = node[ATTRIBUTES] as Readonly<Record<string, unknown>> | undefined
  const value = attributes?.[name]
  return typeof value === "string" ? value : undefined
}

const childrenOf = (node: XmlNode, name: string): ReadonlyArray<XmlNode> =>
  (node[name] ?? []) as ReadonlyArray<XmlNode>

/** The text of nodes with notes left out, a line break read as a space, and spaces collapsed. */
const plainText = (nodes: ReadonlyArray<XmlNode>): string => {
  const parts: Array<string> = []
  const collect = (list: ReadonlyArray<XmlNode>): void => {
    for (const node of list) {
      const text = node[TEXT]
      if (typeof text === "string") parts.push(decodeEntities(text))
      const name = elementName(node)
      if (name === "lb") parts.push(" ")
      else if (name !== undefined && name !== "note") collect(childrenOf(node, name))
    }
  }
  collect(nodes)
  return parts.join("").replace(/\s+/g, " ").trim()
}

const firstRowOf = (table: ReadonlyArray<XmlNode>): ReadonlyArray<string> => {
  const row = table.find((node) => elementName(node) === "row")
  return (row === undefined ? [] : childrenOf(row, "row"))
    .filter((node) => elementName(node) === "cell")
    .map((cell) => plainText(childrenOf(cell, "cell")))
}

interface OpenSection {
  readonly ref: string | undefined
  readonly body: Paragraphs
  readonly notes: Array<Array<TextRun>>
}

/**
 * Splits an entry into its sections, in order, and lists its tables. Text belongs to the section
 * most recently started until any section ends; text outside every section, such as the
 * translation of the next passage, is left out. A section that starts right after another with the
 * same reference continues it.
 */
export const parseOsisEntry = (xml: string): Effect.Effect<OsisEntry, OsisTextError> =>
  Effect.gen(function* () {
    const tree = yield* Effect.try({
      try: () => parser.parse(`<entry>${xml}</entry>`) as ReadonlyArray<XmlNode>,
      catch: (error) => new OsisTextError({ detail: String(error) }),
    })
    const sections: Array<OpenSection> = []
    const tables: Array<OsisTable> = []
    let current: OpenSection | undefined
    let note: Paragraphs | undefined
    const target = () => note ?? current?.body

    const walk = (nodes: ReadonlyArray<XmlNode>, emphasis: boolean): void => {
      for (const node of nodes) {
        const text = node[TEXT]
        if (typeof text === "string") {
          target()?.add(decodeEntities(text), emphasis)
          continue
        }
        const name = elementName(node)
        if (name === undefined) continue
        const children = childrenOf(node, name)
        if (name === "table")
          tables.push({ firstRow: firstRowOf(children), sectionsBefore: sections.length })
        if (name === "div" || name === "p") {
          target()?.break()
          if (name === "div" && attribute(node, "type") === "section") {
            if (attribute(node, "sID") !== undefined) {
              const ref = attribute(node, "annotateRef")?.replace(/^Bible:/, "")
              const last = sections.at(-1)
              if (last !== undefined && last.ref === ref) current = last
              else {
                current = { ref, body: new Paragraphs(), notes: [] }
                sections.push(current)
              }
            } else if (attribute(node, "eID") !== undefined) current = undefined
          }
          walk(children, emphasis)
          target()?.break()
        } else if (name === "note") {
          if (current === undefined || note !== undefined) {
            walk(children, emphasis)
            continue
          }
          note = new Paragraphs()
          walk(children, false)
          note.break()
          const runs = joinParagraphs(note.done)
          if (runs.length > 0) current.notes.push(runs)
          note = undefined
        } else if (name === "lb") target()?.add(" ", emphasis)
        else walk(children, emphasis || name === "hi")
      }
    }

    const root = tree.find((node) => elementName(node) === "entry")
    walk(root === undefined ? [] : childrenOf(root, "entry"), false)
    return {
      sections: sections.map(({ ref, body, notes }) => {
        body.break()
        return { ref, paragraphs: body.done, notes }
      }),
      tables,
    }
  })

/**
 * Titles that head a passage within a chapter. Every other title names a volume, a book or a
 * chapter, and is left out.
 */
const PASSAGE_HEADINGS: ReadonlySet<string> = new Set(["x-s3", "x-s4"])

/** Titles that name a chapter, such as Jamieson-Fausset-Brown's "CHAPTER 2" or "PSALM 3". */
const CHAPTER_TITLES: ReadonlySet<string> = new Set(["x-s", "x-s2"])

/**
 * Where a chapter's own text starts in the entry that opens it, after the book's front matter. In
 * Henry's module it starts with the chapter's introduction division. In Jamieson-Fausset-Brown's
 * it starts after the chapter's title, and in a book of one chapter, which has no chapter title,
 * after the text printed before the first verse.
 */
export type ChapterStart = "introduction" | "chapter-title"

/**
 * Reads the text of an entry that has no section markers, as in the CrossWire modules of Matthew
 * Henry and Jamieson-Fausset-Brown, into paragraphs and notes. A passage heading is a paragraph of
 * its own, and a line of verse is too. Any other title is left out, as is text after a chapter's
 * end until the next chapter starts.
 *
 * For a chapter's opening entry, the text of its chapter slot followed by its first verse entry,
 * `opening` says where the chapter's own text starts. Everything before that is the book's front
 * matter and is left out.
 */
export const parseOsisText = (
  xml: string,
  opening: ChapterStart | undefined,
): Effect.Effect<Omit<OsisSection, "ref">, OsisTextError> =>
  Effect.gen(function* () {
    const tree = yield* Effect.try({
      try: () => parser.parse(`<entry>${xml}</entry>`) as ReadonlyArray<XmlNode>,
      catch: (error) => new OsisTextError({ detail: String(error) }),
    })
    let body = new Paragraphs()
    let notes: Array<Array<TextRun>> = []
    let note: Paragraphs | undefined
    let inChapter = true
    let titled = false
    const target = () => (inChapter ? (note ?? body) : undefined)
    const restart = () => {
      body = new Paragraphs()
      notes = []
    }

    const walk = (nodes: ReadonlyArray<XmlNode>, emphasis: boolean): void => {
      for (const node of nodes) {
        const text = node[TEXT]
        if (typeof text === "string") {
          target()?.add(decodeEntities(text), emphasis)
          continue
        }
        const name = elementName(node)
        if (name === undefined) continue
        const children = childrenOf(node, name)
        const type = attribute(node, "type") ?? ""
        if (name === "chapter") {
          if (attribute(node, "eID") !== undefined) {
            body.break()
            inChapter = false
          } else if (attribute(node, "sID") !== undefined) inChapter = true
        } else if (name === "title") {
          body.break()
          if (PASSAGE_HEADINGS.has(type)) {
            walk(children, emphasis)
            body.break()
          } else if (opening === "chapter-title" && CHAPTER_TITLES.has(type)) {
            restart()
            titled = true
          }
        } else if (name === "div" || name === "p" || name === "lg" || name === "l") {
          if (opening === "introduction" && type === "introduction" && attribute(node, "sID"))
            restart()
          if (
            opening === "chapter-title" &&
            !titled &&
            attribute(node, "subType") === "x-preverse" &&
            attribute(node, "eID")
          )
            restart()
          target()?.break()
          walk(children, emphasis)
          target()?.break()
        } else if (name === "note") {
          if (note !== undefined || !inChapter) {
            walk(children, emphasis)
            continue
          }
          note = new Paragraphs()
          walk(children, false)
          note.break()
          const runs = joinParagraphs(note.done)
          if (runs.length > 0) notes.push(runs)
          note = undefined
        } else if (name === "lb") target()?.add(" ", emphasis)
        else walk(children, emphasis || name === "hi")
      }
    }

    const root = tree.find((node) => elementName(node) === "entry")
    walk(root === undefined ? [] : childrenOf(root, "entry"), false)
    body.break()
    return { paragraphs: body.done, notes }
  })
