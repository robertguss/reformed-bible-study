import { Effect } from "effect"
import {
  BookBuilder,
  INLINE_MARKERS,
  PARAGRAPH_ROLES,
  SourceFormatError,
  type SourceBook,
} from "./usfm.ts"

/** A USJ node: the JSON form of USX that the Berean Standard Bible publishes. */
interface UsjNode {
  readonly type?: unknown
  readonly marker?: unknown
  readonly code?: unknown
  readonly number?: unknown
  readonly content?: ReadonlyArray<UsjNode | string>
}

const fail = (detail: string) => Effect.fail(new SourceFormatError({ source: "usj", detail }))

const toNumber = (value: unknown): number | undefined =>
  typeof value === "string" && /^\d+$/.test(value) ? Number(value) : undefined

/** Parses one USJ book of the Berean Standard Bible into verse text and headings, dropping notes. */
export const parseUsj = (json: string): Effect.Effect<SourceBook, SourceFormatError> =>
  Effect.gen(function* () {
    const document = yield* Effect.try({
      try: () => JSON.parse(json) as UsjNode,
      catch: (error) => new SourceFormatError({ source: "usj", detail: String(error) }),
    })
    const top = document.content ?? []
    const bookNode = top.find(
      (node): node is UsjNode => typeof node !== "string" && node.type === "book",
    )
    if (bookNode === undefined || typeof bookNode.code !== "string")
      return yield* fail("no book node")
    const code = bookNode.code
    const builder = new BookBuilder(code, "usj")

    const walk = (nodes: ReadonlyArray<UsjNode | string>): Effect.Effect<void, SourceFormatError> =>
      Effect.gen(function* () {
        for (const node of nodes) {
          if (typeof node === "string") {
            yield* builder.text(node)
            continue
          }
          switch (node.type) {
            case "verse": {
              const verse = toNumber(node.number)
              if (verse === undefined)
                return yield* fail(`${code}: verse number ${String(node.number)}`)
              builder.startVerse(verse)
              break
            }
            case "note":
              break
            case "char":
            case "ref":
              if (node.type === "char" && !INLINE_MARKERS.has(String(node.marker))) {
                return yield* fail(`${code}: unknown character marker ${String(node.marker)}`)
              }
              yield* walk(node.content ?? [])
              break
            default:
              return yield* fail(`${code}: unexpected ${String(node.type)} inside a paragraph`)
          }
        }
      })

    for (const node of top) {
      if (typeof node === "string" || node.type === "book") continue
      if (node.type === "chapter") {
        const chapter = toNumber(node.number)
        if (chapter === undefined)
          return yield* fail(`${code}: chapter number ${String(node.number)}`)
        builder.startChapter(chapter)
        continue
      }
      const role = node.type === "para" ? PARAGRAPH_ROLES.get(String(node.marker)) : undefined
      if (role === undefined)
        return yield* fail(`${code}: unknown ${String(node.type)} ${String(node.marker)}`)
      builder.startParagraph(role)
      if (role !== "skip") yield* walk(node.content ?? [])
    }
    return builder.finish()
  })
