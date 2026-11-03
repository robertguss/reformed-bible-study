import { CatalogResource } from "@reformed-bible/core"
import * as Tabs from "@foldkit/ui/tabs"
import { Option, Schema } from "effect"
import { defineTaggedUnion } from "foldkit/schema"
import * as ConfessionPage from "./confession-page/index.ts"
import { LoadError } from "./content.ts"
import { ReadingPosition } from "./layout/layout-schema.ts"
import { DEFAULT_PANELS } from "./panels/arrangement.ts"
import * as Panel from "./panels/panel.ts"
import * as Reader from "./reader/index.ts"
import { AppRoute } from "./route.ts"

export const DEFAULT_TRANSLATION = "bsb"

export const Saved = Schema.Struct({
  translation: Schema.String,
  panels: Schema.Array(Panel.PanelSpec),
  readingPosition: Schema.Option(ReadingPosition),
})
export type Saved = typeof Saved.Type

export const defaultSaved: Saved = {
  translation: DEFAULT_TRANSLATION,
  panels: DEFAULT_PANELS,
  readingPosition: Option.none(),
}

export const CatalogState = defineTaggedUnion({
  Loading: {},
  Loaded: { resources: Schema.Array(CatalogResource) },
  Failed: { error: LoadError },
})
export type CatalogState = typeof CatalogState.Type

export const ReferenceProblem = Schema.Struct({
  message: Schema.String,
  suggestion: Schema.Option(Schema.Struct({ label: Schema.String, href: Schema.String })),
})

export const Model = Schema.Struct({
  route: AppRoute,
  saved: Saved,
  catalog: CatalogState,
  reader: Reader.Model,
  panels: Schema.Array(Panel.Model),
  confessionPage: ConfessionPage.Model,
  referenceInput: Schema.String,
  referenceProblem: Schema.Option(ReferenceProblem),
  isNarrow: Schema.Boolean,
  dockTabs: Tabs.Model,
  activeTab: Schema.Option(Schema.String),
  reloadRequested: Schema.Boolean,
  layoutNotice: Schema.Option(Schema.Array(Schema.String)),
})
export type Model = typeof Model.Type

export const catalogOf = (model: Model): ReadonlyArray<CatalogResource> =>
  CatalogState.guards.Loaded(model.catalog) ? model.catalog.resources : []
