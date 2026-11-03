import { defineContract, implement } from "@reformed-bible/capability"
import { Effect, Schema } from "effect"
import { type Attribution, makeEnvelope } from "../envelope/index.ts"
import { formatPassage, InvalidReference, toOsis, VerseRef } from "../reference/index.ts"
import { licenseUrl } from "../resources/index.ts"
import { envelope, parsePassages, passageUrl, READ_ONLY, REFERENCE_GRAMMAR } from "./shared.ts"

export const ResolvedPassage = Schema.Struct({
  osis: Schema.String,
  display: Schema.String,
  start: VerseRef,
  end: VerseRef,
  url: Schema.String,
})
export type ResolvedPassage = typeof ResolvedPassage.Type

const REFERENCE_ATTRIBUTION: Attribution = {
  resourceId: "bible-passage-reference-parser",
  author: "OpenBible.info",
  work: "Bible Passage Reference Parser, with its KJV verse-count table",
  edition: "bible-passage-reference-parser 4.0.0",
  license: "MIT",
  licenseUrl: licenseUrl("MIT") ?? "",
  attributionText:
    "References are parsed and verse counts taken from bible-passage-reference-parser by OpenBible.info, MIT license.",
  sourceUrl: "https://github.com/openbibleinfo/Bible-Passage-Reference-Parser",
}

export const resolveReferenceContract = defineContract("resolve_reference", {
  description: `Resolves a free-form Bible reference to canonical passages: OSIS ids, a readable form, the first and last verse, and the web link for each. Use it to check a reference before calling other tools, or to turn a reader's wording into OSIS ids. ${REFERENCE_GRAMMAR}`,
  input: Schema.Struct({
    q: Schema.String.annotate({ description: "The reference to resolve, such as Rom 8:28-30." }),
  }),
  output: makeEnvelope(ResolvedPassage),
  failure: InvalidReference,
  annotations: READ_ONLY,
  http: { method: "GET", path: "/v1/references/resolve" },
})

export const resolveReference = implement(resolveReferenceContract, (input) =>
  Effect.gen(function* () {
    const passages = yield* parsePassages(input.q)
    const items: Array<{ value: ResolvedPassage; attribution: Attribution }> = []
    for (const passage of passages)
      items.push({
        value: {
          osis: toOsis(passage),
          display: formatPassage(passage),
          start: passage.start,
          end: passage.end,
          url: yield* passageUrl(passage),
        },
        attribution: REFERENCE_ATTRIBUTION,
      })
    return yield* envelope({ items, resources: [], canonicalUrl: yield* passageUrl(passages[0]) })
  }),
)
