import type { Attribution, CatalogResource } from "@reformed-bible/core"
import type { HtmlBuilder } from "foldkit/html"

/** The credit a catalog resource requires, for a panel whose result carries no items to credit. */
export const attributionOfResource = (resource: CatalogResource): Attribution => ({
  resourceId: resource.id,
  author: resource.creator,
  work: resource.title,
  edition: resource.edition,
  license: resource.license.spdx,
  licenseUrl: resource.license.url ?? "",
  attributionText: resource.attribution.text,
  sourceUrl: resource.sourceUrl,
})

/** Each resource once, in the order first seen. */
export const distinctAttributions = (
  attributions: ReadonlyArray<Attribution>,
): ReadonlyArray<Attribution> => {
  const seen = new Set<string>()
  return attributions.filter(({ resourceId }) => {
    if (seen.has(resourceId)) return false
    seen.add(resourceId)
    return true
  })
}

const EXTERNAL = "external noopener noreferrer"

/**
 * The credit line every shown resource carries: its attribution text, its license and its
 * source, so whoever reads the panel can trace and reuse what they see.
 */
export const attributionFooter = <M>(attributions: ReadonlyArray<Attribution>, h: HtmlBuilder<M>) =>
  h.footer(
    [h.Class("attribution")],
    distinctAttributions(attributions).map((attribution) =>
      h.keyed("p")(
        attribution.resourceId,
        [],
        [
          attribution.attributionText === ""
            ? `${attribution.work}, ${attribution.author}.`
            : attribution.attributionText,
          " ",
          attribution.licenseUrl === ""
            ? `License: ${attribution.license}.`
            : h.a(
                [h.Href(attribution.licenseUrl), h.Rel(EXTERNAL)],
                [`License: ${attribution.license}`],
              ),
          " ",
          h.a([h.Href(attribution.sourceUrl), h.Rel(EXTERNAL)], ["Source"]),
        ],
      ),
    ),
  )
