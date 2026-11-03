import { Schema } from "effect"

/**
 * A published file the request needs is missing. For an ingested chapter this means the deploy is
 * broken, so it is a server error and never a coverage state.
 */
export class ContentNotFound extends Schema.TaggedError<
  ContentNotFound,
  { readonly brand: unique symbol }
>()("ContentNotFound", { path: Schema.String }, { httpApiStatus: 500 }) {
  override get message(): string {
    return `Published file ${this.path} is missing from this dataset release`
  }
}

/** The content could not be reached, for example a network failure or a host error. */
export class ContentUnavailable extends Schema.TaggedError<
  ContentUnavailable,
  { readonly brand: unique symbol }
>()("ContentUnavailable", { path: Schema.String, reason: Schema.String }, { httpApiStatus: 503 }) {
  override get message(): string {
    return `Published file ${this.path} is unavailable: ${this.reason}`
  }
}

/** A published file was read but is not valid JSON or does not match its schema. */
export class ContentCorrupt extends Schema.TaggedError<
  ContentCorrupt,
  { readonly brand: unique symbol }
>()("ContentCorrupt", { path: Schema.String, reason: Schema.String }, { httpApiStatus: 500 }) {
  override get message(): string {
    return `Published file ${this.path} is unreadable: ${this.reason}`
  }
}

export type ContentStoreError = ContentNotFound | ContentUnavailable | ContentCorrupt

export const ContentStoreErrors = [ContentNotFound, ContentUnavailable, ContentCorrupt] as const
