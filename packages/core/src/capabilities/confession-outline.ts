import { defineContract, implement } from "@reformed-bible/capability"
import { Effect, Schema } from "effect"
import { ContentCorrupt, ContentNotFound, ContentUnavailable } from "../content-store/index.ts"
import { makeEnvelope, TextRuns } from "../envelope/index.ts"
import { confessionArticlePath, confessionPath, Site } from "../site/index.ts"
import { citationOf } from "./confession-shared.ts"
import { UnknownResource } from "./errors.ts"
import {
  attributionOf,
  coverageEntry,
  envelope,
  findResource,
  READ_ONLY,
  readCatalog,
  readConfession,
  RESULT_SHAPE,
} from "./shared.ts"

export const ConfessionOutline = Schema.Struct({
  confession: Schema.String,
  abbreviation: Schema.String,
  title: Schema.String,
  url: Schema.String,
  divisions: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      title: Schema.String,
      articles: Schema.Array(
        Schema.Struct({
          id: Schema.String,
          citation: Schema.String,
          label: Schema.String,
          url: Schema.String,
          /** A catechism question, so the outline of a catechism reads as its questions. */
          question: Schema.optionalKey(TextRuns),
        }),
      ),
    }),
  ),
})
export type ConfessionOutline = typeof ConfessionOutline.Type

export const getConfessionOutlineContract = defineContract("get_confession_outline", {
  description: `Returns the outline of a confession or catechism: its chapters with their titles and the articles in each, or a catechism's questions, each with its citation and web link. Use it to find an article, then get_confession_article to read it. Confession ids come from list_resources, such as wcf, wlc and wsc. ${RESULT_SHAPE}`,
  input: Schema.Struct({
    id: Schema.String.annotate({ description: "Confession id, such as wcf, wlc or wsc." }),
  }),
  output: makeEnvelope(ConfessionOutline),
  failure: Schema.Union([UnknownResource, ContentNotFound, ContentUnavailable, ContentCorrupt]),
  annotations: READ_ONLY,
  http: { method: "GET", path: "/v1/confessions/:id/outline" },
})

export const getConfessionOutline = implement(getConfessionOutlineContract, (input) =>
  Effect.gen(function* () {
    const { origin } = yield* Site
    const id = input.id.trim().toLowerCase()
    const resource = yield* findResource(yield* readCatalog, id, "confession")
    const canonicalUrl = `${origin}${confessionPath(id)}`
    const confession = yield* readConfession(resource)
    if (confession === undefined)
      return yield* envelope<ConfessionOutline>({
        items: [],
        resources: [coverageEntry(resource, "not_ingested")],
        canonicalUrl,
      })
    return yield* envelope({
      items: [
        {
          value: {
            confession: id,
            abbreviation: confession.abbreviation,
            title: confession.title,
            url: canonicalUrl,
            divisions: confession.divisions.map((division) => ({
              id: division.id,
              title: division.title,
              articles: division.articles.map((article) => ({
                id: article.id,
                citation: citationOf(confession, article.id),
                label: article.label,
                url: `${origin}${confessionArticlePath(id, article.id)}`,
                ...(article.question === undefined ? {} : { question: article.question }),
              })),
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
