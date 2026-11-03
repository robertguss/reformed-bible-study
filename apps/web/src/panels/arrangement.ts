import type { CatalogResource } from "@reformed-bible/core"
import { PanelSpec, panelId } from "./panel.ts"

/** The arrangement a first visit opens with: Calvin, the confessions, cross-references, Greek. */
export const DEFAULT_PANELS: ReadonlyArray<PanelSpec> = [
  PanelSpec.Commentary({ resourceId: "calvin-commentaries" }),
  PanelSpec.Confessions(),
  PanelSpec.CrossReferences(),
  PanelSpec.OriginalLanguage(),
]

export const removePanel = (panels: ReadonlyArray<PanelSpec>, id: string) =>
  panels.filter((spec) => panelId(spec) !== id)

/** Moves a panel one place up (`-1`) or down (`1`); at either end it stays where it is. */
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

/** What the Add panel menu offers: each panel kind and catalogued commentary not already open. */
export const addablePanels = (
  panels: ReadonlyArray<PanelSpec>,
  catalog: ReadonlyArray<CatalogResource>,
): ReadonlyArray<PanelOption> => {
  const open = new Set(panels.map(panelId))
  const options: ReadonlyArray<PanelOption> = [
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

/** The heading a panel shows: its commentary's title, or the name of its kind. */
export const panelTitle = (spec: PanelSpec, catalog: ReadonlyArray<CatalogResource>): string =>
  PanelSpec.match(spec, {
    Commentary: ({ resourceId }) =>
      catalog.find((resource) => resource.id === resourceId)?.title ?? "Commentary",
    Confessions: () => "Confessions",
    CrossReferences: () => "Cross-references",
    OriginalLanguage: () => "Original language",
  })
