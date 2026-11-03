import { CatalogResource } from "@reformed-bible/core"
import * as Tabs from "@foldkit/ui/tabs"
import { Schema } from "effect"
import { defineMessageUnion } from "foldkit/message"
import { UrlRequest } from "foldkit/navigation"
import { Url } from "foldkit/url"
import * as ConfessionPage from "./confession-page/index.ts"
import { LoadError } from "./content.ts"
import * as Panel from "./panels/panel.ts"
import * as Reader from "./reader/index.ts"

export const Message = defineMessageUnion({
  ClickedLink: { request: UrlRequest },
  ChangedUrl: { url: Url },
  CompletedNavigateInternal: {},
  CompletedReplaceUrl: {},
  CompletedLoadExternal: {},
  CompletedScrollToVerse: {},
  SucceededFetchCatalog: { resources: Schema.Array(CatalogResource) },
  FailedFetchCatalog: { error: LoadError },
  GotReaderMessage: { message: Reader.Message },
  GotPanelMessage: { panelId: Schema.String, message: Panel.Message },
  GotConfessionPageMessage: { message: ConfessionPage.Message },
  GotDockTabsMessage: { message: Tabs.Message },
  ChangedTranslation: { translation: Schema.String },
  UpdatedReferenceInput: { value: Schema.String },
  SubmittedReference: {},
  ClickedRemovePanel: { panelId: Schema.String },
  ClickedMovePanelUp: { panelId: Schema.String },
  ClickedMovePanelDown: { panelId: Schema.String },
  ChosePanelToAdd: { panelId: Schema.String },
  ChangedViewportWidth: { isNarrow: Schema.Boolean },
  StartedReload: {},
  DeclinedRepeatReload: {},
})
export type Message = typeof Message.Type
