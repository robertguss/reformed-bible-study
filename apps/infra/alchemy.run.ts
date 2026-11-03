import { fileURLToPath } from "node:url"
import * as Cloudflare from "@alchemy.run/cloudflare"
import { RATE_LIMITS } from "@reformed-bible/edge/rate-limit"
import * as Alchemy from "alchemy"
import { Stage } from "alchemy/Stage"
import * as Config from "effect/Config"
import * as Effect from "effect/Effect"
import releaseLock from "../../dataset/release.lock.json" with { type: "json" }
import { isStage, rateLimitNamespace, siteFor } from "./src/stage.ts"

/**
 * Paths the Worker answers before static assets. Every other request, including page views and
 * reads of the locked release's data, is served from the assets without invoking the Worker. Other
 * `/data` paths, such as a replaced release's files, reach the Worker and get a 404 instead of the
 * app page that single-page-application handling would serve.
 */
const WORKER_FIRST = [
  "/data/*",
  `!/data/${releaseLock.release}/*`,
  "/v1",
  "/v1/*",
  "/mcp",
  "/.well-known/oauth-protected-resource",
  "/.well-known/oauth-protected-resource/*",
  "/.well-known/oauth-authorization-server",
  "/.well-known/oauth-authorization-server/*",
  "/.well-known/openid-configuration",
  "/.well-known/openid-configuration/*",
]

/** Workers Paid includes 10 million requests a month; warn at 80% of that. */
const MONTHLY_REQUEST_ALERT = 8_000_000

export default Alchemy.Stack(
  "ReformedBible",
  { providers: Cloudflare.providers(), state: Cloudflare.state() },
  Effect.gen(function* () {
    const stage = yield* Stage
    if (!isStage(stage))
      return yield* Effect.die(new Error(`unknown stage "${stage}"; use preview or production`))
    const site = siteFor(stage)
    const rateLimit = (binding: string, simple: { limit: number; period: 60 }) =>
      Cloudflare.RateLimit(binding, {
        namespaceId: rateLimitNamespace(stage, binding),
        simple: { limit: simple.limit, period: simple.period },
      })

    // Signs older-protocol MCP session ids. Generated once per stage and kept in Alchemy state;
    // renaming this resource rotates the key, which rejects every session signed with the old one.
    const sessionSecret = yield* Alchemy.makeRandom("McpSessionSecret")

    const worker = yield* Cloudflare.Worker("Site", {
      name: site.workerName,
      main: fileURLToPath(import.meta.resolve("@reformed-bible/edge/worker")),
      assets: {
        directory: site.assetsDirectory,
        notFoundHandling: "single-page-application",
        runWorkerFirst: WORKER_FIRST,
      },
      env: {
        API_RATE_LIMIT: rateLimit("API_RATE_LIMIT", RATE_LIMITS.api),
        MCP_RATE_LIMIT: rateLimit("MCP_RATE_LIMIT", RATE_LIMITS.mcp),
        VENDOR_RATE_LIMIT: rateLimit("VENDOR_RATE_LIMIT", RATE_LIMITS.vendor),
        LEGACY_MCP: Cloudflare.DurableObject("LegacyMcpObject"),
        SITE_ORIGIN: site.origin,
        MCP_SESSION_SECRET: sessionSecret,
      },
      workersDev: true,
    })

    if (stage === "production") {
      const email = yield* Config.String("ALERT_EMAIL")
      yield* Cloudflare.Alerting.NotificationPolicy("RequestUsageAlert", {
        alertType: "billing_usage_alert",
        description: "Workers requests this month passed 80% of the Workers Paid allowance.",
        filters: { product: ["worker_requests"], limit: [String(MONTHLY_REQUEST_ALERT)] },
        mechanisms: { email: [{ id: email }] },
      })
    }

    return { url: worker.url, origin: site.origin }
  }),
)
