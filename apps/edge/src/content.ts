import { Site, type ContentStore } from "@reformed-bible/core"
import { layerAssets, type AssetsBinding } from "@reformed-bible/core/content-store/assets"
import { Layer } from "effect"

/** Where the capability handlers read from: the pinned release in the static assets, and the site. */
export interface ContentOptions {
  /** Origin of the web app, for canonical URLs in results. */
  readonly origin: string
  /** The dataset release this deploy pinned. */
  readonly release: string
  readonly assets: AssetsBinding
}

export const contentLayer = (options: ContentOptions): Layer.Layer<ContentStore | Site> =>
  Layer.merge(
    layerAssets({ assets: options.assets, release: options.release }),
    Site.layer(options.origin),
  )
