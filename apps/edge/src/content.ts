import { Site, type ContentStore } from "@reformed-bible/core"
import { layerAssets, type AssetsBinding } from "@reformed-bible/core/content-store/assets"
import { Layer } from "effect"

export interface ContentOptions {
  readonly origin: string
  readonly release: string
  readonly assets: AssetsBinding
}

export const contentLayer = (options: ContentOptions): Layer.Layer<ContentStore | Site> =>
  Layer.merge(
    layerAssets({ assets: options.assets, release: options.release }),
    Site.layer(options.origin),
  )
