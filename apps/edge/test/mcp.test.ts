import { describe, expect, it } from "@effect/vitest"
import { capabilities, escapeMarkdown, shardPaths } from "@reformed-bible/core"
import { Effect } from "effect"
import { staticHost } from "../../../packages/core/test/capabilities/fixture.ts"
import { mintSessionId } from "../src/legacy-mcp/session-id.ts"
import {
  callTool,
  FILES,
  get,
  legacy,
  modern,
  ORIGIN,
  testApp,
  textOf,
  type McpMessage,
} from "./support.ts"

const CALVIN = "calvin-commentaries"

interface Envelope {
  readonly items: ReadonlyArray<{
    readonly attribution: {
      readonly author: string
      readonly work: string
      readonly edition: string
      readonly license: string
    }
  }>
  readonly resources: ReadonlyArray<{ readonly resourceId: string; readonly coverage: string }>
}

const envelopeOf = (message: McpMessage | undefined) =>
  message?.result?.structuredContent as Envelope

/** One sample call per tool, each expected to succeed against the fixture release. */
const SAMPLE_CALLS: Record<string, Record<string, unknown>> = {
  list_resources: {},
  resolve_reference: { q: "Rom 8:28-30" },
  get_passage: { ref: "Romans 8:28" },
  get_commentary: { ref: "Romans 8:28", work: CALVIN },
  find_confession_articles: { ref: "Romans 8:28" },
  get_confession_article: { id: "wcf", article: "3.6" },
  get_confession_outline: { id: "wsc" },
  get_cross_references: { ref: "Romans 8:28", limit: 3 },
  get_verse_words: { ref: "Romans 8:28" },
  get_lexicon_entry: { strongs: "G1492" },
}

