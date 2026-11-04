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
import { compareVerse, InvalidReference, overlaps, type Passage } from "../reference/index.ts"
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
  passageOfOsis,
  passageUrl,
  READ_ONLY,
  readCatalog,
  REFERENCE_GRAMMAR,
  RESULT_SHAPE,
} from "./shared.ts"

const NAME = "get_commentary"

export const COMMENTARY_SECTION_CAP = 3
export const COMMENTARY_CHARACTER_CAP = 12_000

const ParallelLink = Schema.Struct({
  osis: Schema.String,
  display: Schema.String,
  url: Schema.String,
})

export const CommentaryItem = Schema.Struct({
  /** The canonical range the author comments on, such as `Rom.8.28-Rom.8.30`. */
  ref: Schema.String,
  display: Schema.String,
  url: Schema.String,
  /**
   * For a comment from a harmony, the parallel passages in other books it also treats; present only
   * when there are some. A request for a parallel returns the section under its own range.
   */
  parallels: Schema.optionalKey(Schema.Array(ParallelLink)),
  /**
   * Present only on a section longer than a page, which comes in parts split between paragraphs;
   * `index` counts from 1, and the section's notes come with its last part.
   */
  part: Schema.optionalKey(Schema.Struct({ index: Schema.Int, of: Schema.Int })),
  paragraphs: Schema.Array(TextRuns),
  notes: Schema.Array(TextRuns),
})
export type CommentaryItem = typeof CommentaryItem.Type

export const getCommentaryContract = defineContract(NAME, {
  description: `Returns commentary sections on a passage, in the order of the requested passage, each with the range the author comments on (Calvin on Romans 8:29 returns his section on 8:28-30). A comment from a gospel or law harmony also lists the parallel passages it treats, and a request for a parallel returns it under its own range (Mark 4:3 returns Calvin on Matthew 13:2-8, with Mark 4:1-12 among its parallels). A call returns at most ${COMMENTARY_SECTION_CAP} sections or about ${COMMENTARY_CHARACTER_CAP} characters, with a cursor for the rest; a section longer than that comes in numbered parts, split between paragraphs. Name a work to read one commentary; without one, every catalogued commentary is searched and the sections come grouped by commentator, in a fixed order that starts with Calvin, so on a long passage the later commentators start many pages in. Coverage says when a work does not cover the book (outside_work) or the passage is not yet ingested. ${REFERENCE_GRAMMAR} ${RESULT_SHAPE}`,
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

const runsLength = (runs: ReadonlyArray<typeof TextRuns.Type>): number =>
  runs.flat().reduce((total, run) => total + run.text.length, 0)

const lengthOf = (section: CommentarySection): number =>
  runsLength([...section.paragraphs, ...section.notes])

interface SectionPart {
  readonly section: CommentarySection
  readonly part?: { readonly index: number; readonly of: number }
}

/** Splits a section longer than a page between paragraphs into parts that each fit a page. */
const partsOf = (section: CommentarySection): ReadonlyArray<SectionPart> => {
  const groups: Array<Array<typeof TextRuns.Type>> = [[]]
  let characters = 0
  for (const paragraph of section.paragraphs) {
    const length = runsLength([paragraph])
    if (characters > 0 && characters + length > COMMENTARY_CHARACTER_CAP) {
      groups.push([])
      characters = 0
    }
    groups[groups.length - 1]!.push(paragraph)
    characters += length
  }
  return groups.length === 1
    ? [{ section }]
    : groups.map((paragraphs, i) => ({
        section: { ...section, paragraphs, notes: i === groups.length - 1 ? section.notes : [] },
        part: { index: i + 1, of: groups.length },
      }))
}

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

/**
 * Where a section meets the request: the earliest start of its own range or of a parallel that
 * overlaps the requested passages, so a Mark 4 request reads Calvin's harmony in Mark's order.
 */
const meetingOf = (section: CommentarySection, passages: ReadonlyArray<Passage>) =>
  [section.ref, ...(section.parallels ?? [])]
    .map(passageOfOsis)
    .filter((p): p is Passage => p !== undefined && passages.some((q) => overlaps(p, q)))
    .map((p) => p.start)
    .sort(compareVerse)[0]

const inRequestOrder = (
  sections: Iterable<CommentarySection>,
  passages: ReadonlyArray<Passage>,
): ReadonlyArray<CommentarySection> =>
  [...sections]
    .map((section) => ({
      section,
      meets: meetingOf(section, passages),
      own: passageOfOsis(section.ref)?.start,
    }))
    .sort((a, b) =>
      a.meets === undefined || b.meets === undefined || a.own === undefined || b.own === undefined
        ? 0
        : compareVerse(a.meets, b.meets) || compareVerse(a.own, b.own),
    )
    .map(({ section }) => section)

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

    const sections: Array<SectionPart & { readonly work: CatalogResource }> = []
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
          if (
            !found.has(section.ref) &&
            [section.ref, ...(section.parallels ?? [])].some((ref) => overlapsAny(ref, passages))
          )
            found.set(section.ref, section)
      }
      for (const section of inRequestOrder(found.values(), passages))
        for (const part of partsOf(section)) sections.push({ work, ...part })
      resources.push(coverageEntry(work, coverageOf(work, chapters, found.size > 0)))
    }

    const page = takePage(sections, offset)
    return yield* envelope({
      items: page.map(({ work, section, part }) => {
        const { display, url } = linkOf(origin, section.ref)
        return {
          value: {
            ref: section.ref,
            display,
            url,
            ...(section.parallels === undefined || section.parallels.length === 0
              ? {}
              : { parallels: section.parallels.map((ref) => linkOf(origin, ref)) }),
            ...(part === undefined ? {} : { part }),
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
