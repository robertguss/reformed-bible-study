import { readFileSync } from "node:fs"
import { join } from "node:path"
import { parseArgs } from "node:util"
import { isStage, siteFor } from "./stage.ts"

/** Probes every public surface of a deployed stage and exits non-zero if any probe fails. */
const { values } = parseArgs({ options: { stage: { type: "string" } } })
const stage = values.stage ?? ""
if (!isStage(stage)) {
  console.error("usage: smoke --stage <preview | production>")
  process.exit(1)
}
const { origin } = siteFor(stage)
const { release } = JSON.parse(
  readFileSync(join(import.meta.dirname, "../../../dataset/release.lock.json"), "utf8"),
) as { readonly release: string }

const MODERN = "2026-07-28"

interface Probe {
  readonly name: string
  readonly path: string
  readonly init?: RequestInit
  readonly check: (response: Response, body: string) => boolean
}

const isJson = (response: Response) =>
  response.headers.get("content-type")?.startsWith("application/json") === true
const isHtml = (response: Response) =>
  response.headers.get("content-type")?.startsWith("text/html") === true

const probes: ReadonlyArray<Probe> = [
  { name: "home page", path: "/", check: (r) => r.status === 200 && isHtml(r) },
  {
    name: "deep link to a passage",
    path: "/romans/8/28",
    init: { headers: { accept: "text/html", "sec-fetch-mode": "navigate" } },
    check: (r) => r.status === 200 && isHtml(r),
  },
  {
    name: "OpenAPI document",
    path: "/v1/openapi.json",
    check: (r, body) => r.status === 200 && body.includes('"openapi"'),
  },
  {
    name: "API passage",
    path: "/v1/passages/Rom.8.28?translation=bsb",
    check: (r, body) => r.status === 200 && isJson(r) && body.includes("God works all things"),
  },
  {
    name: "llms.txt names this origin",
    path: "/llms.txt",
    check: (r, body) => r.status === 200 && body.includes(`${origin}/mcp`),
  },
  {
    name: "MCP server card",
    path: "/.well-known/mcp.json",
    check: (r, body) => r.status === 200 && body.includes(`"endpoint": "${origin}/mcp"`),
  },
  {
    name: "locked release data",
    path: `/data/${release}/catalog.json`,
    check: (r, body) => r.status === 200 && isJson(r) && body.includes(release),
  },
  {
    name: "data from another release is not the app page",
    path: "/data/2000-01-01-00000000/catalog.json",
    check: (r) => r.status === 404,
  },
  {
    name: "MCP tool listing",
    path: "/mcp",
    init: {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "mcp-protocol-version": MODERN,
        "mcp-method": "tools/list",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
        params: {
          _meta: {
            "io.modelcontextprotocol/protocolVersion": MODERN,
            "io.modelcontextprotocol/clientCapabilities": {},
            "io.modelcontextprotocol/clientInfo": { name: "smoke", version: "1" },
          },
        },
      }),
    },
    check: (r, body) => r.status === 200 && body.includes('"get_passage"'),
  },
]

let failed = 0
for (const probe of probes) {
  const response = await fetch(`${origin}${probe.path}`, probe.init)
  const body = await response.text()
  const ok = probe.check(response, body)
  if (!ok) failed++
  console.log(`${ok ? "ok  " : "FAIL"} ${probe.name} (${response.status} ${probe.path})`)
}
if (failed > 0) {
  console.error(`${failed} of ${probes.length} probes failed against ${origin}`)
  process.exit(1)
}
console.log(`all ${probes.length} probes passed against ${origin}`)
