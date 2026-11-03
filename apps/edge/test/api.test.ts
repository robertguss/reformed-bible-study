import { describe, expect, it } from "@effect/vitest"
import { getPassage } from "@reformed-bible/core"
import { capabilities } from "@reformed-bible/core"
import { Effect } from "effect"
import { call, fetchStore } from "../../../packages/core/test/capabilities/fixture.ts"
import { get, testApp } from "./support.ts"

describe("public API", () => {
  it.effect("serves a passage as the same envelope the capability returns", () =>
    Effect.gen(function* () {
      const { app } = testApp()
      const response = yield* get(app, "/v1/passages/Rom.8.28?translation=bsb")
      const expected = yield* call(
        getPassage,
        { ref: "Rom.8.28", translation: "bsb" },
        fetchStore(),
      )
      expect(response.status).toBe(200)
      expect(response.headers.get("access-control-allow-origin")).toBe("*")
      expect(yield* Effect.promise(() => response.json())).toEqual(
        JSON.parse(JSON.stringify(expected)),
      )
    }),
  )

  it.effect("documents every capability and the 429 response in /v1/openapi.json", () =>
    Effect.gen(function* () {
      const { app } = testApp()
      const response = yield* get(app, "/v1/openapi.json")
      const document = (yield* Effect.promise(() => response.json())) as {
        readonly paths: Record<
          string,
          Record<string, { readonly operationId?: string; readonly responses?: object }>
        >
      }
      const operations = Object.values(document.paths).flatMap((item) => Object.values(item))
      expect(operations.map((operation) => operation.operationId).sort()).toEqual(
        capabilities.map((c) => `capabilities.${c.contract.name}`).sort(),
      )
      for (const operation of operations)
        expect(Object.keys(operation.responses ?? {})).toContain("429")
    }),
  )

  it.effect("returns an invalid reference as a typed 422 failure with its suggestion", () =>
    Effect.gen(function* () {
      const { app } = testApp()
      const response = yield* get(app, "/v1/passages/Romans%2017")
      expect(response.status).toBe(422)
      expect(yield* Effect.promise(() => response.json())).toMatchObject({
        _tag: "InvalidReference",
        suggestion: { start: { book: "Rom", chapter: 16 } },
      })
    }),
  )

  it.effect("reaches every capability over GET", () =>
    Effect.gen(function* () {
      const { app } = testApp()
      const paths = [
        "/v1/resources",
        "/v1/references/resolve?q=Rom%208%3A28",
        "/v1/passages/Rom%208%3A28",
        "/v1/commentary/Rom%208%3A28?work=calvin-commentaries",
        "/v1/confessions/articles/Rom%208%3A28",
        "/v1/confessions/wcf/3.6",
        "/v1/confessions/wcf/outline",
        "/v1/cross-references/Rom%208%3A28?limit=2",
        "/v1/words/Rom%208%3A28",
        "/v1/lexicon/G1492",
      ]
      expect(paths).toHaveLength(capabilities.length)
      const statuses = yield* Effect.forEach(paths, (path) =>
        Effect.map(get(app, path), (response) => [path, response.status]),
      )
      expect(statuses).toEqual(paths.map((path) => [path, 200]))
    }),
  )
})

describe("edge cache", () => {
  it.effect("keys entries on the path and the allowed query parameters in sorted order", () =>
    Effect.gen(function* () {
      const { app, cache } = testApp()
      yield* get(app, "/v1/cross-references/Rom.8.28?limit=2&utm_source=feed")
      yield* get(app, "/v1/cross-references/Rom.8.28?utm_source=mail&limit=2&ref=x")
      const second = yield* get(app, "/v1/cross-references/Rom.8.28?limit=2")
      expect(cache.entries.size).toBe(1)
      expect(second.status).toBe(200)
      expect(second.headers.get("x-edge-cache")).toBe("HIT")
    }),
  )

  it.effect("caches a deterministic 422 failure", () =>
    Effect.gen(function* () {
      const { app, cache } = testApp()
      yield* get(app, "/v1/passages/Romans%2017")
      expect(cache.entries.size).toBe(1)
    }),
  )

  it.effect("never caches a 429 or a server error", () =>
    Effect.gen(function* () {
      const { app, cache } = testApp({
        assets: { fetch: () => Promise.resolve(new Response("down", { status: 502 })) },
      })
      const failed = yield* get(app, "/v1/passages/Rom.8.28")
      expect(failed.status).toBe(503)
      expect(cache.entries.size).toBe(0)

      const limited = testApp()
      for (let i = 0; i < 120; i++) yield* get(limited.app, `/v1/passages/Rom.8.${(i % 30) + 1}`)
      const refused = yield* get(limited.app, "/v1/passages/Rom.8.31")
      expect(refused.status).toBe(429)
      const keys = [...limited.cache.entries.keys()]
      expect(keys.some((key) => key.includes("Rom.8.31"))).toBe(false)
    }),
  )

  it.effect("answers an unknown confession with 404 on every confession route", () =>
    Effect.gen(function* () {
      const { app } = testApp()
      for (const path of ["/v1/confessions/foo/1", "/v1/confessions/foo/outline"]) {
        const response = yield* get(app, path)
        expect(response.status).toBe(404)
        expect(yield* Effect.promise(() => response.json())).toMatchObject({
          _tag: "UnknownResource",
        })
      }
    }),
  )

  it.effect("explains a refused parameter in a JSON 400 body", () =>
    Effect.gen(function* () {
      const { app } = testApp()
      const response = yield* get(app, "/v1/cross-references/Rom.8.28?limit=30")
      expect(response.status).toBe(400)
      expect(yield* Effect.promise(() => response.json())).toMatchObject({
        error: "invalid_request",
        part: "Query",
      })
    }),
  )
})
