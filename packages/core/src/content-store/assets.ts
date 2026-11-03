import type { Layer } from "effect"
import type { ContentStore } from "./content-store.ts"
import { layerFetch } from "./fetch.ts"

/** Anything that answers a request for a static file, such as a Cloudflare Worker's ASSETS binding. */
export interface AssetsBinding {
  fetch(request: Request): Promise<Response>
}

// The binding ignores the host; it only needs an absolute URL to read the path from.
const ASSETS_ORIGIN = "https://assets.invalid"

/** Reads release files through a static-assets binding, with the same error mapping as the fetch store. */
export const layerAssets = (options: {
  readonly assets: AssetsBinding
  readonly release: string
}): Layer.Layer<ContentStore> =>
  layerFetch({
    baseUrl: ASSETS_ORIGIN,
    release: options.release,
    fetch: (request) => options.assets.fetch(request),
  })
