import { Effect } from "effect"
import {
  FILES,
  ORIGIN,
  RELEASE,
  staticHost,
} from "../../../packages/core/test/capabilities/fixture.ts"
import { makeApp, type EdgeOptions } from "../src/app.ts"
import type { EdgeCache } from "../src/cache.ts"
import { legacyMcpHandler, type ContentOptions } from "../src/mcp.ts"
import { LegacyMcpSession, type SessionStorage } from "../src/legacy-mcp/session.ts"
import { RATE_LIMITS, type RateLimitBinding } from "../src/rate-limit.ts"

export { FILES, ORIGIN, RELEASE }

/** Counts like Cloudflare's rate-limit binding, exactly rather than approximately. */
export const fakeLimiter = ({ limit }: { readonly limit: number }) => {
  const counts = new Map<string, number>()
  const binding: RateLimitBinding = {
    limit: ({ key }) => {
      const count = (counts.get(key) ?? 0) + 1
      counts.set(key, count)
      return Promise.resolve({ success: count <= limit })
    },
  }
  return Object.assign(binding, { counts })
}

/** An in-memory Cache API: one entry per key URL. */
export const fakeCache = () => {
  const entries = new Map<string, Response>()
  const cache: EdgeCache = {
    match: (request) => Promise.resolve(entries.get(request.url)?.clone()),
    put: (request, response) => {
      entries.set(request.url, response.clone())
      return Promise.resolve()
    },
  }
  return Object.assign(cache, { entries })
}

const fakeStorage = () => {
  const values = new Map<string, unknown>()
  const alarms: Array<number> = []
  const storage: SessionStorage = {
    get: <T>(key: string) => Promise.resolve(values.get(key) as T | undefined),
    put: (key, value) => {
      values.set(key, value)
      return Promise.resolve()
    },
    deleteAll: () => {
      values.clear()
      return Promise.resolve()
    },
    setAlarm: (time) => {
      alarms.push(time)
      return Promise.resolve()
    },
  }
  return Object.assign(storage, { values, alarms })
}

/**
 * Durable Objects addressed by name, as the Worker sees them. `evict` drops every live object while
 * keeping its storage, as Cloudflare does when an object restarts.
 */
export const fakeSessions = (content: ContentOptions) => {
  const storages = new Map<string, ReturnType<typeof fakeStorage>>()
  const live = new Map<string, LegacyMcpSession>()
  const reached: Array<string> = []
  const objectFor = (name: string) => {
    const existing = live.get(name)
    if (existing !== undefined) return existing
    const storage = storages.get(name) ?? fakeStorage()
    storages.set(name, storage)
    const created = new LegacyMcpSession(storage, () => legacyMcpHandler(content))
    live.set(name, created)
    return created
  }
  return {
    storages,
    reached,
    evict: () => live.clear(),
    objectFor,
    getByName: (name: string) => ({
      fetch: (request: Request) => {
        reached.push(name)
        return objectFor(name).fetch(request)
      },
    }),
  }
}

export const content: ContentOptions = {
  origin: ORIGIN,
  release: RELEASE,
  assets: { fetch: staticHost(FILES) },
}

/** The Worker over the fixture release, with fakes for every Cloudflare binding. */
export const testApp = (overrides: Partial<EdgeOptions> = {}) => {
  const rateLimits = {
    api: fakeLimiter(RATE_LIMITS.api),
    mcp: fakeLimiter(RATE_LIMITS.mcp),
    vendor: fakeLimiter(RATE_LIMITS.vendor),
  }
  const cache = fakeCache()
  const sessions = fakeSessions({
    origin: overrides.origin ?? content.origin,
    release: overrides.release ?? content.release,
    assets: overrides.assets ?? content.assets,
  })
  const options: EdgeOptions = {
    ...content,
    rateLimits,
    vendorRanges: [],
    cache,
    sessions,
    sessionSecret: "test-signing-secret",
    ...overrides,
  }
  const app = makeApp(options)
  return { app, rateLimits, cache, sessions, options }
}

