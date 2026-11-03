import { Effect } from "effect"
import { apiHandler, rateLimitedResponse } from "./api.ts"
import { type EdgeCache, withEdgeCache, withHeader } from "./cache.ts"
import type { ContentOptions } from "./content.ts"
import { mintSessionId, verifySessionId } from "./legacy-mcp/session-id.ts"
import {
  inspectMcpRequest,
  modernMcpHandler,
  rateLimitedMcpResponse,
  sessionNotFound,
} from "./mcp.ts"
import { checksFor, type RateLimitBindings, withinLimits } from "./rate-limit.ts"
import type { VendorRanges } from "./vendor-ranges.ts"

export interface SessionNamespace {
  readonly getByName: (name: string) => {
    readonly fetch: (request: Request) => Promise<Response>
  }
}

export interface EdgeOptions extends ContentOptions {
  readonly rateLimits: RateLimitBindings
  readonly vendorRanges: ReadonlyArray<VendorRanges>
  readonly cache: EdgeCache
  readonly sessions: SessionNamespace
  readonly sessionSecret: string
}

const OAUTH_PROBES = [
  "/.well-known/oauth-protected-resource",
  "/.well-known/oauth-authorization-server",
  "/.well-known/openid-configuration",
]

const isUnder = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`)

const noAuthorization = (origin: string): Response =>
  Response.json(
    {
      error: "no_authorization_required",
      error_description: `This server requires no authorization. Connect to ${origin}/mcp without credentials.`,
    },
    { status: 404, headers: { "cache-control": "public, max-age=86400" } },
  )

/** The API is open to any origin; it is GET-only, so browsers need no preflight. */
const withCors = (response: Response): Response =>
  withHeader(response, "access-control-allow-origin", "*")

export const makeApp = (options: EdgeOptions) => {
  const api = withEdgeCache(options.cache, options.release, apiHandler(options))
  const modernMcp = modernMcpHandler(options)

  const serveApi = (request: Request) =>
    Effect.gen(function* () {
      const checks = checksFor({
        surface: "api",
        headers: request.headers,
        vendorRanges: options.vendorRanges,
      })
      if (!(yield* withinLimits(options.rateLimits, checks))) return withCors(rateLimitedResponse())
      return withCors(yield* api(request))
    })

  const serveMcp = (request: Request) =>
    Effect.gen(function* () {
      const origin = request.headers.get("origin")
      if (origin !== null && origin !== options.origin) return new Response(null, { status: 403 })

      const info = yield* inspectMcpRequest(request)
      const sessionful =
        request.method === "POST" &&
        !info.modern &&
        (info.method === "initialize" || info.sessionId !== undefined)

      let session: string | undefined
      if (sessionful) {
        if (info.method === "initialize") {
          session = yield* mintSessionId(options.sessionSecret, Date.now())
        } else if (
          info.sessionId !== undefined &&
          (yield* verifySessionId(options.sessionSecret, info.sessionId, Date.now()))
        ) {
          session = info.sessionId
        } else {
          return sessionNotFound(info.id)
        }
      }

      const checks = checksFor({
        surface: "mcp",
        headers: request.headers,
        vendorRanges: options.vendorRanges,
        session,
      })
      if (!(yield* withinLimits(options.rateLimits, checks))) return rateLimitedMcpResponse(info)

      if (session === undefined) return yield* Effect.promise(() => modernMcp(request))
      const headers = new Headers(request.headers)
      headers.set("mcp-session-id", session)
      const forwarded = new Request(request, { headers })
      const object = options.sessions.getByName(session)
      return yield* Effect.promise(() => object.fetch(forwarded))
    })

  const handle = (request: Request): Effect.Effect<Response> => {
    const { pathname } = new URL(request.url)
    if (isUnder(pathname, "/v1")) return serveApi(request)
    if (pathname === "/mcp") return serveMcp(request)
    if (OAUTH_PROBES.some((probe) => isUnder(pathname, probe)))
      return Effect.succeed(noAuthorization(options.origin))
    return Effect.succeed(new Response("Not found", { status: 404 }))
  }

  return { fetch: (request: Request): Promise<Response> => Effect.runPromise(handle(request)) }
}
