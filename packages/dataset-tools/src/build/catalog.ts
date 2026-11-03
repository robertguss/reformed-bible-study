import {
  type BookId,
  type Catalog,
  type CatalogResource,
  type CommentaryChapter,
  type CrossReferenceChapter,
  type OriginalChapter,
  type ResourceRecord,
  type TranslationChapter,
  books,
  licenseUrl,
} from "@reformed-bible/core"

export interface IngestedChapters {
  readonly translations: ReadonlyArray<TranslationChapter>
  readonly commentaries: ReadonlyArray<CommentaryChapter>
  readonly crossReferences: ReadonlyArray<CrossReferenceChapter>
  readonly originals: ReadonlyArray<OriginalChapter>
}

const canonOrder = new Map<string, number>(books.map((b) => [b.id, b.ordinal]))

const ingestedFor = (id: string, content: IngestedChapters): CatalogResource["ingested"] => {
  const byBook = new Map<BookId, Set<number>>()
  const add = (book: BookId, chapter: number) => {
    const set = byBook.get(book) ?? new Set<number>()
    set.add(chapter)
    byBook.set(book, set)
  }
  for (const list of [
    content.translations,
    content.commentaries,
    content.crossReferences,
    content.originals,
  ]) {
    for (const chapter of list) if (chapter.resourceId === id) add(chapter.book, chapter.chapter)
  }
  return [...byBook]
    .sort(([a], [b]) => (canonOrder.get(a) ?? 0) - (canonOrder.get(b) ?? 0))
    .map(([book, chapters]) => ({ book, chapters: [...chapters].sort((a, b) => a - b) }))
}

export const buildCatalog = (
  records: ReadonlyArray<ResourceRecord>,
  content: IngestedChapters,
): Catalog => ({
  resources: records.map((record) => {
    const url = licenseUrl(record.license.spdx)
    return {
      id: record.id,
      kind: record.kind,
      title: record.title,
      creator: record.creator,
      edition: record.edition,
      language: record.language,
      license:
        url === undefined ? { spdx: record.license.spdx } : { spdx: record.license.spdx, url },
      attribution: record.attribution,
      sourceUrl: record.source.url,
      surfaces: record.surfaces,
      status: record.status,
      ...(record.scope === undefined ? {} : { scope: record.scope }),
      ingested: record.status.state === "withdrawn" ? [] : ingestedFor(record.id, content),
    }
  }),
})
