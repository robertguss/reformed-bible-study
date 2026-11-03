import { Effect, Result } from "effect"
import { ContentStore } from "../content-store/index.ts"
import type { Attribution, Coverage, Envelope, ResourceCoverage } from "../envelope/index.ts"
import {
  type BookId,
  bookByOsis,
  books,
  chapterCount,
  formatPassage,
  overlaps,
  parseOsis,
  parseReference,
  type Passage,
  verseCount,
} from "../reference/index.ts"
import { type CatalogResource, CatalogShard, ConfessionShard, shardPaths } from "../shards/index.ts"
import { passagePath, Site } from "../site/index.ts"
import { UnknownResource } from "./errors.ts"

export const REFERENCE_GRAMMAR =
  'A reference is plain English such as "Romans 8:28", "Rom 8:28-30", "Psalm 23" or "1 John 4:7-8, 19", or an OSIS id such as "Rom.8.28" or "Rom.8.28-Rom.8.30". Verse numbers follow the King James Version in every translation and resource. An invalid reference fails with InvalidReference and, when the book exists, the nearest valid passage as a suggestion.'

export const RESULT_SHAPE =
  "Every item carries its attribution: resource id, author, work, edition, SPDX license, license URL, attribution text and source URL. Quote only from returned items and name the source. `resources` reports each resource's coverage of the request (covered, not_ingested, outside_work or no_entry; treat any other value as no_entry) and its status, with the reason when withdrawn. Results carry the dataset release and a canonical web URL; a `cursor` means more results are available by repeating the request with it."

export const READ_ONLY = { readOnly: true, idempotent: true } as const

export const readCatalog = Effect.gen(function* () {
  const store = yield* ContentStore
  const shard = yield* store.read(shardPaths.catalog, CatalogShard)
  return shard.payload.resources
})

export const findResource = (
  catalog: ReadonlyArray<CatalogResource>,
  id: string,
  kind: CatalogResource["kind"],
): Effect.Effect<CatalogResource, UnknownResource> => {
  const resource = catalog.find((r) => r.id === id && r.kind === kind)
  return resource === undefined
    ? Effect.fail(new UnknownResource({ resourceId: id, kind }))
    : Effect.succeed(resource)
}

export const ofKind = (
  catalog: ReadonlyArray<CatalogResource>,
  kind: CatalogResource["kind"],
): ReadonlyArray<CatalogResource> => catalog.filter((r) => r.kind === kind)

export const attributionOf = (resource: CatalogResource): Attribution => ({
  resourceId: resource.id,
  author: resource.creator,
  work: resource.title,
  edition: resource.edition,
  license: resource.license.spdx,
  licenseUrl: resource.license.url ?? "",
  attributionText: resource.attribution.text,
  sourceUrl: resource.sourceUrl,
})

export const coverageEntry = (resource: CatalogResource, coverage: Coverage): ResourceCoverage => ({
  resourceId: resource.id,
  coverage,
  status: resource.status,
})

export interface ChapterRef {
  readonly book: BookId
  readonly chapter: number
}

export interface ChapterSpan extends ChapterRef {
  readonly ranges: ReadonlyArray<{ readonly from: number; readonly to: number }>
}

const nextChapter = ({ book, chapter }: ChapterRef): ChapterRef | undefined => {
  if (chapter < chapterCount(book)) return { book, chapter: chapter + 1 }
  const next = books[bookByOsis(book)?.ordinal ?? books.length]
  return next === undefined ? undefined : { book: next.id, chapter: 1 }
}

export const chapterSpans = (passages: ReadonlyArray<Passage>): ReadonlyArray<ChapterSpan> => {
  const spans: Array<{
    book: BookId
    chapter: number
    ranges: Array<{ from: number; to: number }>
  }> = []
  for (const { start, end } of passages) {
    let at: ChapterRef | undefined = { book: start.book, chapter: start.chapter }
    while (at !== undefined) {
      const isStart: boolean = at.book === start.book && at.chapter === start.chapter
      const isEnd: boolean = at.book === end.book && at.chapter === end.chapter
      const range = {
        from: isStart ? start.verse : 1,
        to: isEnd ? end.verse : verseCount(at.book, at.chapter),
      }
      const last = spans.at(-1)
      if (last !== undefined && last.book === at.book && last.chapter === at.chapter)
        last.ranges.push(range)
      else spans.push({ book: at.book, chapter: at.chapter, ranges: [range] })
      at = isEnd ? undefined : nextChapter(at)
    }
  }
  return spans
}

