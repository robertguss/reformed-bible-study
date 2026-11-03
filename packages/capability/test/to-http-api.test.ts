import { describe, expect, it } from "@effect/vitest"
import { Effect, FileSystem, Layer, Path } from "effect"
import { Etag, HttpPlatform } from "effect/http"
import { HttpApiTest } from "effect/http-api"

import { toHttpApi } from "../src/http-api.ts"
import { Greeter, greet, lookup, noArgs, NotFound } from "./fixtures.ts"

const TestServices = Layer.mergeAll(Path.layer, Etag.layerWeak, HttpPlatform.layer).pipe(
  Layer.provideMerge(FileSystem.layerNoop({})),
)

const projection = toHttpApi("TestApi", [lookup, greet, noArgs], { prefix: "/v1" })
const HandlersLayer = projection.layer.pipe(Layer.provide(Greeter.layer))

describe("toHttpApi", () => {
  it.layer(TestServices)("over an in-process client", (test) => {
    test.effect(
      "serves each contract at its GET path, reading the rest of the input from the query",
      () =>
        Effect.gen(function* () {
          const client = yield* HttpApiTest.groups(projection.api, ["capabilities"]).pipe(
            Effect.provide(HandlersLayer),
          )
          const read = yield* client.capabilities.lookup({
            params: { item: "a" },
            query: { window: 5 },
          })
          const greeting = yield* client.capabilities.greet({ params: { name: "rat" }, query: {} })
          const ready = yield* client.capabilities.noArgs({ query: {} })
          expect([read, greeting, ready]).toEqual([
            { item: "a", window: 5 },
            { greeting: "hello rat" },
            "ready",
          ])
        }),
    )

    test.effect("keeps a declared failure typed, at the status its schema names", () =>
      Effect.gen(function* () {
        const client = yield* HttpApiTest.groups(projection.api, ["capabilities"]).pipe(
          Effect.provide(HandlersLayer),
        )
        const error = yield* client.capabilities
          .greet({ params: { name: "nobody" }, query: {} })
          .pipe(Effect.flip)
        expect(error).toBeInstanceOf(NotFound)
        const response = yield* client.capabilities.greet({
          params: { name: "nobody" },
          query: {},
          responseMode: "response-only",
        })
        expect(response.status).toBe(404)
      }),
    )
  })

  it("documents GET routes under the prefix with path and query parameters", () => {
    const { paths } = projection.openApi()
    expect(Object.keys(paths).sort()).toEqual(["/v1/greet/{name}", "/v1/items/{item}", "/v1/ready"])
    const read = paths["/v1/items/{item}"]?.get
    expect(read?.parameters.map(({ in: where, name }) => `${where}:${name}`)).toEqual([
      "path:item",
      "query:window",
    ])
    expect(read?.requestBody).toBeUndefined()
  })
})
