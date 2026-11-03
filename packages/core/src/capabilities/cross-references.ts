import { defineContract, implement } from "@reformed-bible/capability"
import { Effect, Schema } from "effect"
import {
  ContentCorrupt,
  ContentNotFound,
  ContentStore,
  ContentUnavailable,
} from "../content-store/index.ts"
import { type Attribution, makeEnvelope, type ResourceCoverage } from "../envelope/index.ts"
import { InvalidReference } from "../reference/index.ts"
import { CrossReferenceShard, shardPaths } from "../shards/index.ts"
import { Site } from "../site/index.ts"
import { decodeCursor, nextCursor } from "./cursor.ts"
import { InvalidCursor } from "./errors.ts"
import {
  attributionOf,
  chapterSpans,
  chaptersOf,
  coverageEntry,
  coverageOf,
  envelope,
  hasChapter,
  inSpan,
  linkOf,
  ofKind,
  parsePassages,
  passageUrl,
  READ_ONLY,
  readCatalog,
  REFERENCE_GRAMMAR,
  RESULT_SHAPE,
} from "./shared.ts"

const NAME = "get_cross_references"

/** Cross-references per page, and the most a caller may ask for. */
export const CROSS_REFERENCE_PAGE = 25

export const CrossReferenceItem = Schema.Struct({
  /** The verse of the request the reference starts from. */
  from: Schema.String,
  target: Schema.String,
  display: Schema.String,
  url: Schema.String,
  /** Reader votes behind the link; higher is stronger. */
  votes: Schema.Int,
})
export type CrossReferenceItem = typeof CrossReferenceItem.Type

export const getCrossReferencesContract = defineContract(NAME, {
  description: `Returns cross-references from each verse of a passage to related passages, strongest first within each verse, ${CROSS_REFERENCE_PAGE} per page with a cursor for the next page. Each item names the verse it starts from, the target as an OSIS id and a readable reference, and a web link. ${REFERENCE_GRAMMAR} ${RESULT_SHAPE}`,
  input: Schema.Struct({
    ref: Schema.String.annotate({ description: "The passage, such as Romans 8:28." }),
    limit: Schema.optional(
      Schema.Int.check(
        Schema.isGreaterThanOrEqualTo(1),
        Schema.isLessThanOrEqualTo(CROSS_REFERENCE_PAGE),
      ).annotate({ description: `Page size, at most ${CROSS_REFERENCE_PAGE}.` }),
    ),
    cursor: Schema.optional(
      Schema.String.annotate({ description: "Cursor from a previous page of this request." }),
    ),
  }),
  output: makeEnvelope(CrossReferenceItem),
  failure: Schema.Union([
    InvalidReference,
    InvalidCursor,
    ContentNotFound,
    ContentUnavailable,
    ContentCorrupt,
  ]),
  annotations: READ_ONLY,
  http: { method: "GET", path: "/v1/cross-references/:ref" },
})

export const getCrossReferences = implement(getCrossReferencesContract, (input) =>
  Effect.gen(function* () {
    const store = yield* ContentStore
    const { origin } = yield* Site
    const catalog = yield* readCatalog
    const passages = yield* parsePassages(input.ref)
    const offset = yield* decodeCursor(input.cursor, store.release, NAME)
    const limit = input.limit ?? CROSS_REFERENCE_PAGE
    const chapters = chaptersOf(passages)

    const all: Array<{ value: CrossReferenceItem; attribution: Attribution }> = []
    const resources: Array<ResourceCoverage> = []
    for (const resource of ofKind(catalog, "cross-references")) {
      const attribution = attributionOf(resource)
      const before = all.length
      for (const span of chapterSpans(passages)) {
        if (!hasChapter(resource, span)) continue
        const { payload } = yield* store.read(
          shardPaths.crossReferences(span.book, span.chapter),
          CrossReferenceShard,
        )
        if (payload.resourceId !== resource.id) continue
        for (const { verse, targets } of payload.verses) {
          if (!inSpan(span, verse)) continue
          for (const { target, votes } of targets) {
            const { display, url } = linkOf(origin, target)
            all.push({
              value: { from: `${span.book}.${span.chapter}.${verse}`, target, display, url, votes },
              attribution,
            })
          }
        }
      }
      resources.push(coverageEntry(resource, coverageOf(resource, chapters, all.length > before)))
    }

    return yield* envelope({
      items: all.slice(offset, offset + limit),
      resources,
      canonicalUrl: yield* passageUrl(passages[0]),
      cursor: nextCursor(store.release, NAME, offset + limit, all.length),
    })
  }),
)
