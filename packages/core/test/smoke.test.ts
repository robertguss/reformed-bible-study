import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"

describe("toolchain", () => {
  it.effect("runs Effect programs under vitest", () =>
    Effect.gen(function* () {
      const value = yield* Effect.succeed(2 + 2)
      expect(value).toBe(4)
    }),
  )
})
