import { defineContract, implement } from "@reformed-bible/capability"
import { Effect, Schema } from "effect"
import {
  ContentCorrupt,
  ContentNotFound,
  ContentStore,
  ContentUnavailable,
} from "../content-store/index.ts"
import type { CommentarySection } from "../content/index.ts"
import { makeEnvelope, TextRuns, type ResourceCoverage } from "../envelope/index.ts"
import { InvalidReference } from "../reference/index.ts"
import { type CatalogResource, CommentaryShard, shardPaths } from "../shards/index.ts"
import { Site } from "../site/index.ts"
import { decodeCursor, nextCursor } from "./cursor.ts"
import { inDefaultCommentaryOrder } from "./default-commentary.ts"
import { InvalidCursor, UnknownResource } from "./errors.ts"
import {
  attributionOf,
  chaptersOf,
  coverageEntry,
  coverageOf,
  envelope,
  findResource,
  hasChapter,
  linkOf,
  ofKind,
  overlapsAny,
  parsePassages,
  passageUrl,
  READ_ONLY,
  readCatalog,
  REFERENCE_GRAMMAR,
  RESULT_SHAPE,
} from "./shared.ts"

const NAME = "get_commentary"

export const COMMENTARY_SECTION_CAP = 3
export const COMMENTARY_CHARACTER_CAP = 12_000

export const CommentaryItem = Schema.Struct({
  /** The canonical range the author comments on, such as `Rom.8.28-Rom.8.30`. */
  ref: Schema.String,
  display: Schema.String,
  url: Schema.String,
  paragraphs: Schema.Array(TextRuns),
  notes: Schema.Array(TextRuns),
})
export type CommentaryItem = typeof CommentaryItem.Type

export const getCommentaryContract = defineContract(NAME, {
  description: `Returns commentary sections on a passage, whole and in canonical order, each with the range the author comments on (Calvin on Romans 8:29 returns his section on 8:28-30). A call returns at most ${COMMENTARY_SECTION_CAP} sections or about ${COMMENTARY_CHARACTER_CAP} characters, never a cut section, with a cursor for the rest. Name a work to read one commentary; without one, every catalogued commentary is searched. Coverage says when a work does not cover the book (outside_work) or the passage is not yet ingested. ${REFERENCE_GRAMMAR} ${RESULT_SHAPE}`,
  input: Schema.Struct({
    ref: Schema.String.annotate({ description: "The passage, such as Romans 8:28." }),
    work: Schema.optional(
      Schema.String.annotate({
        description: "Commentary id from list_resources, such as calvin-commentaries.",
      }),
    ),
    cursor: Schema.optional(
      Schema.String.annotate({ description: "Cursor from a previous page of this request." }),
    ),
  }),
  output: makeEnvelope(CommentaryItem),
  failure: Schema.Union([
    InvalidReference,
    UnknownResource,
    InvalidCursor,
    ContentNotFound,
    ContentUnavailable,
    ContentCorrupt,
  ]),
  annotations: READ_ONLY,
  http: { method: "GET", path: "/v1/commentary/:ref" },
})

const lengthOf = (section: CommentarySection): number =>
  [...section.paragraphs, ...section.notes]
    .flat()
    .reduce((total, run) => total + run.text.length, 0)

const takePage = <A extends { readonly section: CommentarySection }>(
  sections: ReadonlyArray<A>,
  offset: number,
): ReadonlyArray<A> => {
  const page: Array<A> = []
  let characters = 0
  for (const entry of sections.slice(offset)) {
    const length = lengthOf(entry.section)
    if (page.length === COMMENTARY_SECTION_CAP) break
    if (page.length > 0 && characters + length > COMMENTARY_CHARACTER_CAP) break
    page.push(entry)
    characters += length
  }
  return page
}

export const getCommentary = implement(getCommentaryContract, (input) =>
  Effect.gen(function* () {
    const store = yield* ContentStore
    const { origin } = yield* Site
    const catalog = yield* readCatalog
    const works: ReadonlyArray<CatalogResource> =
      input.work === undefined
        ? inDefaultCommentaryOrder(ofKind(catalog, "commentary"))
        : [yield* findResource(catalog, input.work, "commentary")]
    const passages = yield* parsePassages(input.ref)
    const offset = yield* decodeCursor(input.cursor, store.release, NAME)
    const chapters = chaptersOf(passages)

    const sections: Array<{ readonly work: CatalogResource; readonly section: CommentarySection }> =
      []
    const resources: Array<ResourceCoverage> = []
    for (const work of works) {
      // A section spanning two chapters appears in both chapter files; keep it once.
      const found = new Map<string, CommentarySection>()
      for (const chapter of chapters) {
        if (!hasChapter(work, chapter)) continue
        const { payload } = yield* store.read(
          shardPaths.commentary(work.id, chapter.book, chapter.chapter),
          CommentaryShard,
        )
        for (const section of payload.sections)
          if (!found.has(section.ref) && overlapsAny(section.ref, passages))
            found.set(section.ref, section)
      }
      for (const section of found.values()) sections.push({ work, section })
      resources.push(coverageEntry(work, coverageOf(work, chapters, found.size > 0)))
    }

    const page = takePage(sections, offset)
    return yield* envelope({
      items: page.map(({ work, section }) => {
        const { display, url } = linkOf(origin, section.ref)
        return {
          value: {
            ref: section.ref,
            display,
            url,
            paragraphs: section.paragraphs,
            notes: section.notes,
          },
          attribution: attributionOf(work),
        }
      }),
      resources,
      canonicalUrl: yield* passageUrl(passages[0]),
      cursor: nextCursor(store.release, NAME, offset + page.length, sections.length),
    })
  }),
)
