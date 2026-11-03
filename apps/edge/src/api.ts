import { toHttpApi } from "@reformed-bible/capability/http-api"
import { capabilities } from "@reformed-bible/core"
import { Effect, FileSystem, Layer, Path, Schema } from "effect"
import { Etag, HttpPlatform, HttpRouter } from "effect/http"
import { HttpApiBuilder, OpenApi } from "effect/http-api"
import { contentLayer, type ContentOptions } from "./content.ts"
import { RETRY_AFTER_SECONDS } from "./rate-limit.ts"

export const RateLimited = Schema.Struct({
  error: Schema.Literal("rate_limited"),
  retry_after_seconds: Schema.Int,
}).annotate({
  identifier: "RateLimited",
  description:
    "Too many requests from this caller in the last 60 seconds. Retry after the number of seconds in the Retry-After header.",
  httpApiStatus: 429,
})

const DESCRIPTION =
  "Read-only access to openly licensed Reformed study resources: Bible text, commentary, confessions and catechisms, cross-references and original-language data. No account or key is needed. Every item carries its attribution and license. Coverage states are an open set: treat an unknown state as no_entry. Results always come from the dataset release this deploy pinned; the release id in a result is informational."

export const apiProjection = toHttpApi("Reformed Bible Study API", capabilities, {
  errors: [RateLimited],
})

const api = apiProjection.api.annotateMerge(
  OpenApi.annotations({ description: DESCRIPTION, version: "1" }),
)

/** Platform services the API builder needs; the Worker has no filesystem. */
const platform = Layer.mergeAll(Path.layer, Etag.layerWeak, HttpPlatform.layer).pipe(
  Layer.provideMerge(FileSystem.layerNoop({})),
)

export const apiHandler = (content: ContentOptions) => {
  const { handler } = HttpRouter.toWebHandler(
    HttpApiBuilder.layer(api, { openapiPath: "/v1/openapi.json" }).pipe(
      Layer.provide(apiProjection.layer),
      Layer.provide(contentLayer(content)),
      Layer.provide(platform),
    ),
    { disableLogger: true },
  )
  return (request: Request) => Effect.promise(() => handler(request))
}

export const rateLimitedResponse = (): Response =>
  Response.json(
    { error: "rate_limited", retry_after_seconds: RETRY_AFTER_SECONDS },
    { status: 429, headers: { "retry-after": String(RETRY_AFTER_SECONDS) } },
  )
