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

interface OpenSection {
  readonly ref: string | undefined
  readonly body: Paragraphs
  readonly notes: Array<Array<TextRun>>
}

/**
 * Splits an entry into its sections, in order. Text belongs to the section most recently started
 * until any section ends; text outside every section, such as the translation of the next passage,
 * is left out. A section that starts right after another with the same reference continues it.
 */
export const parseOsisEntry = (
  xml: string,
): Effect.Effect<ReadonlyArray<OsisSection>, OsisTextError> =>
  Effect.gen(function* () {
    const tree = yield* Effect.try({
      try: () => parser.parse(`<entry>${xml}</entry>`) as ReadonlyArray<XmlNode>,
      catch: (error) => new OsisTextError({ detail: String(error) }),
    })
    const sections: Array<OpenSection> = []
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
        const children = (node[name] ?? []) as ReadonlyArray<XmlNode>
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
    walk((root?.["entry"] ?? []) as ReadonlyArray<XmlNode>, false)
    return sections.map(({ ref, body, notes }) => {
      body.break()
      return { ref, paragraphs: body.done, notes }
    })
  })
