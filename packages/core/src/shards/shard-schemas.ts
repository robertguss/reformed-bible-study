import { Schema } from "effect"
import {
  CommentarySection,
  Confession,
  CrossReferenceChapter,
  LexiconEntry,
  OriginalChapter,
  TranslationChapter,
} from "../content/index.ts"
import { BOOK_IDS, type BookId } from "../reference/index.ts"
import { ResourceId, ResourceKinds, ResourceStatus, Surfaces } from "../resources/index.ts"

const Book = Schema.Literals(BOOK_IDS)
const PositiveInt = Schema.Int.check(Schema.isGreaterThanOrEqualTo(1))

/** Every published file wraps its payload with the dataset release it belongs to. */
export const makeShard = <S extends Schema.Top>(payload: S) =>
  Schema.Struct({ release: Schema.String, payload })

/** The commentary sections that overlap one chapter, including sections that start in the previous chapter. */
export const CommentaryChapter = Schema.Struct({
  resourceId: ResourceId,
  book: Book,
  chapter: PositiveInt,
  sections: Schema.Array(CommentarySection),
})
export type CommentaryChapter = typeof CommentaryChapter.Type

export const ConfessionCitation = Schema.Struct({
  resourceId: ResourceId,
  articleId: Schema.String,
  label: Schema.String,
})
export type ConfessionCitation = typeof ConfessionCitation.Type

/** For each verse of a chapter, the confession articles whose proof texts include it. */
export const ConfessionIndexChapter = Schema.Struct({
  book: Book,
  chapter: PositiveInt,
  verses: Schema.Array(
    Schema.Struct({ verse: PositiveInt, citations: Schema.Array(ConfessionCitation) }),
  ),
})
export type ConfessionIndexChapter = typeof ConfessionIndexChapter.Type

/** One resource as listed in the catalog: what it is, how to credit it, and which chapters are ingested. */
export const CatalogResource = Schema.Struct({
  id: ResourceId,
  kind: Schema.Literals(ResourceKinds),
  title: Schema.String,
  creator: Schema.String,
  edition: Schema.String,
  language: Schema.String,
  license: Schema.Struct({ spdx: Schema.String, url: Schema.optionalKey(Schema.String) }),
  attribution: Schema.Struct({
    text: Schema.String,
    perQuoteSuffix: Schema.optionalKey(Schema.String),
  }),
  sourceUrl: Schema.String,
  surfaces: Schema.Array(Schema.Literals(Surfaces)),
  status: ResourceStatus,
  /** Books the work itself covers. Absent means the whole Bible. */
  scope: Schema.optionalKey(Schema.Array(Book)),
  /** Whether this release holds the resource's content. A missing file for an available resource is an error. */
  available: Schema.Boolean,
  /** Chapters with content in this release, by book. Empty for whole-work resources such as confessions. */
  ingested: Schema.Array(Schema.Struct({ book: Book, chapters: Schema.Array(PositiveInt) })),
})
export type CatalogResource = typeof CatalogResource.Type

export const Catalog = Schema.Struct({ resources: Schema.Array(CatalogResource) })
export type Catalog = typeof Catalog.Type

export const TextShard = makeShard(TranslationChapter)
export const CommentaryShard = makeShard(CommentaryChapter)
export const CrossReferenceShard = makeShard(CrossReferenceChapter)
export const WordsShard = makeShard(OriginalChapter)
export const ConfessionIndexShard = makeShard(ConfessionIndexChapter)
export const ConfessionShard = makeShard(Confession)
export const LexiconShard = makeShard(Schema.Array(LexiconEntry))
export const CatalogShard = makeShard(Catalog)

/** Paths of published files, relative to the release directory. */
export const shardPaths = {
  text: (resourceId: string, book: BookId, chapter: number) =>
    `text/${resourceId}/${book}.${chapter}.json`,
  commentary: (resourceId: string, book: BookId, chapter: number) =>
    `commentary/${resourceId}/${book}.${chapter}.json`,
  crossReferences: (book: BookId, chapter: number) => `xrefs/${book}.${chapter}.json`,
  words: (book: BookId, chapter: number) => `words/${book}.${chapter}.json`,
  confessionIndex: (book: BookId, chapter: number) => `confession-index/${book}.${chapter}.json`,
  confession: (resourceId: string) => `confessions/${resourceId}.json`,
  lexicon: (bucket: string) => `lexicon/${bucket}.json`,
  catalog: "catalog.json",
} as const

/** Lexicon entries are grouped by the hundreds of their STEPBible number: G1400-G1499 is bucket G14. */
export const lexiconBucket = (stepStrongs: string): string => {
  const match = /^([GH])(\d+)/.exec(stepStrongs)
  return match === null ? "other" : `${match[1]}${Math.floor(Number(match[2]) / 100)}`
}

export const shardSchemaFor = (path: string): Schema.Top => {
  if (path === shardPaths.catalog) return CatalogShard
  const [kind] = path.split("/")
  switch (kind) {
    case "text":
      return TextShard
    case "commentary":
      return CommentaryShard
    case "xrefs":
      return CrossReferenceShard
    case "words":
      return WordsShard
    case "confession-index":
      return ConfessionIndexShard
    case "confessions":
      return ConfessionShard
    case "lexicon":
      return LexiconShard
    default:
      throw new Error(`no schema for published file ${path}`)
  }
}
