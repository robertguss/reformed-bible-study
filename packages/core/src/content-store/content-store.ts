import { Context, Effect, Schema } from "effect"
import {
  ContentCorrupt,
  type ContentNotFound,
  type ContentStoreError,
  type ContentUnavailable,
} from "./errors.ts"

/**
 * Read access to one published dataset release. Capability handlers read content only through this
 * service; the filesystem, fetch and assets-binding stores differ only in how they load a file.
 */
export interface ContentStoreService {
  /** The dataset release every file is read from. */
  readonly release: string
  /** Reads a file by its path within the release and decodes it with the given schema. */
  readonly read: <A>(
    path: string,
    schema: Schema.Codec<A, unknown>,
  ) => Effect.Effect<A, ContentStoreError>
}

export class ContentStore extends Context.Service<ContentStore, ContentStoreService>()(
  "@reformed-bible/core/ContentStore",
) {}

/** How one store loads the raw text of a published file. */
export interface ContentSource {
  readonly release: string
  readonly load: (path: string) => Effect.Effect<string, ContentNotFound | ContentUnavailable>
}

const parseJson = (path: string, text: string): Effect.Effect<unknown, ContentCorrupt> =>
  Effect.try({
    try: (): unknown => JSON.parse(text),
    catch: (error) => new ContentCorrupt({ path, reason: `invalid JSON: ${String(error)}` }),
  })

/** Builds a store from a loader, mapping every parse and schema failure to `ContentCorrupt`. */
export const makeContentStore = (source: ContentSource): ContentStoreService => ({
  release: source.release,
  read: <A>(path: string, schema: Schema.Codec<A, unknown>) =>
    source.load(path).pipe(
      Effect.flatMap((text) => parseJson(path, text)),
      Effect.flatMap((json) =>
        Schema.decodeUnknownEffect(schema)(json).pipe(
          Effect.mapError((error) => new ContentCorrupt({ path, reason: error.message })),
        ),
      ),
    ),
})
