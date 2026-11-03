import { Context, Layer } from "effect"

/** Where the web app is served, so results can carry canonical web URLs. */
export class Site extends Context.Service<Site, { readonly origin: string }>()(
  "@reformed-bible/core/Site",
) {
  static readonly layer = (origin: string): Layer.Layer<Site> =>
    Layer.succeed(Site, Site.of({ origin: origin.replace(/\/+$/, "") }))
}
