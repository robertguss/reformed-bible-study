import type { TextRun } from "@reformed-bible/core"
import { Effect, Schema } from "effect"
import { XMLParser } from "fast-xml-parser"

export class OsisTextError extends Schema.TaggedError<
  OsisTextError,
  { readonly brand: unique symbol }
>()("OsisTextError", {
  detail: Schema.String,
}) {}

/** One commentary entry as plain text runs: the body paragraphs and, separately, its notes. */
export interface OsisEntry {
  /** The verse reference the entry's own section marker names, such as `Rom.8.28`. */
  readonly ref: string | undefined
  readonly paragraphs: ReadonlyArray<ReadonlyArray<TextRun>>
  readonly notes: ReadonlyArray<ReadonlyArray<TextRun>>
}

// Entity processing is off, so a document type definition in the source can never declare
// entities that get expanded. The five predefined XML entities and character references are
// decoded below instead, and every other entity reference stays literal text.
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

/** Collects runs into paragraphs, starting a new paragraph at each break. */
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

/** Joins a note's paragraphs into one list of runs, with a blank line between paragraphs. */
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

/**
 * Converts one OSIS commentary entry into plain text runs. Only text inside the entry's section
 * markers is kept; text after the section ends, such as the translation of the next passage, is
 * left out. Notes are moved out of the body into their own list, and `hi` elements become
 * emphasis. All other markup is dropped and only its text kept, so nothing in the result is HTML.
 */
export const parseOsisEntry = (xml: string): Effect.Effect<OsisEntry, OsisTextError> =>
  Effect.gen(function* () {
    const tree = yield* Effect.try({
      try: () => parser.parse(`<entry>${xml}</entry>`) as ReadonlyArray<XmlNode>,
      catch: (error) => new OsisTextError({ detail: String(error) }),
    })
    const body = new Paragraphs()
    const notes: Array<Array<TextRun>> = []
    let note: Paragraphs | undefined
    let ref: string | undefined
    let inSection = false

    const walk = (nodes: ReadonlyArray<XmlNode>, emphasis: boolean): void => {
      for (const node of nodes) {
        const text = node[TEXT]
        if (typeof text === "string") {
          if (inSection) (note ?? body).add(decodeEntities(text), emphasis)
          continue
        }
        const name = elementName(node)
        if (name === undefined) continue
        const children = (node[name] ?? []) as ReadonlyArray<XmlNode>
        if (name === "div") {
          if (attribute(node, "type") === "section") {
            if (attribute(node, "sID") !== undefined) {
              inSection = true
              ref ??= attribute(node, "annotateRef")?.replace(/^Bible:/, "")
            } else if (attribute(node, "eID") !== undefined) inSection = false
          }
          ;(note ?? body).break()
          walk(children, emphasis)
          ;(note ?? body).break()
        } else if (name === "note") {
          if (!inSection || note !== undefined) {
            walk(children, emphasis)
            continue
          }
          note = new Paragraphs()
          walk(children, false)
          note.break()
          const runs = joinParagraphs(note.done)
          if (runs.length > 0) notes.push(runs)
          note = undefined
        } else if (name === "lb") {
          if (inSection) (note ?? body).add(" ", emphasis)
        } else walk(children, emphasis || name === "hi")
      }
    }

    const root = tree.find((node) => elementName(node) === "entry")
    walk((root?.["entry"] ?? []) as ReadonlyArray<XmlNode>, false)
    body.break()
    return { ref, paragraphs: body.done, notes }
  })
