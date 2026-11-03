import { toHttpApi } from "@reformed-bible/capability/http-api"
import { toToolkit } from "@reformed-bible/capability/toolkit"
import { describe, expect, it } from "@effect/vitest"
import { Context, Effect, FileSystem, Layer, Path } from "effect"
import { Tool } from "effect/ai"
import { Etag, HttpPlatform } from "effect/http"
import { HttpApiTest } from "effect/http-api"
import { capabilities } from "../../src/capabilities/index.ts"
import { Site } from "../../src/site/index.ts"
import { fsStore, ORIGIN } from "./fixture.ts"

const TestServices = Layer.mergeAll(Path.layer, Etag.layerWeak, HttpPlatform.layer).pipe(
  Layer.provideMerge(FileSystem.layerNoop({})),
)

const http = toHttpApi("ReformedBible", capabilities)
const handlers = http.layer.pipe(Layer.provide(Layer.merge(fsStore, Site.layer(ORIGIN))))

describe("registry projections", () => {
  it("projects every capability to its own GET route under /v1", () => {
    const { paths } = http.openApi()
    const routes = Object.entries(paths).map(([path, item]) => [
      path,
      Object.keys(item).filter((key) => key !== "parameters"),
    ])
    expect(routes.sort()).toEqual(
      [
        "/v1/commentary/{ref}",
        "/v1/confessions/articles/{ref}",
        "/v1/confessions/{id}/outline",
        "/v1/confessions/{id}/{article}",
        "/v1/cross-references/{ref}",
        "/v1/lexicon/{strongs}",
        "/v1/passages/{ref}",
        "/v1/references/resolve",
        "/v1/resources",
        "/v1/words/{ref}",
      ].map((path) => [path, ["get"]]),
    )
  })

  it.layer(TestServices)("over an in-process HTTP client", (test) => {
    test.effect("routes path and query input, and tells the outline route from an article", () =>
      Effect.gen(function* () {
        const client = yield* HttpApiTest.groups(http.api, ["capabilities"]).pipe(
          Effect.provide(handlers),
        )
        const outline = yield* client.capabilities.get_confession_outline({
          params: { id: "wcf" },
          query: {},
        })
        const article = yield* client.capabilities.get_confession_article({
          params: { id: "wcf", article: "3.6" },
          query: {},
        })
        const xrefs = yield* client.capabilities.get_cross_references({
          params: { ref: "Romans 8:28" },
          query: { limit: 3 },
        })
        const resources = yield* client.capabilities.list_resources({ query: {} })
        expect([
          outline.items[0]?.value.divisions.length,
          article.items[0]?.value.citation,
          xrefs.items.length,
          resources.items.length > 0,
        ]).toEqual([33, "WCF 3.6", 3, true])
      }),
    )
  })

  it("projects every capability to a read-only, idempotent tool", () => {
    const { toolkit } = toToolkit(capabilities)
    const tools = Object.values(toolkit.tools)
    expect(tools.map((tool) => tool.name)).toEqual(capabilities.map((c) => c.contract.name))
    for (const tool of tools) {
      expect(Context.get(tool.annotations, Tool.Readonly)).toBe(true)
      expect(Context.get(tool.annotations, Tool.Idempotent)).toBe(true)
    }
  })
})
