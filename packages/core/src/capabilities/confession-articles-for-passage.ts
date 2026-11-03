import { defineContract, implement } from "@reformed-bible/capability"
import { Effect, Schema } from "effect"
import {
  ContentCorrupt,
  ContentNotFound,
  ContentStore,
  ContentUnavailable,
} from "../content-store/index.ts"
import type { Attribution, ResourceCoverage } from "../envelope/index.ts"
import { makeEnvelope } from "../envelope/index.ts"
import { InvalidReference } from "../reference/index.ts"
import { ConfessionIndexShard, shardPaths } from "../shards/index.ts"
import { confessionArticlePath, Site } from "../site/index.ts"
import { ArticleFields, articlesById, citationOf } from "./confession-shared.ts"
import {
  attributionOf,
  chapterSpans,
  coverageEntry,
  envelope,
  inSpan,
  ofKind,
  parsePassages,
  passageUrl,
  READ_ONLY,
  readCatalog,
  readConfession,
  REFERENCE_GRAMMAR,
  RESULT_SHAPE,
} from "./shared.ts"

const NAME = "find_confession_articles"

export const CitingArticle = Schema.Struct({
  ...ArticleFields,
  /** The verses of the request this article's proof texts cite. */
  citedVerses: Schema.Array(Schema.String),
})
export type CitingArticle = typeof CitingArticle.Type

export const findConfessionArticlesContract = defineContract(NAME, {
  description: `Finds the confession and catechism articles whose Scripture proofs cite a passage, such as the Westminster Confession, Larger Catechism and Shorter Catechism articles citing Romans 8:28. Each item gives the article's citation (for example "WCF 3.6" or "WLC Q45"), its text, and which verses of the request it cites; get_confession_article returns its full proof texts. Coverage is reported for every catalogued confession: not_ingested for one not yet transcribed, no_entry when none of its articles cite the passage. ${REFERENCE_GRAMMAR} ${RESULT_SHAPE}`,
  input: Schema.Struct({
    ref: Schema.String.annotate({ description: "The passage, such as Romans 8:28." }),
  }),
  output: makeEnvelope(CitingArticle),
  failure: Schema.Union([InvalidReference, ContentNotFound, ContentUnavailable, ContentCorrupt]),
  annotations: READ_ONLY,
  http: { method: "GET", path: "/v1/confessions/articles/:ref" },
})

export const findConfessionArticles = implement(findConfessionArticlesContract, (input) =>
  Effect.gen(function* () {
    const store = yield* ContentStore
    const { origin } = yield* Site
    const catalog = yield* readCatalog
    const passages = yield* parsePassages(input.ref)

    // Verses each article cites, keyed by confession then article id.
    const cited = new Map<string, Map<string, Array<string>>>()
    for (const span of chapterSpans(passages)) {
      // The release writes an index file only for chapters some article cites.
      const index = yield* store
        .read(shardPaths.confessionIndex(span.book, span.chapter), ConfessionIndexShard)
        .pipe(Effect.catchTag("ContentNotFound", () => Effect.undefined))
      for (const { verse, citations } of index?.payload.verses ?? []) {
        if (!inSpan(span, verse)) continue
        for (const { resourceId, articleId } of citations) {
          const articles = cited.get(resourceId) ?? new Map<string, Array<string>>()
          const verses = articles.get(articleId) ?? []
          verses.push(`${span.book}.${span.chapter}.${verse}`)
          articles.set(articleId, verses)
          cited.set(resourceId, articles)
        }
      }
    }

    const items: Array<{ value: CitingArticle; attribution: Attribution }> = []
    const resources: Array<ResourceCoverage> = []
    for (const resource of ofKind(catalog, "confession")) {
      const confession = yield* readConfession(resource)
      if (confession === undefined) {
        resources.push(coverageEntry(resource, "not_ingested"))
        continue
      }
      const verses = cited.get(resource.id) ?? new Map<string, Array<string>>()
      const attribution = attributionOf(resource)
      const before = items.length
      for (const [articleId, { article, division }] of articlesById(confession)) {
        const citedVerses = verses.get(articleId)
        if (citedVerses === undefined) continue
        items.push({
          value: {
            confession: resource.id,
            abbreviation: confession.abbreviation,
            articleId,
            citation: citationOf(confession, articleId),
            label: article.label,
            division,
            url: `${origin}${confessionArticlePath(resource.id, articleId)}`,
            ...(article.question === undefined ? {} : { question: article.question }),
            paragraphs: article.paragraphs,
            citedVerses,
          },
          attribution,
        })
      }
      resources.push(coverageEntry(resource, items.length > before ? "covered" : "no_entry"))
    }

    return yield* envelope({
      items,
      resources,
      canonicalUrl: yield* passageUrl(passages[0]),
    })
  }),
)