describe("MCP tools", () => {
  it.effect(
    "lists one read-only, idempotent tool per capability, with the snapshot descriptions",
    () =>
      Effect.gen(function* () {
        const { app } = testApp()
        const { message } = yield* modern(app, { method: "tools/list", params: {} })
        const tools = message?.result?.tools ?? []
        expect(tools.map((tool) => tool.name)).toEqual(capabilities.map((c) => c.contract.name))
        for (const tool of tools)
          expect(tool.annotations).toMatchObject({
            readOnlyHint: true,
            idempotentHint: true,
            destructiveHint: false,
          })
        expect(
          tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
        ).toMatchSnapshot()
      }),
  )

  it.effect("reaches every capability as a tool", () =>
    Effect.gen(function* () {
      const { app } = testApp()
      expect(Object.keys(SAMPLE_CALLS)).toEqual(capabilities.map((c) => c.contract.name))
      for (const [name, args] of Object.entries(SAMPLE_CALLS)) {
        const { message } = yield* callTool(app, name, args)
        expect([name, message?.result?.isError ?? false]).toEqual([name, false])
        expect(textOf(message)).toContain("Dataset release")
      }
    }),
  )

  it.effect("answers Calvin on Genesis 1 with a normal result saying it is not covered yet", () =>
    Effect.gen(function* () {
      const { app } = testApp()
      const { message } = yield* callTool(app, "get_commentary", { ref: "Genesis 1", work: CALVIN })
      expect(message?.result?.isError).toBeFalsy()
      expect(envelopeOf(message).resources).toEqual([
        expect.objectContaining({ resourceId: CALVIN, coverage: "not_ingested" }),
      ])
      expect(textOf(message)).toContain(`${CALVIN}: this passage is not yet covered`)
    }),
  )

  it.effect("answers Calvin on Revelation with a normal result saying it is outside his work", () =>
    Effect.gen(function* () {
      const { app } = testApp()
      const { message } = yield* callTool(app, "get_commentary", {
        ref: "Revelation 1:1",
        work: CALVIN,
      })
      expect(message?.result?.isError).toBeFalsy()
      expect(envelopeOf(message).items).toEqual([])
      expect(envelopeOf(message).resources).toEqual([
        expect.objectContaining({ resourceId: CALVIN, coverage: "outside_work" }),
      ])
      expect(textOf(message)).toContain(`${CALVIN}: this work does not cover this passage`)
    }),
  )

  it.effect("lists no Baptist work, so Spurgeon and the 1689 Confession are unknown", () =>
    Effect.gen(function* () {
      const { app } = testApp()
      const { items } = envelopeOf((yield* callTool(app, "list_resources", {})).message)
      expect(items.length).toBeGreaterThan(0)
      for (const { attribution } of items)
        expect(`${attribution.author} ${attribution.work}`).not.toMatch(/Spurgeon|Baptist|1689/)
      const { message } = yield* callTool(app, "get_confession_outline", { id: "lbcf" })
      expect(message?.result?.isError).toBe(true)
    }),
  )

  it.effect("answers an invalid reference with a tool error that carries the suggestion", () =>
    Effect.gen(function* () {
      const { app } = testApp()
      const { message } = yield* callTool(app, "get_passage", { ref: "Romans 17" })
      expect(message?.result?.isError).toBe(true)
      const text = textOf(message)
      expect(text).toContain("Romans 16")
      expect(text).toContain('"suggestion":"Rom.16.1-Rom.16.27"')
    }),
  )

  it.effect("escapes Markdown in a rejected reference echoed back in the text", () =>
    Effect.gen(function* () {
      const { app } = testApp()
      const { message } = yield* callTool(app, "get_passage", { ref: "[x](https://evil.example/)" })
      expect(message?.result?.isError).toBe(true)
      expect(textOf(message)).not.toContain("[x](https://evil.example/)")
    }),
  )

  it.effect("gives text-only clients the fields the tool descriptions point them to", () =>
    Effect.gen(function* () {
      const { app } = testApp()
      const words = textOf(
        (yield* callTool(app, "get_verse_words", { ref: "Romans 8:28" })).message,
      )
      expect(words).toContain("G6063")
      const outline = textOf(
        (yield* callTool(app, "get_confession_outline", { id: "wsc" })).message,
      )
      expect(outline).toContain("What is the chief end of man?")
      const resources = textOf((yield* callTool(app, "list_resources", {})).message)
      expect(resources).toContain("Chapters in this release: Rom")
    }),
  )

  it.effect("names the author, work, edition and license of every excerpt in the text", () =>
    Effect.gen(function* () {
      const { app } = testApp()
      for (const [name, args] of [
        ["get_commentary", { ref: "Romans 8:28-29", work: CALVIN }],
        ["find_confession_articles", { ref: "Romans 8:28" }],
        ["get_passage", { ref: "Romans 8:27-29" }],
      ] as const) {
        const { message } = yield* callTool(app, name, args)
        const { items } = envelopeOf(message)
        const text = textOf(message)
        expect(items.length).toBeGreaterThan(0)
        expect(text.split("License: ").length - 1).toBe(items.length)
        for (const { attribution } of items) {
          expect(text).toContain(
            `${escapeMarkdown(attribution.author)}, ${escapeMarkdown(attribution.work)} (${escapeMarkdown(attribution.edition)}).`,
          )
          expect(text).toContain(`License: ${attribution.license}.`)
        }
      }
    }),
  )

  it.effect("quotes commentary text containing Markdown link syntax with no active link", () =>
    Effect.gen(function* () {
      const path = shardPaths.commentary(CALVIN, "Rom", 8)
      const shard = JSON.parse(FILES.get(path) ?? "{}") as {
        payload: { sections: Array<{ ref: string; paragraphs: Array<Array<{ text: string }>> }> }
      }
      for (const section of shard.payload.sections)
        if (section.ref === "Rom.8.28-Rom.8.30")
          section.paragraphs.push([{ text: "Read [the full gloss](https://evil.example/x) now." }])
      const files = new Map(FILES).set(path, JSON.stringify(shard))
      const { app } = testApp({ assets: { fetch: staticHost(files) } })
      const { message } = yield* callTool(app, "get_commentary", {
        ref: "Romans 8:28",
        work: CALVIN,
      })
      const text = textOf(message)
      expect(text).not.toContain("[the full gloss](https://evil.example/x)")
      const line = text.split("\n").find((l) => l.includes("the full gloss"))
      expect(line).toBe("> Read \\[the full gloss\\]\\(https:\\/\\/evil.example/x\\) now.")
    }),
  )
})

