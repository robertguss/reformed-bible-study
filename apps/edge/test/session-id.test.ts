import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import {
  mintSessionId,
  SESSION_LIFETIME_MS,
  verifySessionId,
} from "../src/legacy-mcp/session-id.ts"

describe("session ids", () => {
  it.effect("rejects a signature whose length is not valid base64 instead of failing", () =>
    Effect.gen(function* () {
      const now = Date.UTC(2026, 10, 3)
      const id = yield* mintSessionId("secret", now)
      const [uuid, issued] = id.split(".")
      expect(yield* verifySessionId("secret", `${uuid}.${issued}.abcde`, now)).toBe(false)
      expect(yield* verifySessionId("secret", id, now)).toBe(true)
    }),
  )

  it.effect("honours an id for its lifetime and refuses it afterwards", () =>
    Effect.gen(function* () {
      const now = Date.UTC(2026, 10, 3)
      const id = yield* mintSessionId("secret", now)
      expect(yield* verifySessionId("secret", id, now + SESSION_LIFETIME_MS)).toBe(true)
      expect(yield* verifySessionId("secret", id, now + SESSION_LIFETIME_MS + 1)).toBe(false)
    }),
  )

  it.effect("refuses an id issued more than a minute in the future", () =>
    Effect.gen(function* () {
      const now = Date.UTC(2026, 10, 3)
      const id = yield* mintSessionId("secret", now + 120_000)
      expect(yield* verifySessionId("secret", id, now)).toBe(false)
    }),
  )

  it.effect("refuses an id whose issue time was rewritten", () =>
    Effect.gen(function* () {
      const now = Date.UTC(2026, 10, 3)
      const [uuid, , signature] = (yield* mintSessionId("secret", now)).split(".")
      const later = (now + 1000).toString(36)
      expect(yield* verifySessionId("secret", `${uuid}.${later}.${signature}`, now + 1000)).toBe(
        false,
      )
    }),
  )
})
