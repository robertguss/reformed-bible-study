import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import { mintSessionId } from "../src/legacy-mcp/session-id.ts"
import { clientAddress, RATE_LIMITS, vendorOf } from "../src/rate-limit.ts"
import { VENDOR_RANGES } from "../src/vendor-ranges.ts"
import { callTool, DIRECT_CALLER, get, legacy, testApp, textOf } from "./support.ts"

/** A vendor whose egress range is the documentation block 198.51.100.0/24. */
const VENDOR = { vendor: "example-agent", cidrs: ["198.51.100.0/24", "2001:db8:aa::/48"] }
const VENDOR_ADDRESS = { "cf-connecting-ip": "198.51.100.20" }

const initialize = (app: ReturnType<typeof testApp>["app"]) =>
  legacy(app, {
    method: "initialize",
    params: {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "vendor-client", version: "0.0.0" },
    },
    headers: VENDOR_ADDRESS,
  }).pipe(Effect.map(({ response }) => response.headers.get("mcp-session-id") ?? ""))

describe("rate limits", () => {
  it.effect(
    "refuses the 61st MCP call in a minute with a tool error carrying retry_after_seconds",
    () =>
      Effect.gen(function* () {
        const { app } = testApp()
        for (let i = 0; i < RATE_LIMITS.mcp.limit; i++) {
          const { message } = yield* callTool(app, "resolve_reference", { q: "Rom 8:28" })
          expect(message?.result?.isError).toBeFalsy()
        }
        const { response, message } = yield* callTool(app, "resolve_reference", { q: "Rom 8:28" })
        expect(response.headers.get("retry-after")).toBe("60")
        expect(message?.result?.isError).toBe(true)
        expect(textOf(message)).toContain('"retry_after_seconds":60')
      }),
  )

  it.effect("refuses the 121st API request in a minute with 429 and Retry-After", () =>
    Effect.gen(function* () {
      const { app } = testApp()
      for (let i = 0; i < RATE_LIMITS.api.limit; i++)
        expect((yield* get(app, "/v1/resources")).status).toBe(200)
      const refused = yield* get(app, "/v1/resources")
      expect(refused.status).toBe(429)
      expect(refused.headers.get("retry-after")).toBe("60")
      expect(yield* Effect.promise(() => refused.json())).toEqual({
        error: "rate_limited",
        retry_after_seconds: 60,
      })
    }),
  )

  it.effect("gives two sessions from one vendor range separate buckets", () =>
    Effect.gen(function* () {
      const { app, rateLimits } = testApp({ vendorRanges: [VENDOR] })
      const first = yield* initialize(app)
      const second = yield* initialize(app)
      expect(first).not.toBe(second)
      const perSession = [...rateLimits.mcp.counts.keys()]
      expect(perSession).toHaveLength(2)
      expect(perSession.every((key) => key.startsWith("example-agent:"))).toBe(true)
      expect(rateLimits.vendor.counts.get("mcp:example-agent")).toBe(2)
    }),
  )

  it.effect("still reaches the per-vendor ceiling when session ids rotate", () =>
    Effect.gen(function* () {
      const { app, options } = testApp({ vendorRanges: [VENDOR] })
      const rotating = (method: string) =>
        Effect.flatMap(mintSessionId(options.sessionSecret, Date.now()), (id) =>
          legacy(app, {
            method,
            headers: {
              ...VENDOR_ADDRESS,
              "mcp-session-id": id,
              "mcp-protocol-version": "2025-06-18",
            },
          }),
        )
      for (let i = 0; i < RATE_LIMITS.vendor.limit; i++) {
        const { message } = yield* rotating("tools/list")
        expect(message?.error?.data).toBeUndefined()
      }
      const { response, message } = yield* rotating("tools/list")
      expect(response.headers.get("retry-after")).toBe("60")
      expect(message?.error?.data).toEqual({ retry_after_seconds: 60 })
    }),
  )

  it.effect("keys a caller by cf-connecting-ip, ignoring a forwarded vendor address", () =>
    Effect.gen(function* () {
      const { app, rateLimits } = testApp({ vendorRanges: [VENDOR] })
      yield* get(app, "/v1/resources", { "x-forwarded-for": "198.51.100.20" })
      expect([...rateLimits.api.counts.keys()]).toEqual([DIRECT_CALLER])
      expect(rateLimits.vendor.counts.size).toBe(0)
    }),
  )

  it("groups IPv6 callers by /64 and matches vendor ranges in both families", () => {
    const at = (address: string) => new Headers({ "cf-connecting-ip": address })
    expect(clientAddress(at("2001:db8:1:2:aaaa::1"))).toBe(
      clientAddress(at("2001:db8:1:2:bbbb::9")),
    )
    expect(clientAddress(at("2001:db8:1:2::1"))).not.toBe(clientAddress(at("2001:db8:1:3::1")))
    expect(vendorOf("198.51.100.255", [VENDOR])).toBe("example-agent")
    expect(vendorOf("198.51.101.0", [VENDOR])).toBeUndefined()
    expect(vendorOf("2001:db8:aa:ffff::1", [VENDOR])).toBe("example-agent")
  })

  it("ships the published egress ranges of Anthropic and OpenAI", () => {
    expect(vendorOf("160.79.104.10", VENDOR_RANGES)).toBe("anthropic")
    expect(vendorOf("153.61.208.1", VENDOR_RANGES)).toBe("anthropic")
    expect(vendorOf("104.192.219.205", VENDOR_RANGES)).toBe("openai")
  })
})
