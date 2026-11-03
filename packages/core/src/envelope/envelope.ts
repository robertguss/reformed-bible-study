import { Schema } from "effect"
import { ResourceId } from "../resources/index.ts"
import { ResourceCoverage } from "./coverage.ts"

export const TextRun = Schema.Struct({
  text: Schema.String,
  emphasis: Schema.optionalKey(Schema.Boolean),
})
export type TextRun = typeof TextRun.Type
export const TextRuns = Schema.Array(TextRun)

export const Attribution = Schema.Struct({
  resourceId: ResourceId,
  author: Schema.String,
  work: Schema.String,
  edition: Schema.String,
  license: Schema.String,
  licenseUrl: Schema.String,
  attributionText: Schema.String,
  sourceUrl: Schema.String,
})
export type Attribution = typeof Attribution.Type

export const makeEnvelope = <S extends Schema.Top>(item: S) =>
  Schema.Struct({
    items: Schema.Array(Schema.Struct({ value: item, attribution: Attribution })),
    resources: Schema.Array(ResourceCoverage),
    datasetRelease: Schema.String,
    canonicalUrl: Schema.String,
    versificationNotes: Schema.Array(Schema.String),
    cursor: Schema.optionalKey(Schema.String),
  })

export interface Envelope<A> {
  readonly items: ReadonlyArray<{ readonly value: A; readonly attribution: Attribution }>
  readonly resources: ReadonlyArray<ResourceCoverage>
  readonly datasetRelease: string
  readonly canonicalUrl: string
  readonly versificationNotes: ReadonlyArray<string>
  readonly cursor?: string
}
