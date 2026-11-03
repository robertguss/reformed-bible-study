import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import {
  chapterCount,
  Confession,
  parseOsis,
  verseCount,
  type InvalidReference,
  type Passage,
  type VerseRef,
} from "@reformed-bible/core"
import { Effect, Result, Schema } from "effect"
import { writeNormalized } from "../normalized.ts"

/** Directory, relative to the repository root, holding one curated transcription per confession. */
export const CONFESSIONS_DIR = "dataset/confessions"
export const CONFESSION_FILE = "confession.json"

export class ConfessionIngestError extends Schema.TaggedError<
  ConfessionIngestError,
  { readonly brand: unique symbol }
>()("ConfessionIngestError", {
  resourceId: Schema.String,
  reason: Schema.Literals(["invalid-json", "resource-mismatch"]),
  detail: Schema.String,
}) {}

const readConfession = (repoRoot: string, id: string) =>
  Effect.gen(function* () {
    const path = join(repoRoot, CONFESSIONS_DIR, id, CONFESSION_FILE)
    const json = yield* Effect.try({
      try: (): unknown => JSON.parse(readFileSync(path, "utf8")),
      catch: (error) =>
        new ConfessionIngestError({
          resourceId: id,
          reason: "invalid-json",
          detail: String(error),
        }),
    })
    const confession = yield* Schema.decodeUnknownEffect(Confession)(json)
    if (confession.resourceId !== id) {
      return yield* new ConfessionIngestError({
        resourceId: id,
        reason: "resource-mismatch",
        detail: `${path} declares resource ${confession.resourceId}`,
      })
    }
    return confession
  })

/**
 * Decodes every curated confession under `dataset/confessions/<id>/` through the shared schema and
 * writes it to normalized output. Nothing is written unless every confession decodes.
 */
export const ingestConfessions = (repoRoot: string) =>
  Effect.gen(function* () {
    const ids = readdirSync(join(repoRoot, CONFESSIONS_DIR), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()
    const confessions = yield* Effect.forEach(ids, (id) => readConfession(repoRoot, id))
    return yield* Effect.forEach(confessions, (confession) =>
      Effect.as(
        writeNormalized(repoRoot, confession.resourceId, CONFESSION_FILE, Confession, confession),
        {
          resourceId: confession.resourceId,
          articles: confession.divisions.reduce((n, d) => n + d.articles.length, 0),
        },
      ),
    )
  })

const verseKey = (ref: VerseRef): string => `${ref.book}.${ref.chapter}.${ref.verse}`

/** Every verse a passage covers, in order, under KJV versification. */
const versesOf = ({ start, end }: Passage): ReadonlyArray<string> => {
  const keys: Array<string> = []
  const lastChapter = Math.min(end.chapter, chapterCount(start.book))
  for (let chapter = start.chapter; chapter <= lastChapter; chapter++) {
    const first = chapter === start.chapter ? start.verse : 1
    const last = chapter === end.chapter ? end.verse : verseCount(start.book, chapter)
    for (let verse = first; verse <= last; verse++)
      keys.push(verseKey({ ...start, chapter, verse }))
  }
  return keys
}

/**
 * Maps each verse cited by a confession's proof texts to the articles citing it, so a verse finds
 * every article whose proof range covers it. Fails on the first reference outside KJV versification.
 */
export const indexProofTexts = (
  confession: Confession,
): Result.Result<ReadonlyMap<string, ReadonlyArray<string>>, InvalidReference> => {
  const index = new Map<string, Array<string>>()
  for (const article of confession.divisions.flatMap((d) => d.articles)) {
    for (const ref of article.proofs.flatMap((p) => p.refs)) {
      const passage = parseOsis(ref)
      if (Result.isFailure(passage)) return Result.fail(passage.failure)
      for (const key of versesOf(passage.success)) {
        const articles = index.get(key) ?? []
        if (!articles.includes(article.id)) articles.push(article.id)
        index.set(key, articles)
      }
    }
  }
  return Result.succeed(index)
}
