import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { Effect, Schema } from "effect"

export const NORMALIZED_DIR = ".cache/normalized"

export const normalizedPath = (repoRoot: string, resourceId: string, name: string): string =>
  join(repoRoot, NORMALIZED_DIR, resourceId, name)

/** Encodes a value through its schema and writes it, so nothing malformed reaches the release builder. */
export const writeNormalized = <S extends Schema.Codec<unknown, unknown>>(
  repoRoot: string,
  resourceId: string,
  name: string,
  schema: S,
  value: S["Type"],
) =>
  Effect.gen(function* () {
    const encoded = yield* Schema.encodeEffect(schema)(value)
    const path = normalizedPath(repoRoot, resourceId, name)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, `${JSON.stringify(encoded)}\n`)
  })

export const readNormalized = <S extends Schema.Codec<unknown, unknown>>(
  repoRoot: string,
  resourceId: string,
  name: string,
  schema: S,
) =>
  Effect.gen(function* () {
    const text = readFileSync(normalizedPath(repoRoot, resourceId, name), "utf8")
    return yield* Schema.decodeUnknownEffect(schema)(JSON.parse(text))
  })