describe("MCP endpoint", () => {
  it.effect("rejects browser origins not on the allowed list, including Origin: null", () =>
    Effect.gen(function* () {
      const { app } = testApp()
      const list = (headers: Record<string, string>) =>
        modern(app, { method: "tools/list", params: {}, headers })
      expect((yield* list({ origin: "https://elsewhere.example" })).response.status).toBe(403)
      expect((yield* list({ origin: "null" })).response.status).toBe(403)
      expect((yield* list({ origin: ORIGIN })).response.status).toBe(200)
      expect((yield* list({})).response.status).toBe(200)
    }),
  )

  it.effect("serves a 2025-06-18 client across requests through the session store", () =>
    Effect.gen(function* () {
      const { app, sessions } = testApp()
      const init = yield* legacy(app, {
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "older-client", version: "1.0.0" },
        },
      })
      expect(init.message?.result?.protocolVersion).toBe("2025-06-18")
      const session = init.response.headers.get("mcp-session-id") ?? ""
      const headers = { "mcp-session-id": session, "mcp-protocol-version": "2025-06-18" }
      yield* legacy(app, { method: "notifications/initialized", id: null, headers })
      // The object restarts between requests; its stored session survives.
      sessions.evict()
      const { message } = yield* legacy(app, {
        method: "tools/call",
        params: { name: "get_passage", arguments: { ref: "Romans 8:28" } },
        headers,
      })
      expect(message?.result?.isError).toBeFalsy()
      expect(textOf(message)).toContain("God works all things together for the good")
      expect(new Set(sessions.reached)).toEqual(new Set([session]))
    }),
  )

  it.effect("rejects forged and unsigned session ids before reaching the session store", () =>
    Effect.gen(function* () {
      const { app, sessions } = testApp()
      const forged = yield* mintSessionId("another-secret", Date.now())
      for (const id of ["unsigned-session", forged]) {
        const { response, message } = yield* legacy(app, {
          method: "tools/list",
          headers: { "mcp-session-id": id, "mcp-protocol-version": "2025-06-18" },
        })
        expect(response.status).toBe(404)
        expect(message?.error?.message).toBe("Session not found")
      }
      expect(sessions.reached).toEqual([])
    }),
  )

  it.effect("forgets a session when its expiry alarm fires", () =>
    Effect.gen(function* () {
      const { app, sessions } = testApp()
      const init = yield* legacy(app, {
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "c", version: "0" },
        },
      })
      const session = init.response.headers.get("mcp-session-id") ?? ""
      expect(sessions.storages.get(session)?.alarms.length).toBeGreaterThan(0)
      yield* Effect.promise(() => sessions.objectFor(session).alarm())
      sessions.evict()
      const { response } = yield* legacy(app, {
        method: "tools/list",
        headers: { "mcp-session-id": session, "mcp-protocol-version": "2025-06-18" },
      })
      expect(response.status).toBe(404)
    }),
  )

  it.effect("answers an OAuth discovery probe by saying no authorization is required", () =>
    Effect.gen(function* () {
      const { app } = testApp()
      for (const path of [
        "/.well-known/oauth-protected-resource",
        "/.well-known/oauth-protected-resource/mcp",
        "/.well-known/oauth-authorization-server",
      ]) {
        const response = yield* get(app, path)
        expect(response.status).toBe(404)
        expect(yield* Effect.promise(() => response.json())).toEqual({
          error: "no_authorization_required",
          error_description: `This server requires no authorization. Connect to ${ORIGIN}/mcp without credentials.`,
        })
      }
    }),
  )
})
