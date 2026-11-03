import { Schema } from "effect"

/** The request names a resource the catalog does not list, or one of another kind. */
export class UnknownResource extends Schema.TaggedError<
  UnknownResource,
  { readonly brand: unique symbol }
>()("UnknownResource", { resourceId: Schema.String, kind: Schema.String }, { httpApiStatus: 404 }) {
  override get message(): string {
    return `No ${this.kind} with id "${this.resourceId}" is catalogued. Call list_resources for the ids that exist.`
  }
}

/** A resource exists but has no entry with the requested identifier. */
export class EntryNotFound extends Schema.TaggedError<
  EntryNotFound,
  { readonly brand: unique symbol }
>()("EntryNotFound", { resourceId: Schema.String, entry: Schema.String }, { httpApiStatus: 404 }) {
  override get message(): string {
    return `${this.resourceId} has no entry ${this.entry}`
  }
}

export const InvalidCursorReasons = ["malformed", "other_release"] as const

/** A continuation cursor that cannot be used: unreadable, or issued for another dataset release. */
export class InvalidCursor extends Schema.TaggedError<
  InvalidCursor,
  { readonly brand: unique symbol }
>()("InvalidCursor", {
  cursor: Schema.String,
  reason: Schema.Literals(InvalidCursorReasons),
}) {
  override get message(): string {
    return this.reason === "other_release"
      ? "This cursor belongs to another dataset release. Repeat the request without a cursor."
      : "This cursor is not one this capability issued. Repeat the request without a cursor."
  }
}
