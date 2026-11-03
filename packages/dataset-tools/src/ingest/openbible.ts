import { books, chapterCount, parseOsis, type CrossReferenceChapter } from "@reformed-bible/core"
import { Effect, Result, Schema } from "effect"

export const OPENBIBLE_RESOURCE_ID = "openbible-xrefs"

/** Verses openbible.info numbers differently from the KJV, mapped to the KJV verse that holds their words. */
const KJV_EQUIVALENTS: Readonly<Record<string, string>> = {
  // The KJV joins the last two verses of 3 John into verse 14.
  "3John.1.15": "3John.1.14",
}

export class CrossReferenceError extends Schema.TaggedError<
  CrossReferenceError,
  { readonly brand: unique symbol }
>()("CrossReferenceError", {
  problems: Schema.Array(Schema.String),
}) {}

const toKjv = (ref: string): string =>
  ref
    .split("-")
    .map((end) => KJV_EQUIVALENTS[end] ?? end)
    .join("-")

interface Target {
  readonly target: string
  readonly votes: number
}

/**
 * Turns the openbible.info cross-reference table into one record per canonical chapter. Rows without
 * positive votes are dropped, targets keep their ranges, and each verse lists its strongest targets first.
 */
export const parseCrossReferences = (
  tsv: string,
): Effect.Effect<ReadonlyArray<CrossReferenceChapter>, CrossReferenceError> =>
  Effect.gen(function* () {
    const byChapter = new Map<string, Map<number, Array<Target>>>()
    const problems: Array<string> = []
    const lines = tsv.split(/\r?\n/)
    for (const [index, line] of lines.entries()) {
      if (line === "" || (index === 0 && line.startsWith("From Verse\t"))) continue
      const [fromText = "", toText = "", votesText = ""] = line.split("\t")
      const votes = Number(votesText)
      const from = toKjv(fromText)
      const target = toKjv(toText)
      const fromOk = Result.isSuccess(parseOsis(from)) && !from.includes("-")
      const targetOk = Result.isSuccess(parseOsis(target))
      if (!Number.isInteger(votes) || !fromOk || !targetOk) {
        problems.push(`line ${index + 1}: ${line}`)
        continue
      }
      if (votes <= 0) continue
      const [book, chapter, verse] = from.split(".")
      const chapterKey = `${book}.${chapter}`
      const verses = byChapter.get(chapterKey) ?? new Map<number, Array<Target>>()
      const targets = verses.get(Number(verse)) ?? []
      targets.push({ target, votes })
      verses.set(Number(verse), targets)
      byChapter.set(chapterKey, verses)
    }
    if (problems.length > 0) return yield* new CrossReferenceError({ problems })

    const chapters: Array<CrossReferenceChapter> = []
    for (const { id: book } of books) {
      for (let chapter = 1; chapter <= chapterCount(book); chapter++) {
        const verses = [
          ...(byChapter.get(`${book}.${chapter}`) ?? new Map<number, Array<Target>>()),
        ]
          .map(([verse, targets]) => ({
            verse,
            targets: [...targets].sort((a, b) => b.votes - a.votes),
          }))
          .sort((a, b) => a.verse - b.verse)
        chapters.push({ resourceId: OPENBIBLE_RESOURCE_ID, book, chapter, verses })
      }
    }
    return chapters
  })
