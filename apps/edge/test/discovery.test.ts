import { mkdtempSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "@effect/vitest"
import { capabilities } from "@reformed-bible/core"
import { Effect } from "effect"
import { discoveryFiles, writeDiscoveryFiles } from "../src/discovery.ts"
import { MCP_INSTRUCTIONS } from "../src/mcp.ts"
import { FILES, legacy, modern, ORIGIN, testApp } from "./support.ts"

const ARCHIVE_URL = "https://downloads.example/dataset-2026-11-03.zip"
const files = discoveryFiles({ origin: ORIGIN, archiveUrl: ARCHIVE_URL })

const linksOf = (markdown: string): Record<string, string> =>
  Object.fromEntries(
    [...markdown.matchAll(/\[([^\]]+)\]\(([^)\s]+)\)/g)].map(([, label = "", url = ""]) => [
      label,
      url,
    ]),
  )

describe("discovery files", () => {
  it("links the API docs, OpenAPI file, MCP endpoint, dataset archive and citation rules from /llms.txt", () => {
    expect(linksOf(files.get("llms.txt") ?? "")).toMatchObject({
      "API documentation": `${ORIGIN}/llms-full.txt`,
      "OpenAPI document": `${ORIGIN}/v1/openapi.json`,
      "MCP endpoint": `${ORIGIN}/mcp`,
      "Dataset archive": ARCHIVE_URL,
      "Citation rules": `${ORIGIN}/llms-full.txt#citation-rules`,
    })
    const full = files.get("llms-full.txt") ?? ""
    expect(full).toContain("## Citation rules")
    for (const { contract } of capabilities) {
      expect(full).toContain(`GET ${contract.http.path}`)
      expect(full).toContain(contract.description)
    }
  })

  it("describes the corpus generically, naming no single commentator or confession", () => {
    const catalog = JSON.parse(FILES.get("catalog.json") ?? "null") as {
      readonly payload: {
        readonly resources: ReadonlyArray<{ readonly kind: string; readonly name?: string }>
      }
    }
    const commentators = catalog.payload.resources.flatMap(({ kind, name }) =>
      kind === "commentary" && name !== undefined ? [name] : [],
    )
    expect(commentators).toContain("Dickson")
    for (const text of [files.get("llms.txt") ?? "", MCP_INSTRUCTIONS]) {
      expect(text).not.toMatch(/Westminster/)
      for (const name of commentators) expect(text).not.toContain(name)
    }
  })

  it.effect(
    "lists the same tools in /.well-known/mcp.json as the registry and the live server",
    () =>
      Effect.gen(function* () {
        const card = JSON.parse(files.get(".well-known/mcp.json") ?? "{}") as {
          readonly tools: ReadonlyArray<{ readonly name: string; readonly description: string }>
          readonly transport: { readonly endpoint: string }
          readonly authentication: { readonly required: boolean }
        }
        const { app } = testApp()
        const { message } = yield* modern(app, { method: "tools/list", params: {} })
        const live = (message?.result?.tools ?? []).map(({ name, description }) => ({
          name,
          description,
        }))
        expect(card.tools.map(({ name }) => name)).toEqual(capabilities.map((c) => c.contract.name))
        expect(card.tools.map(({ name, description }) => ({ name, description }))).toEqual(live)
        expect(card.transport.endpoint).toBe(`${ORIGIN}/mcp`)
        expect(card.authentication.required).toBe(false)
      }),
  )

  it("writes every file under the directory it is given", () => {
    const directory = mkdtempSync(join(tmpdir(), "discovery-"))
    writeDiscoveryFiles(directory, { origin: ORIGIN, archiveUrl: ARCHIVE_URL })
    for (const [path, text] of files) expect(readFileSync(join(directory, path), "utf8")).toBe(text)
  })

  it.effect("serves the reviewed instructions file as the MCP server instructions", () =>
    Effect.gen(function* () {
      const reviewed = readFileSync(join(import.meta.dirname, "../src/mcp-instructions.md"), "utf8")
      const { app } = testApp()
      const { message } = yield* legacy(app, {
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "c", version: "0" },
        },
      })
      const instructions = (message?.result as { readonly instructions?: string } | undefined)
        ?.instructions
      expect(instructions).toBe(reviewed.trim())
    }),
  )
})
