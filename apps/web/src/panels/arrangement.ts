import type { CatalogResource } from "@reformed-bible/core"
import { catalogEntry } from "./context.ts"
import { PanelSpec, panelId } from "./panel.ts"

export const DEFAULT_PANELS: ReadonlyArray<PanelSpec> = [
  PanelSpec.DefaultCommentary(),
  PanelSpec.Confessions(),
  PanelSpec.CrossReferences(),
  PanelSpec.OriginalLanguage(),
]

export const removePanel = (panels: ReadonlyArray<PanelSpec>, id: string) =>
  panels.filter((spec) => panelId(spec) !== id)

export const movePanel = (panels: ReadonlyArray<PanelSpec>, id: string, by: -1 | 1) => {
  const from = panels.findIndex((spec) => panelId(spec) === id)
  const to = from + by
  const moving = panels[from]
  const other = panels[to]
  if (from < 0 || moving === undefined || other === undefined) return panels
  return panels.map((spec, index) => (index === from ? other : index === to ? moving : spec))
}

export interface PanelOption {
  readonly spec: PanelSpec
  readonly label: string
}

export const addablePanels = (
  panels: ReadonlyArray<PanelSpec>,
  catalog: ReadonlyArray<CatalogResource>,
): ReadonlyArray<PanelOption> => {
  const open = new Set(panels.map(panelId))
  const options: ReadonlyArray<PanelOption> = [
    { spec: PanelSpec.DefaultCommentary(), label: "Commentary (Calvin first)" },
    ...catalog
      .filter((resource) => resource.kind === "commentary" && resource.status.state === "active")
      .map((resource) => ({
        spec: PanelSpec.Commentary({ resourceId: resource.id }),
        label: resource.title,
      })),
    { spec: PanelSpec.Confessions(), label: "Confessions" },
    { spec: PanelSpec.CrossReferences(), label: "Cross-references" },
    { spec: PanelSpec.OriginalLanguage(), label: "Original language" },
  ]
  return options.filter(({ spec }) => !open.has(panelId(spec)))
}

/** A panel's title; a default commentary panel names the commentator it is showing, if any. */
export const panelTitle = (
  spec: PanelSpec,
  catalog: ReadonlyArray<CatalogResource>,
  shown: CatalogResource | undefined,
): string =>
  PanelSpec.match(spec, {
    Commentary: ({ resourceId }) => catalogEntry(catalog, resourceId)?.title ?? "Commentary",
    DefaultCommentary: () => (shown === undefined ? "Commentary" : `Commentary: ${shown.creator}`),
    Confessions: () => "Confessions",
    CrossReferences: () => "Cross-references",
    OriginalLanguage: () => "Original language",
  })
