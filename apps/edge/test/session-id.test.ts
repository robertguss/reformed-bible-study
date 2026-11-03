import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import { mintSessionId, verifySessionId } from "../src/legacy-mcp/session-id.ts"

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
})