export const DIRECT_CALLER = "203.0.113.7"

export const get = (
  app: ReturnType<typeof makeApp>,
  path: string,
  headers: Record<string, string> = {},
) =>
  Effect.promise(() =>
    app.fetch(
      new Request(`${ORIGIN}${path}`, {
        headers: { "cf-connecting-ip": DIRECT_CALLER, ...headers },
      }),
    ),
  )

let nextId = 1

export interface McpMessage {
  readonly id?: string | number | null
  readonly result?: {
    readonly content?: ReadonlyArray<{ readonly type: string; readonly text?: string }>
    readonly structuredContent?: unknown
    readonly isError?: boolean
    readonly tools?: ReadonlyArray<{
      readonly name: string
      readonly description?: string
      readonly annotations?: Record<string, unknown>
      readonly inputSchema?: unknown
    }>
    readonly protocolVersion?: string
  }
  readonly error?: { readonly code: number; readonly message: string; readonly data?: unknown }
}

/** Reads a JSON-RPC reply sent as plain JSON or as server-sent events. */
const readMessage = (response: Response) =>
  Effect.promise(() => response.text()).pipe(
    Effect.map((text): McpMessage | undefined => {
      if (text === "") return undefined
      const json = response.headers.get("content-type")?.includes("text/event-stream")
        ? text
            .split("\n")
            .filter((line) => line.startsWith("data: "))
            .map((line) => line.slice("data: ".length))
            .at(-1)
        : text
      return json === undefined ? undefined : (JSON.parse(json) as McpMessage)
    }),
  )

export interface McpCall {
  readonly method: string
  readonly params?: Record<string, unknown>
  readonly headers?: Record<string, string>
  /** Omit to send a notification. */
  readonly id?: number | null
}

const send = (app: ReturnType<typeof makeApp>, body: unknown, headers: Record<string, string>) =>
  Effect.gen(function* () {
    const response = yield* Effect.promise(() =>
      app.fetch(
        new Request(`${ORIGIN}/mcp`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json, text/event-stream",
            "cf-connecting-ip": DIRECT_CALLER,
            ...headers,
          },
          body: JSON.stringify(body),
        }),
      ),
    )
    return { response, message: yield* readMessage(response) }
  })

export const MODERN = "2026-07-28"

/** One request in the stateless 2026-07-28 protocol: version and capabilities ride in `_meta`. */
export const modern = (app: ReturnType<typeof makeApp>, call: McpCall) => {
  const name = call.params?.["name"]
  return send(
    app,
    {
      jsonrpc: "2.0",
      id: call.id === undefined ? nextId++ : call.id,
      method: call.method,
      params: {
        ...call.params,
        _meta: {
          "io.modelcontextprotocol/protocolVersion": MODERN,
          "io.modelcontextprotocol/clientCapabilities": {},
          "io.modelcontextprotocol/clientInfo": { name: "edge-test", version: "0.0.0" },
        },
      },
    },
    {
      "mcp-protocol-version": MODERN,
      "mcp-method": call.method,
      ...(typeof name === "string" ? { "mcp-name": name } : {}),
      ...call.headers,
    },
  )
}

export const callTool = (
  app: ReturnType<typeof makeApp>,
  name: string,
  args: Record<string, unknown>,
  headers: Record<string, string> = {},
) => modern(app, { method: "tools/call", params: { name, arguments: args }, headers })

/** A message in an older, sessionful protocol revision. */
export const legacy = (app: ReturnType<typeof makeApp>, call: McpCall) =>
  send(
    app,
    {
      jsonrpc: "2.0",
      ...(call.id === null ? {} : { id: call.id ?? nextId++ }),
      method: call.method,
      ...(call.params === undefined ? {} : { params: call.params }),
    },
    call.headers ?? {},
  )

export const textOf = (message: McpMessage | undefined): string =>
  (message?.result?.content ?? []).map((block) => block.text ?? "").join("\n")
