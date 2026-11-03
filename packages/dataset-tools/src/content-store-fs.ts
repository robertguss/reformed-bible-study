import { readFile } from "node:fs/promises"
import { join } from "node:path"
import {
  ContentNotFound,
  ContentStore,
  ContentUnavailable,
  makeContentStore,
} from "@reformed-bible/core"
import { Effect, Layer } from "effect"

const isMissing = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error.code === "ENOENT" || error.code === "ENOTDIR")

export const layerFs = (options: {
  /** The release directory that holds `catalog.json`. */
  readonly directory: string
  readonly release: string
}): Layer.Layer<ContentStore> =>
  Layer.succeed(
    ContentStore,
    makeContentStore({
      release: options.release,
      load: (path) =>
        Effect.tryPromise({
          try: () => readFile(join(options.directory, path), "utf8"),
          catch: (error) =>
            isMissing(error)
              ? new ContentNotFound({ path })
              : new ContentUnavailable({ path, reason: String(error) }),
        }),
    }),
  )
