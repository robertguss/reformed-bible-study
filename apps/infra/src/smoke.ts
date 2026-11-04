import releaseLock from "../../../dataset/release.lock.json" with { type: "json" }
import { siteFor, stageFromArgs } from "./stage.ts"

const { origin } = siteFor(stageFromArgs("smoke"))
const { release } = releaseLock

const MODERN = "2026-07-28"
const OLDER = "2025-06-18"
const MCP_HEADERS = {
  "content-type": "application/json",
  accept: "application/json, text/event-stream",
}

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
    name: "llms-full.txt carries the citation rules",
    path: "/llms-full.txt",
    check: (r, body) => r.status === 200 && body.includes("## Citation rules"),
  },
  {
    name: "OAuth discovery probe says no authorization is needed",
    path: "/.well-known/oauth-protected-resource",
    check: (r, body) => r.status === 404 && body.includes("no_authorization_required"),
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
        ...MCP_HEADERS,
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

/**
 * An older-protocol client: `initialize` must return a signed session id, and a tool listing under
 * that id must reach the session store. This exercises the session key and the Durable Object.
 */
const olderProtocolSession = async (): Promise<{
  readonly ok: boolean
  readonly status: number
}> => {
  const post = (body: unknown, session?: string) =>
    fetch(`${origin}/mcp`, {
      method: "POST",
      headers: {
        ...MCP_HEADERS,
        ...(session === undefined
          ? {}
          : { "mcp-session-id": session, "mcp-protocol-version": OLDER }),
      },
      body: JSON.stringify(body),
    })
  const initialized = await post({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: OLDER,
      capabilities: {},
      clientInfo: { name: "smoke", version: "1" },
    },
  })
  await initialized.text()
  const session = initialized.headers.get("mcp-session-id")
  if (initialized.status !== 200 || session === null)
    return { ok: false, status: initialized.status }
  await (await post({ jsonrpc: "2.0", method: "notifications/initialized" }, session)).text()
  const listed = await post({ jsonrpc: "2.0", id: 2, method: "tools/list" }, session)
  return {
    ok: listed.status === 200 && (await listed.text()).includes('"get_passage"'),
    status: listed.status,
  }
}

let failed = 0
const report = (ok: boolean, name: string, detail: string) => {
  if (!ok) failed++
  console.log(`${ok ? "ok  " : "FAIL"} ${name} (${detail})`)
}
for (const probe of probes) {
  const response = await fetch(`${origin}${probe.path}`, probe.init)
  const body = await response.text()
  report(probe.check(response, body), probe.name, `${response.status} ${probe.path}`)
}
const session = await olderProtocolSession()
report(session.ok, `MCP session on protocol ${OLDER}`, `${session.status} /mcp`)

const total = probes.length + 1
if (failed > 0) {
  console.error(`${failed} of ${total} probes failed against ${origin}`)
  process.exit(1)
}
console.log(`all ${total} probes passed against ${origin}`)
