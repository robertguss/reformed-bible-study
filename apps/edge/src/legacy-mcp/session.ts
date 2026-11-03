import { Effect, Option, Schema } from "effect"
import { sessionNotFound, type WebHandler } from "../mcp.ts"

/**
 * One session of an older MCP client, kept by a Durable Object named after the session id the Worker
 * minted. Effect's sessionful MCP server keeps its sessions in memory, so the object also stores the
 * client's `initialize` request and replays it when a restarted object meets the session again.
 * Follows the legacy MCP session object in rat-stack (MIT, github.com/joelhooks/rat-stack).
 */

/** The parts of Durable Object storage a session uses. */
export interface SessionStorage {
  readonly get: <T>(key: string) => Promise<T | undefined>
  readonly put: <T>(key: string, value: T) => Promise<void>
  readonly deleteAll: () => Promise<void>
  readonly setAlarm: (scheduledTime: number) => Promise<void>
}

/** A session with no request for this long is forgotten when its alarm fires. */
export const SESSION_IDLE_MS = 60 * 60 * 1000

const SESSION_HEADER = "mcp-session-id"
const INITIALIZE_KEY = "initialize"
const REPLAYED_HEADERS = ["accept", "content-type", "mcp-protocol-version"]

interface StoredInitialize {
  readonly body: string
  readonly headers: Readonly<Record<string, string>>
}

const JsonRpcMessage = Schema.fromJsonString(
  Schema.Struct({
    id: Schema.optional(Schema.Union([Schema.String, Schema.Finite, Schema.Null])),
    method: Schema.optional(Schema.String),
  }),
)

const INITIALIZED = JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })

/** The request as the in-memory server expects it: carrying that server's own session id, if any. */
const withSession = (
  url: string,
  method: string,
  headers: HeadersInit,
  body: string,
  session: string | undefined,
): Request => {
  const forwarded = new Headers(headers)
  forwarded.delete(SESSION_HEADER)
  if (session !== undefined) forwarded.set(SESSION_HEADER, session)
  return new Request(url, {
    method,
    headers: forwarded,
    body: method === "GET" || method === "HEAD" ? null : body,
  })
}

/** The response as the client sees it: carrying the session id the Worker minted. */
const presentAs = (response: Response, external: string): Response => {
  if (!response.headers.has(SESSION_HEADER)) return response
  const headers = new Headers(response.headers)
  headers.set(SESSION_HEADER, external)
  return new Response(response.body, { status: response.status, headers })
}

/** The session logic of one object, over its storage and a lazily built in-memory MCP server. */
const openSession = (storage: SessionStorage, makeHandler: () => WebHandler) => {
  let handler: WebHandler | undefined
  /** The in-memory server's id for this session, while this object is alive. */
  let runtimeSession: string | undefined

  const forward = (request: Request): Effect.Effect<Response> => {
    handler ??= makeHandler()
    const serve = handler
    return Effect.promise(() => serve(request))
  }

  /** Starts a session in the in-memory server and remembers its id. */
  const open = (request: Request): Effect.Effect<Response> =>
    Effect.tap(forward(request), (response) =>
      Effect.sync(() => {
        const session = response.headers.get(SESSION_HEADER)
        if (response.ok && session !== null) runtimeSession = session
      }),
    )

  /** Rebuilds the session after a restart by replaying the stored `initialize`. */
  const restore = (url: string): Effect.Effect<string | undefined> =>
    Effect.gen(function* () {
      const stored = yield* Effect.promise(() => storage.get<StoredInitialize>(INITIALIZE_KEY))
      if (stored === undefined) return undefined
      yield* open(withSession(url, "POST", stored.headers, stored.body, undefined))
      const session = runtimeSession
      if (session !== undefined)
        yield* forward(withSession(url, "POST", stored.headers, INITIALIZED, session))
      return session
    })

  /** Moves the expiry alarm to `SESSION_IDLE_MS` from now. */
  const extend = Effect.promise(() => storage.setAlarm(Date.now() + SESSION_IDLE_MS))

  const handle = (request: Request): Effect.Effect<Response> =>
    Effect.gen(function* () {
      const external = request.headers.get(SESSION_HEADER) ?? ""
      const body = request.method === "POST" ? yield* Effect.promise(() => request.text()) : ""
      const message = Option.getOrUndefined(Schema.decodeOption(JsonRpcMessage)(body))

      if (message?.method === "initialize") {
        const response = yield* open(
          withSession(request.url, request.method, request.headers, body, undefined),
        )
        if (response.ok) {
          const headers: Record<string, string> = {}
          for (const name of REPLAYED_HEADERS) {
            const value = request.headers.get(name)
            if (value !== null) headers[name] = value
          }
          yield* Effect.promise(() =>
            storage.put<StoredInitialize>(INITIALIZE_KEY, { body, headers }),
          )
          yield* extend
        }
        return presentAs(response, external)
      }

      const session = runtimeSession ?? (yield* restore(request.url))
      if (session === undefined) return sessionNotFound(message?.id)
      yield* extend
      const response = yield* forward(
        withSession(request.url, request.method, request.headers, body, session),
      )
      return presentAs(response, external)
    })

  const forget = Effect.gen(function* () {
    runtimeSession = undefined
    yield* Effect.promise(() => storage.deleteAll())
  })

  return { handle, forget }
}

/** The session object's behaviour; the Worker's Durable Object class delegates to it. */
export class LegacyMcpSession {
  private readonly session: ReturnType<typeof openSession>

  constructor(storage: SessionStorage, makeHandler: () => WebHandler) {
    this.session = openSession(storage, makeHandler)
  }

  fetch(request: Request): Promise<Response> {
    return Effect.runPromise(this.session.handle(request))
  }

  /** Forgets the session once it has been idle for `SESSION_IDLE_MS`. */
  alarm(): Promise<void> {
    return Effect.runPromise(this.session.forget)
  }
}
