import { defineContract, implement } from "@reformed-bible/capability"
import { Effect, Schema } from "effect"
import {
  ContentCorrupt,
  ContentNotFound,
  ContentStore,
  ContentUnavailable,
} from "../content-store/index.ts"
import { LexiconEntry } from "../content/index.ts"
import { makeEnvelope } from "../envelope/index.ts"
import { lexiconBucket, LexiconShard, shardPaths } from "../shards/index.ts"
import { Site } from "../site/index.ts"
import { EntryNotFound } from "./errors.ts"
import {
  attributionOf,
  coverageEntry,
  envelope,
  ofKind,
  READ_ONLY,
  readCatalog,
  RESULT_SHAPE,
} from "./shared.ts"

export const getLexiconEntryContract = defineContract("get_lexicon_entry", {
  description: `Returns the lexicon entry for a Greek or Hebrew word: lemma, transliteration, gloss and definition, from STEPBible's brief lexicons. Pass a STEPBible number such as G6063 (the stepStrongs of a word from get_verse_words), or a classic Strong's number such as G1492, which returns the entries filed under that number. A number with no entry fails with EntryNotFound. ${RESULT_SHAPE}`,
  input: Schema.Struct({
    strongs: Schema.String.check(Schema.isPattern(/^[GHgh]\d{1,5}[A-Za-z]?$/)).annotate({
      description: "Strong's or STEPBible number: G or H, digits, and an optional letter.",
    }),
  }),
  output: makeEnvelope(LexiconEntry),
  failure: Schema.Union([EntryNotFound, ContentNotFound, ContentUnavailable, ContentCorrupt]),
  annotations: READ_ONLY,
  http: { method: "GET", path: "/v1/lexicon/:strongs" },
})

export const getLexiconEntry = implement(getLexiconEntryContract, (input) =>
  Effect.gen(function* () {
    const store = yield* ContentStore
    const { origin } = yield* Site
    const number = input.strongs.trim().toUpperCase()
    const lexicons = ofKind(yield* readCatalog, "lexicon")
    const active = lexicons.filter((r) => r.status.state === "active")

    // The release files every entry under both its STEPBible and its classic number's bucket.
    const entries =
      active.length === 0
        ? []
        : (yield* store
            .read(shardPaths.lexicon(lexiconBucket(number)), LexiconShard)
            .pipe(
              Effect.catchTag("ContentNotFound", () => Effect.succeed({ payload: [] })),
            )).payload.filter((e) => active.some((r) => r.id === e.resourceId))
    const exact = entries.filter((e) => e.stepStrongs === number)
    const matches = exact.length > 0 ? exact : entries.filter((e) => e.strongs === number)
    if (active.length > 0 && matches.length === 0)
      return yield* new EntryNotFound({ resourceId: active[0]?.id ?? "", entry: number })

    return yield* envelope({
      items: matches.flatMap((value) => {
        const resource = active.find((r) => r.id === value.resourceId)
        return resource === undefined ? [] : [{ value, attribution: attributionOf(resource) }]
      }),
      resources: lexicons.map((r) =>
        coverageEntry(
          r,
          r.status.state !== "active"
            ? "not_ingested"
            : matches.some((m) => m.resourceId === r.id)
              ? "covered"
              : "no_entry",
        ),
      ),
      canonicalUrl: `${origin}/`,
    })
  }),
)
