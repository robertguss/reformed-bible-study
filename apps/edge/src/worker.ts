import type { AssetsBinding } from "@reformed-bible/core/content-store/assets"
import releaseLock from "../../../dataset/release.lock.json" with { type: "json" }
import { makeApp, type SessionNamespace } from "./app.ts"
import type { EdgeCache } from "./cache.ts"
import type { ContentOptions } from "./content.ts"
import { LegacyMcpSession, type SessionStorage } from "./legacy-mcp/session.ts"
import { legacyMcpHandler } from "./mcp.ts"
import type { RateLimitBinding } from "./rate-limit.ts"
import { VENDOR_RANGES } from "./vendor-ranges.ts"

/**
 * The bindings the deploy gives the Worker. The rate-limit bindings are declared with the values in
 * `RATE_LIMITS`, and `LEGACY_MCP` binds the `LegacyMcpObject` class below.
 */
export interface Env {
  /** The static build: the web app, the data files of the pinned release, the discovery files. */
  readonly ASSETS: AssetsBinding
  readonly API_RATE_LIMIT: RateLimitBinding
  readonly MCP_RATE_LIMIT: RateLimitBinding
  readonly VENDOR_RATE_LIMIT: RateLimitBinding
  readonly LEGACY_MCP: SessionNamespace
  /** Origin of the site, such as https://example.org, for canonical URLs and the MCP origin check. */
  readonly SITE_ORIGIN: string
  /** Secret that signs MCP session ids. Unique to each deploy stage. */
  readonly MCP_SESSION_SECRET: string
}

const contentFrom = (env: Env): ContentOptions => ({
  origin: env.SITE_ORIGIN.replace(/\/+$/, ""),
  release: releaseLock.release,
  assets: env.ASSETS,
})

const CACHE_NAME = "v1"

/** The Cache API of the data centre that runs the request. */
const edgeCache: EdgeCache = {
  match: (request) => caches.open(CACHE_NAME).then((cache) => cache.match(request)),
  put: (request, response) => caches.open(CACHE_NAME).then((cache) => cache.put(request, response)),
}

/** Built on the first request, when the bindings are known, and kept for the isolate's life. */
let app: ReturnType<typeof makeApp> | undefined

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    app ??= makeApp({
      ...contentFrom(env),
      rateLimits: {
        api: env.API_RATE_LIMIT,
        mcp: env.MCP_RATE_LIMIT,
        vendor: env.VENDOR_RATE_LIMIT,
      },
      vendorRanges: VENDOR_RANGES,
      cache: edgeCache,
      sessions: env.LEGACY_MCP,
      sessionSecret: env.MCP_SESSION_SECRET,
    })
    return app.fetch(request)
  },
}

/** The Durable Object that keeps one session of an older MCP client. */
export class LegacyMcpObject {
  private readonly session: LegacyMcpSession

  constructor(state: { readonly storage: SessionStorage }, env: Env) {
    this.session = new LegacyMcpSession(state.storage, () => legacyMcpHandler(contentFrom(env)))
  }

  fetch(request: Request): Promise<Response> {
    return this.session.fetch(request)
  }

  alarm(): Promise<void> {
    return this.session.alarm()
  }
}
