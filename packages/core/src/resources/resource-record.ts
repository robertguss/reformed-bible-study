import { Schema } from "effect"
import { BOOK_IDS } from "../reference/index.ts"
import { HttpsUrl, PlainText } from "./text.ts"

export const ResourceKinds = [
  "translation",
  "commentary",
  "confession",
  "cross-references",
  "original-language",
  "lexicon",
] as const

export const Surfaces = ["web", "api", "mcp", "dataset"] as const
export type Surface = (typeof Surfaces)[number]

export const ResourceId = Schema.String.check(Schema.isPattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/))

const NonEmptyPlainText = PlainText.check(Schema.isMinLength(1))

export const ResourceStatus = Schema.Union([
  Schema.Struct({ state: Schema.Literal("active") }),
  Schema.Struct({ state: Schema.Literal("withdrawn"), reason: NonEmptyPlainText }),
])
export type ResourceStatus = typeof ResourceStatus.Type

const SourceFile = Schema.Struct({
  url: HttpsUrl,
  sha256: Schema.String.check(Schema.isPattern(/^[0-9a-f]{64}$/)),
})

export const ResourceRecord = Schema.Struct({
  id: ResourceId,
  kind: Schema.Literals(ResourceKinds),
  title: NonEmptyPlainText,
  creator: NonEmptyPlainText,
  edition: NonEmptyPlainText,
  language: Schema.String.check(Schema.isPattern(/^[a-z]{2,3}$/)),
  /** Books the work itself covers, whether or not they are ingested yet. Absent means the whole Bible. */
  scope: Schema.optionalKey(Schema.Array(Schema.Literals(BOOK_IDS))),
  source: Schema.Struct({
    url: HttpsUrl,
    retrievedAt: Schema.String.check(Schema.isPattern(/^\d{4}-\d{2}-\d{2}$/)),
    files: Schema.Array(SourceFile),
  }),
  license: Schema.Struct({
    spdx: Schema.String.check(Schema.isPattern(/^[A-Za-z0-9.+-]+$/)),
    evidence: Schema.Array(Schema.Struct({ url: HttpsUrl, quote: NonEmptyPlainText })).check(
      Schema.isMinLength(1),
    ),
  }),
  attribution: Schema.Struct({
    text: PlainText,
    perQuoteSuffix: Schema.optionalKey(PlainText),
  }),
  modifications: PlainText,
  permission: Schema.optionalKey(
    Schema.String.check(Schema.isPattern(/^permissions\/[a-z0-9-]+\.(?:md|txt|pdf)$/)),
  ),
  surfaces: Schema.Array(Schema.Literals(Surfaces)).check(
    Schema.isMinLength(1),
    Schema.isUnique({ message: "must not repeat a surface" }),
  ),
  status: ResourceStatus,
})
export type ResourceRecord = typeof ResourceRecord.Type
