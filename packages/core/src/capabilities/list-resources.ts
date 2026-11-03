import { defineContract, implement } from "@reformed-bible/capability"
import { Effect, Schema } from "effect"
import { ContentCorrupt, ContentNotFound, ContentUnavailable } from "../content-store/index.ts"
import { type Coverage, makeEnvelope } from "../envelope/index.ts"
import { type CatalogResource, CatalogResource as CatalogResourceSchema } from "../shards/index.ts"
import { Site } from "../site/index.ts"
import {
  attributionOf,
  coverageEntry,
  envelope,
  holdsConfession,
  READ_ONLY,
  readCatalog,
  RESULT_SHAPE,
} from "./shared.ts"

export const listResourcesContract = defineContract("list_resources", {
  description: `Lists every resource in the dataset (translations, commentaries, confessions and catechisms, cross-references, original-language texts and lexicons) with its kind, title, creator, edition, license, source and status. Each item gives the books the work covers (scope; absent means the whole Bible) and the chapters ingested in this release, so you can learn what exists and what is covered before asking for a passage. Use the ids it returns with the other tools. A withdrawn resource is listed with the reason it was withdrawn. ${RESULT_SHAPE}`,
  input: Schema.Struct({}),
  output: makeEnvelope(CatalogResourceSchema),
  failure: Schema.Union([ContentNotFound, ContentUnavailable, ContentCorrupt]),
  annotations: READ_ONLY,
  http: { method: "GET", path: "/v1/resources" },
})

const releaseCoverage = (resource: CatalogResource): Coverage => {
  if (resource.kind === "confession") return holdsConfession(resource) ? "covered" : "not_ingested"
  if (resource.kind === "lexicon")
    return resource.status.state === "active" ? "covered" : "not_ingested"
  return resource.ingested.length > 0 ? "covered" : "not_ingested"
}

export const listResources = implement(listResourcesContract, () =>
  Effect.gen(function* () {
    const { origin } = yield* Site
    const catalog = yield* readCatalog
    const resources = catalog.map((resource) => coverageEntry(resource, releaseCoverage(resource)))
    return yield* envelope({
      items: catalog.map((value) => ({ value, attribution: attributionOf(value) })),
      resources,
      canonicalUrl: `${origin}/`,
    })
  }),
)
