import { capabilities } from "@reformed-bible/core"
import { Effect } from "effect"

export interface EdgeCache {
  readonly match: (request: Request) => Promise<Response | undefined>
  readonly put: (request: Request, response: Response) => Promise<void>
}

const pathParams = (path: string): ReadonlyArray<string> =>
  path
    .split("/")
    .filter((segment) => segment.startsWith(":"))
    .map((segment) => segment.slice(1))

export const ALLOWED_QUERY_PARAMETERS: ReadonlySet<string> = new Set(
  capabilities.flatMap(({ contract }) => {
    const inPath = pathParams(contract.http.path)
    return Object.keys(contract.input.fields).filter((field) => !inPath.includes(field))
  }),
)

export const cacheKey = (request: Request, release: string): Request => {
  const url = new URL(request.url)
  const allowed = [...url.searchParams]
    .filter(([name]) => ALLOWED_QUERY_PARAMETERS.has(name))
    .sort(([a, av], [b, bv]) => (a === b ? av.localeCompare(bv) : a.localeCompare(b)))
  const key = new URL(`/${release}${url.pathname}`, url.origin)
  for (const [name, value] of allowed) key.searchParams.append(name, value)
  return new Request(key, { method: "GET" })
}

const CACHEABLE_STATUSES: ReadonlySet<number> = new Set([200, 404, 422])

/** Entries live as long as their release; this bounds how long a client or the edge keeps one. */
const CACHEABLE = "public, max-age=3600"

export const withHeader = (response: Response, name: string, value: string): Response => {
  const headers = new Headers(response.headers)
  headers.set(name, value)
  return new Response(response.body, { status: response.status, headers })
}

export const withEdgeCache =
  (cache: EdgeCache, release: string, handle: (request: Request) => Effect.Effect<Response>) =>
  (request: Request): Effect.Effect<Response> =>
    Effect.gen(function* () {
      if (request.method !== "GET") return yield* handle(request)
      const key = cacheKey(request, release)
      const hit = yield* Effect.promise(() => cache.match(key))
      if (hit !== undefined) return withHeader(hit, "x-edge-cache", "HIT")
      const response = yield* handle(request)
      if (!CACHEABLE_STATUSES.has(response.status))
        return withHeader(response, "cache-control", "no-store")
      const cacheable = withHeader(response, "cache-control", CACHEABLE)
      yield* Effect.promise(() => cache.put(key, cacheable.clone()))
      return withHeader(cacheable, "x-edge-cache", "MISS")
    })