export const chaptersOf = (passages: ReadonlyArray<Passage>): ReadonlyArray<ChapterRef> => {
  const seen = new Set<string>()
  return chapterSpans(passages).filter(({ book, chapter }) => {
    const key = `${book}.${chapter}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export const inSpan = (span: ChapterSpan, verse: number): boolean =>
  span.ranges.some(({ from, to }) => verse >= from && verse <= to)

const inScope = (resource: CatalogResource, book: BookId): boolean =>
  resource.scope === undefined || resource.scope.includes(book)

const isIngested = (resource: CatalogResource, { book, chapter }: ChapterRef): boolean =>
  resource.ingested.some((entry) => entry.book === book && entry.chapters.includes(chapter))

/** True when the release must hold this resource's file for the chapter; its absence is then an error. */
export const hasChapter = (resource: CatalogResource, chapter: ChapterRef): boolean =>
  resource.status.state === "active" &&
  inScope(resource, chapter.book) &&
  isIngested(resource, chapter)

export const coverageOf = (
  resource: CatalogResource,
  chapters: ReadonlyArray<ChapterRef>,
  hasItems: boolean,
): Coverage => {
  const scoped = chapters.filter((c) => inScope(resource, c.book))
  if (scoped.length === 0) return "outside_work"
  if (!scoped.some((c) => isIngested(resource, c))) return "not_ingested"
  return hasItems ? "covered" : "no_entry"
}

/** Whether this release holds a confession's text, as the catalog records it. */
export const holdsConfession = (resource: CatalogResource): boolean =>
  resource.status.state === "active" && resource.available

/**
 * A confession's full text, or undefined when the catalog says the release does not hold it.
 * A missing file for a confession the catalog lists as available is a content error.
 */
export const readConfession = (resource: CatalogResource) =>
  !holdsConfession(resource)
    ? Effect.undefined
    : Effect.gen(function* () {
        const store = yield* ContentStore
        const shard = yield* store.read(shardPaths.confession(resource.id), ConfessionShard)
        return shard.payload
      })

export const parsePassages = (ref: string) => Effect.fromResult(parseReference(ref))

export const passageOfOsis = (osis: string): Passage | undefined =>
  Result.getOrUndefined(parseOsis(osis))

export const overlapsAny = (osis: string, passages: ReadonlyArray<Passage>): boolean => {
  const passage = passageOfOsis(osis)
  return passage !== undefined && passages.some((p) => overlaps(p, passage))
}

const urlOf = (origin: string, passage: Passage | undefined): string =>
  passage === undefined ? `${origin}/` : `${origin}${passagePath(passage)}`

export const linkOf = (origin: string, osis: string) => {
  const passage = passageOfOsis(osis)
  return {
    osis,
    display: passage === undefined ? osis : formatPassage(passage),
    url: urlOf(origin, passage),
  }
}

export const passageUrl = Effect.fnUntraced(function* (passage: Passage | undefined) {
  const { origin } = yield* Site
  return urlOf(origin, passage)
})

export const envelope = <A>(fields: {
  readonly items: Envelope<A>["items"]
  readonly resources: Envelope<A>["resources"]
  readonly canonicalUrl: string
  readonly cursor?: string | undefined
}): Effect.Effect<Envelope<A>, never, ContentStore> =>
  Effect.gen(function* () {
    const store = yield* ContentStore
    return {
      items: fields.items,
      resources: fields.resources,
      datasetRelease: store.release,
      canonicalUrl: fields.canonicalUrl,
      versificationNotes: [],
      ...(fields.cursor === undefined ? {} : { cursor: fields.cursor }),
    }
  })
