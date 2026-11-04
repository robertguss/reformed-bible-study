import { describe, expect, it } from "@effect/vitest"
import { rateLimitNamespace, STAGES } from "../src/stage.ts"

describe("rate-limit namespaces", () => {
  it("gives every stage and binding its own id, so no two share a counter", () => {
    const bindings = ["API_RATE_LIMIT", "MCP_RATE_LIMIT", "VENDOR_RATE_LIMIT"]
    const ids = STAGES.flatMap((stage) => bindings.map((b) => rateLimitNamespace(stage, b)))
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toBeGreaterThan(0)
  })
})
