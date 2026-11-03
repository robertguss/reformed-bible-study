import { Effect, Layer } from "effect"
import { ContentStore, type ContentStoreService, makeContentStore } from "./content-store.ts"
import { ContentNotFound, ContentUnavailable } from "./errors.ts"

export interface FetchStoreOptions {
  /** Origin and optional base path the release is served under, such as `https://example.org`. */
  readonly baseUrl: string
  readonly release: string
  /** Defaults to the global `fetch`. */
  readonly fetch?: (request: Request) => Promise<Response>
}

/**
 * Reads `<baseUrl>/data/<release>/<path>` over HTTP. A 404, or an HTML page served in place of a
 * data file (a single-page-app fallback), is `ContentNotFound`; never an empty result.
 */
export const makeFetchContentStore = (options: FetchStoreOptions): ContentStoreService => {
  const base = options.baseUrl.replace(/\/+$/, "")
  const send = options.fetch ?? ((request: Request) => fetch(request))
  return makeContentStore({
    release: options.release,
    load: (path) =>
      Effect.gen(function* () {
        const url = `${base}/data/${options.release}/${path}`
        const unavailable = (reason: string) => new ContentUnavailable({ path, reason })
        const response = yield* Effect.tryPromise({
          try: () => send(new Request(url)),
          catch: (error) => unavailable(String(error)),
        })
        if (response.status === 404) return yield* new ContentNotFound({ path })
        if (!response.ok) return yield* unavailable(`HTTP ${response.status}`)
        const text = yield* Effect.tryPromise({
          try: () => response.text(),
          catch: (error) => unavailable(String(error)),
        })
        if (text.trimStart().startsWith("<")) return yield* new ContentNotFound({ path })
        return text
      }),
  })
}

export const layerFetch = (options: FetchStoreOptions): Layer.Layer<ContentStore> =>
  Layer.succeed(ContentStore, makeFetchContentStore(options))
