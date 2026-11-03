import { Effect, Schema } from "effect"
import { InvalidCursor } from "./errors.ts"

const CursorState = Schema.fromJsonString(
  Schema.Struct({
    release: Schema.String,
    capability: Schema.String,
    offset: Schema.Int.check(Schema.isGreaterThanOrEqualTo(1)),
  }),
)

const toBase64Url = (text: string): string =>
  btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")

const fromBase64Url = (text: string): string =>
  atob(
    text
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(text.length / 4) * 4, "="),
  )

/** An opaque cursor naming the release, the capability and how many items earlier pages returned. */
export const encodeCursor = (release: string, capability: string, offset: number): string =>
  toBase64Url(JSON.stringify({ release, capability, offset }))

/** The offset a cursor resumes from, or 0 without one. A cursor from another release fails cleanly. */
export const decodeCursor = (
  cursor: string | undefined,
  release: string,
  capability: string,
): Effect.Effect<number, InvalidCursor> => {
  if (cursor === undefined) return Effect.succeed(0)
  const malformed = new InvalidCursor({ cursor, reason: "malformed" })
  return Effect.try({ try: () => fromBase64Url(cursor), catch: () => malformed }).pipe(
    Effect.flatMap((json) =>
      Schema.decodeEffect(CursorState)(json).pipe(Effect.mapError(() => malformed)),
    ),
    Effect.flatMap((state) =>
      state.release !== release
        ? Effect.fail(new InvalidCursor({ cursor, reason: "other_release" }))
        : state.capability !== capability
          ? Effect.fail(malformed)
          : Effect.succeed(state.offset),
    ),
  )
}

/** The cursor for the next page, when items remain after this one. */
export const nextCursor = (
  release: string,
  capability: string,
  next: number,
  total: number,
): string | undefined => (next < total ? encodeCursor(release, capability, next) : undefined)
