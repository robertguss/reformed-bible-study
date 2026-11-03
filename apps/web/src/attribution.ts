import type { Attribution, CatalogResource } from "@reformed-bible/core"
import type { HtmlBuilder } from "foldkit/html"

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
