import { describe, expect, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { McpServer } from "effect/ai"

import { toToolkit } from "../src/toolkit.ts"
import { Greeter, greet, lookup, noArgs } from "./fixtures.ts"
import { makeMcpClient, serverLayer } from "./mcp-harness.ts"

const projection = toToolkit([lookup, greet, noArgs])

const appLayer = McpServer.toolkit(projection.toolkit).pipe(
  Layer.provideMerge(projection.layer),
  Layer.provide(Greeter.layer),
  Layer.provide(serverLayer),
)

describe("toToolkit", () => {
  it.effect("lists every capability as a tool with its annotations", () =>
    Effect.gen(function* () {
      const client = yield* makeMcpClient(appLayer)
      const { tools } = yield* client["tools/list"]({})
      expect(tools.map((tool) => tool.name).sort()).toEqual(["greet", "lookup", "noArgs"])
      const lookupTool = tools.find((tool) => tool.name === "lookup")
      expect(lookupTool?.description).toBe("Read one item with an optional window")
      expect(lookupTool?.annotations?.readOnlyHint).toBe(true)
      expect(lookupTool?.annotations?.idempotentHint).toBe(true)
      expect(lookupTool?.inputSchema).toMatchObject({
        properties: { item: { description: "Item to read", type: "string" } },
        required: ["item"],
      })
    }),
  )

  it.effect("calls a capability through its requirements and returns structured content", () =>
    Effect.gen(function* () {
      const client = yield* makeMcpClient(appLayer)
      const result = yield* client["tools/call"]({ arguments: { name: "rat" }, name: "greet" })
      expect(result.isError).toBeFalsy()
      expect(result.structuredContent).toEqual({ greeting: "hello rat" })
    }),
  )

  it.effect("returns a declared failure as a tool error, not a crash", () =>
    Effect.gen(function* () {
      const client = yield* makeMcpClient(appLayer)
      const result = yield* client["tools/call"]({ arguments: { name: "nobody" }, name: "greet" })
      expect(result.isError).toBe(true)
      const [content] = result.content
      expect(content?.type === "text" ? content.text : "").toContain("No one called nobody")
    }),
  )

  it.effect("registers and calls a contract with no input fields", () =>
    Effect.gen(function* () {
      const client = yield* makeMcpClient(appLayer)
      const result = yield* client["tools/call"]({ arguments: {}, name: "noArgs" })
      expect(result.isError).toBeFalsy()
      const [content] = result.content
      expect(content?.type === "text" ? content.text : "").toContain("ready")
    }),
  )
})
