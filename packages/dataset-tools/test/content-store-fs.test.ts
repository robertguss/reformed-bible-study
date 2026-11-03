import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "@effect/vitest"
import { CatalogShard, ContentStore, shardPaths } from "@reformed-bible/core"
import { Effect } from "effect"
import { layerFs } from "../src/content-store-fs.ts"

const RELEASE = "2026-11-03-abcdef12"

const releaseDir = () => {
  const dir = join(mkdtempSync(join(tmpdir(), "content-store-fs-")), "data", RELEASE)
  mkdirSync(dir, { recursive: true })
  writeFileSync(
    join(dir, "catalog.json"),
    JSON.stringify({ release: RELEASE, payload: { resources: [] } }),
  )
  return dir
}

const read = (path: string) =>
  Effect.gen(function* () {
    const store = yield* ContentStore
    return yield* store.read(path, CatalogShard)
  })

describe("filesystem content store", () => {
  it.effect("reads and decodes a file from the release directory", () =>
    Effect.gen(function* () {
      const store = layerFs({ directory: releaseDir(), release: RELEASE })
      const shard = yield* read(shardPaths.catalog).pipe(Effect.provide(store))
      expect(shard).toEqual({ release: RELEASE, payload: { resources: [] } })
    }),
  )

  it.effect("maps a missing file to a typed not-found error naming the path", () =>
    Effect.gen(function* () {
      const store = layerFs({ directory: releaseDir(), release: RELEASE })
      const error = yield* read(shardPaths.text("bsb", "Rom", 8)).pipe(
        Effect.provide(store),
        Effect.flip,
      )
      expect(error).toMatchObject({ _tag: "ContentNotFound", path: "text/bsb/Rom.8.json" })
    }),
  )
})
