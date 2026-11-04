import { defineContract, implement } from "@reformed-bible/capability"
import { Effect, Schema } from "effect"
import { InvalidArticleIdentifier, parseArticleIdentifier } from "../confessions/index.ts"
import { ContentCorrupt, ContentNotFound, ContentUnavailable } from "../content-store/index.ts"
import { makeEnvelope } from "../envelope/index.ts"
import { confessionArticlePath, Site } from "../site/index.ts"
import { ArticleFields, articlesById, citationOf } from "./confession-shared.ts"
import { EntryNotFound, UnknownResource } from "./errors.ts"
import {
  attributionOf,
  coverageEntry,
  envelope,
  findResource,
  linkOf,
  READ_ONLY,
  readCatalog,
  readConfession,
  RESULT_SHAPE,
} from "./shared.ts"

const ProofLink = Schema.Struct({ osis: Schema.String, display: Schema.String, url: Schema.String })

export const ConfessionArticleItem = Schema.Struct({
  ...ArticleFields,
  /** Scripture proofs, one group per clause; `label` is the print's clause letter when it has one. */
  proofs: Schema.Array(
    Schema.Struct({ label: Schema.optionalKey(Schema.String), refs: Schema.Array(ProofLink) }),
  ),
})
export type ConfessionArticleItem = typeof ConfessionArticleItem.Type

export const getConfessionArticleContract = defineContract("get_confession_article", {
  description: `Returns one confession or catechism article with its text and Scripture proof texts, each proof with a readable reference and a web link. Identify the confession by its id from list_resources, such as wcf for the Westminster Confession of Faith, and the article in that confession's own numbering as get_confession_outline lists it, such as "3.6" for a chapter and section or "45" or "Q45" for a catechism question. A confession catalogued but not yet transcribed returns no items with coverage not_ingested. ${RESULT_SHAPE}`,
  input: Schema.Struct({
    id: Schema.String.annotate({ description: "Confession id from list_resources, such as wcf." }),
    article: Schema.String.annotate({
      description: "Article within the confession, as its outline numbers it, such as 3.6 or Q45.",
    }),
  }),
  output: makeEnvelope(ConfessionArticleItem),
  failure: Schema.Union([
    InvalidArticleIdentifier,
    UnknownResource,
    EntryNotFound,
    ContentNotFound,
    ContentUnavailable,
    ContentCorrupt,
  ]),
  annotations: READ_ONLY,
  http: { method: "GET", path: "/v1/confessions/:id/:article" },
})

export const getConfessionArticle = implement(getConfessionArticleContract, (input) =>
  Effect.gen(function* () {
    const { origin } = yield* Site
    const { confession: id, article: articleId } = yield* Effect.fromResult(
      parseArticleIdentifier(`${input.id} ${input.article}`),
    ).pipe(
      Effect.catchIf(
        (error) => error.reason === "unknown_confession",
        () =>
          Effect.fail(
            new UnknownResource({ resourceId: input.id.trim().toLowerCase(), kind: "confession" }),
          ),
      ),
    )
    const resource = yield* findResource(yield* readCatalog, id, "confession")
    const canonicalUrl = `${origin}${confessionArticlePath(id, articleId)}`
    const confession = yield* readConfession(resource)
    if (confession === undefined)
      return yield* envelope<ConfessionArticleItem>({
        items: [],
        resources: [coverageEntry(resource, "not_ingested")],
        canonicalUrl,
      })
    const located = articlesById(confession).get(articleId)
    if (located === undefined)
      return yield* new EntryNotFound({
        resourceId: id,
        entry: citationOf(confession, articleId),
      })
    const { article, division } = located
    return yield* envelope({
      items: [
        {
          value: {
            confession: id,
            abbreviation: confession.abbreviation,
            articleId,
            citation: citationOf(confession, articleId),
            label: article.label,
            division,
            url: canonicalUrl,
            ...(article.question === undefined ? {} : { question: article.question }),
            paragraphs: article.paragraphs,
            proofs: article.proofs.map((proof) => ({
              ...(proof.label === undefined ? {} : { label: proof.label }),
              refs: proof.refs.map((ref) => linkOf(origin, ref)),
            })),
          },
          attribution: attributionOf(resource),
        },
      ],
      resources: [coverageEntry(resource, "covered")],
      canonicalUrl,
    })
  }),
)
