import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import { ContentStore } from "../../src/content-store/content-store.ts"
import { layerAssets } from "../../src/content-store/assets.ts"
import { layerFetch } from "../../src/content-store/fetch.ts"
import { CatalogShard, shardPaths } from "../../src/shards/index.ts"

const RELEASE = "2026-11-03-abcdef12"
const catalog = JSON.stringify({ release: RELEASE, payload: { resources: [] } })

/** Answers like a static host: known files as JSON, anything else as the given fallback. */
const host =
  (files: Record<string, string>, fallback: () => Response) =>
  (request: Request): Promise<Response> => {
    const body = files[new URL(request.url).pathname]
    return Promise.resolve(
      body === undefined
        ? fallback()
        : new Response(body, { headers: { "content-type": "application/json" } }),
    )
  }

const notFound = () => new Response("Not found", { status: 404 })
const spaFallback = () =>
  new Response("<!doctype html><html><body>app</body></html>", {
    headers: { "content-type": "text/html" },
  })

const readCatalog = Effect.gen(function* () {
  const store = yield* ContentStore
  return yield* store.read(shardPaths.catalog, CatalogShard)
})

const failureTag = <A, E extends object, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(
    Effect.flip,
    Effect.map((error) => error.constructor.name),
  )

describe("fetch content store", () => {
  it.effect("reads <baseUrl>/data/<release>/<path> and decodes it", () =>
    Effect.gen(function* () {
      const shard = yield* readCatalog.pipe(
        Effect.provide(
          layerFetch({
            baseUrl: "https://example.org/",
            release: RELEASE,
            fetch: host({ [`/data/${RELEASE}/catalog.json`]: catalog }, notFound),
          }),
        ),
      )
      expect(shard.release).toBe(RELEASE)
    }),
  )

  it.effect("maps a 404 to a typed not-found error", () =>
    Effect.gen(function* () {
      const tag = yield* failureTag(
        readCatalog.pipe(
          Effect.provide(
            layerFetch({
              baseUrl: "https://example.org",
              release: RELEASE,
              fetch: host({}, notFound),
            }),
          ),
        ),
      )
      expect(tag).toBe("ContentNotFound")
    }),
  )

  it.effect("maps an HTML page served in place of a data file to a typed not-found error", () =>
    Effect.gen(function* () {
      const tag = yield* failureTag(
        readCatalog.pipe(
          Effect.provide(
            layerFetch({
              baseUrl: "https://example.org",
              release: RELEASE,
              fetch: host({}, spaFallback),
            }),
          ),
        ),
      )
      expect(tag).toBe("ContentNotFound")
    }),
  )

  it.effect("maps a server error or a network failure to a typed unavailable error", () =>
    Effect.gen(function* () {
      const serverError = yield* failureTag(
        readCatalog.pipe(
          Effect.provide(
            layerFetch({
              baseUrl: "https://example.org",
              release: RELEASE,
              fetch: host({}, () => new Response("oops", { status: 503 })),
            }),
          ),
        ),
      )
      const offline = yield* failureTag(
        readCatalog.pipe(
          Effect.provide(
            layerFetch({
              baseUrl: "https://example.org",
              release: RELEASE,
              fetch: () => Promise.reject(new TypeError("Failed to fetch")),
            }),
          ),
        ),
      )
      expect([serverError, offline]).toEqual(["ContentUnavailable", "ContentUnavailable"])
    }),
  )

  it.effect(
    "maps unparseable JSON or a payload that does not match its schema to a typed corrupt error",
    () =>
      Effect.gen(function* () {
        const tags: Array<string> = []
        for (const body of [
          '{"release":',
          JSON.stringify({ release: RELEASE, payload: { resources: 3 } }),
        ]) {
          tags.push(
            yield* failureTag(
              readCatalog.pipe(
                Effect.provide(
                  layerFetch({
                    baseUrl: "https://example.org",
                    release: RELEASE,
                    fetch: host({ [`/data/${RELEASE}/catalog.json`]: body }, notFound),
                  }),
                ),
              ),
            ),
          )
        }
        expect(tags).toEqual(["ContentCorrupt", "ContentCorrupt"])
      }),
  )
})

describe("assets-binding content store", () => {
  it.effect("reads release files through any object with a fetch(request) method", () =>
    Effect.gen(function* () {
      const assets = { fetch: host({ [`/data/${RELEASE}/catalog.json`]: catalog }, notFound) }
      const shard = yield* readCatalog.pipe(
        Effect.provide(layerAssets({ assets, release: RELEASE })),
      )
      const missing = yield* failureTag(
        Effect.gen(function* () {
          const store = yield* ContentStore
          return yield* store.read(shardPaths.text("bsb", "Rom", 8), CatalogShard)
        }).pipe(Effect.provide(layerAssets({ assets, release: RELEASE }))),
      )
      expect([shard.release, missing]).toEqual([RELEASE, "ContentNotFound"])
    }),
  )
})
