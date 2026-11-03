import {
  type Attribution,
  type CatalogResource,
  type Envelope,
  findConfessionArticlesContract,
  getCommentaryContract,
  getCrossReferencesContract,
  getVerseWordsContract,
} from "@reformed-bible/core"
import { Effect, Option, Schema } from "effect"
import { Command, Submodel, type Update } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import { defineMessageUnion } from "foldkit/message"
import { defineTaggedUnion } from "foldkit/schema"
import { modifyFields } from "foldkit/struct"
import { attributionFooter } from "../attribution.ts"
import { type AppServices, LoadError } from "../content.ts"
import { commentaryView, fetchCommentary } from "./commentary/index.ts"
import { confessionsView, fetchConfessionArticles } from "./confessions/index.ts"
import { type PanelContext, passageOfFocus, resourceAttributions } from "./context.ts"
import { crossReferencesView, fetchCrossReferences } from "./cross-references/index.ts"
import { fetchVerseWords, originalLanguageView } from "./original-language/index.ts"
import { loadErrorView, loadingView } from "../load-views.ts"

export const PanelSpec = defineTaggedUnion({
  Commentary: { resourceId: Schema.String },
  Confessions: {},
  CrossReferences: {},
  OriginalLanguage: {},
})
export type PanelSpec = typeof PanelSpec.Type

export const panelId = (spec: PanelSpec): string =>
  PanelSpec.match(spec, {
    Commentary: ({ resourceId }) => `commentary:${resourceId}`,
    Confessions: () => "confessions",
    CrossReferences: () => "cross-references",
    OriginalLanguage: () => "original-language",
  })

export const PanelResult = defineTaggedUnion({
  Commentary: { envelope: getCommentaryContract.output },
  Confessions: { envelope: findConfessionArticlesContract.output },
  CrossReferences: { envelope: getCrossReferencesContract.output },
  OriginalLanguage: { envelope: getVerseWordsContract.output },
})
export type PanelResult = typeof PanelResult.Type

const More = Schema.Literals(["Idle", "Loading", "Failed"])

export const LoadState = defineTaggedUnion({
  Idle: {},
  Loading: { focus: Schema.String },
  Loaded: { focus: Schema.String, result: PanelResult, more: More },
  Failed: { focus: Schema.String, error: LoadError },
})
export type LoadState = typeof LoadState.Type

export const Model = Schema.Struct({ id: Schema.String, spec: PanelSpec, load: LoadState })
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  SucceededFetchPanel: { focus: Schema.String, result: PanelResult, append: Schema.Boolean },
  FailedFetchPanel: { focus: Schema.String, error: LoadError, append: Schema.Boolean },
  ClickedRetry: {},
  ClickedShowMore: {},
})
export type Message = typeof Message.Type

export const OutMessage = defineMessageUnion({
  DetectedMissingContent: {},
})
export type OutMessage = typeof OutMessage.Type

const fetchResult = (
  spec: PanelSpec,
  focus: string,
  cursor: Option.Option<string>,
): Effect.Effect<PanelResult, LoadError, AppServices> =>
  PanelSpec.match(spec, {
    Commentary: ({ resourceId }) =>
      Effect.map(fetchCommentary(resourceId, focus, cursor), (envelope) =>
        PanelResult.Commentary({ envelope }),
      ),
    Confessions: () =>
      Effect.map(fetchConfessionArticles(focus), (envelope) =>
        PanelResult.Confessions({ envelope }),
      ),
    CrossReferences: () =>
      Effect.map(fetchCrossReferences(focus, cursor), (envelope) =>
        PanelResult.CrossReferences({ envelope }),
      ),
    OriginalLanguage: () =>
      Effect.map(fetchVerseWords(focus), (envelope) => PanelResult.OriginalLanguage({ envelope })),
  })

export const FetchPanel = Command.define("FetchPanel", {
  args: { spec: PanelSpec, focus: Schema.String, cursor: Schema.Option(Schema.String) },
  messages: [Message.SucceededFetchPanel, Message.FailedFetchPanel],
  execute: ({ spec, focus, cursor }) => {
    const append = Option.isSome(cursor)
    return fetchResult(spec, focus, cursor).pipe(
      Effect.map((result) => Message.SucceededFetchPanel({ focus, result, append })),
      Effect.catch((error: LoadError) =>
        Effect.succeed(Message.FailedFetchPanel({ focus, error, append })),
      ),
    )
  },
})

export type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage, AppServices>

export const init = (spec: PanelSpec): Model => ({
  id: panelId(spec),
  spec,
  load: LoadState.Idle(),
})

const startLoading = (model: Model, focus: string): UpdateReturn => ({
  model: modifyFields(model, { load: () => LoadState.Loading({ focus }) }),
  commands: [FetchPanel({ spec: model.spec, focus, cursor: Option.none() })],
})

export const informFocusChanged = (model: Model, focus: string): UpdateReturn =>
  !LoadState.guards.Idle(model.load) && model.load.focus === focus
    ? { model }
    : startLoading(model, focus)

const cursorOf = (result: PanelResult): Option.Option<string> =>
  Option.fromUndefinedOr(result.envelope.cursor)

const appendEnvelope = <A>(earlier: Envelope<A>, later: Envelope<A>): Envelope<A> => ({
  ...later,
  items: [...earlier.items, ...later.items],
})

const appendResult = (earlier: PanelResult, later: PanelResult): PanelResult =>
  PanelResult.match(later, {
    Commentary: ({ envelope }) =>
      PanelResult.guards.Commentary(earlier)
        ? PanelResult.Commentary({ envelope: appendEnvelope(earlier.envelope, envelope) })
        : later,
    Confessions: () => later,
    CrossReferences: ({ envelope }) =>
      PanelResult.guards.CrossReferences(earlier)
        ? PanelResult.CrossReferences({ envelope: appendEnvelope(earlier.envelope, envelope) })
        : later,
    OriginalLanguage: () => later,
  })

const missingContent = (error: LoadError): OutMessage | undefined =>
  LoadError.guards.Missing(error) ? OutMessage.DetectedMissingContent() : undefined

const withLoad = (model: Model, load: LoadState): Model => modifyFields(model, { load: () => load })

const focusOfLoad = (load: LoadState): string | undefined =>
  LoadState.guards.Idle(load) ? undefined : load.focus

export const update = (model: Model, message: Message): UpdateReturn =>
  Message.match<UpdateReturn>(message, {
    SucceededFetchPanel: ({ focus, result, append }) => {
      const { load } = model
      if (focusOfLoad(load) !== focus) return { model }
      if (append)
        return LoadState.guards.Loaded(load)
          ? {
              model: withLoad(
                model,
                LoadState.Loaded({
                  focus,
                  result: appendResult(load.result, result),
                  more: "Idle",
                }),
              ),
            }
          : { model }
      return LoadState.guards.Loading(load)
        ? { model: withLoad(model, LoadState.Loaded({ focus, result, more: "Idle" })) }
        : { model }
    },
    FailedFetchPanel: ({ focus, error, append }) => {
      const { load } = model
      if (focusOfLoad(load) !== focus) return { model }
      const outMessage = missingContent(error)
      const next =
        append && LoadState.guards.Loaded(load)
          ? withLoad(model, LoadState.Loaded({ focus, result: load.result, more: "Failed" }))
          : LoadState.guards.Loading(load)
            ? withLoad(model, LoadState.Failed({ focus, error }))
            : model
      return outMessage === undefined ? { model: next } : { model: next, outMessage }
    },
    ClickedRetry: () =>
      LoadState.guards.Failed(model.load) ? startLoading(model, model.load.focus) : { model },
    ClickedShowMore: () => {
      const { load } = model
      if (!LoadState.guards.Loaded(load) || load.more === "Loading") return { model }
      return Option.match(cursorOf(load.result), {
        onNone: () => ({ model }),
        onSome: (cursor) => ({
          model: withLoad(
            model,
            LoadState.Loaded({ focus: load.focus, result: load.result, more: "Loading" }),
          ),
          commands: [
            FetchPanel({ spec: model.spec, focus: load.focus, cursor: Option.some(cursor) }),
          ],
        }),
      })
    },
  })

/** The resources a panel's footer credits: every item's source, and what the panel consulted. */
const footerAttributions = (
  spec: PanelSpec,
  result: PanelResult,
  context: PanelContext,
): ReadonlyArray<Attribution> => {
  const { envelope } = result
  const items: ReadonlyArray<Attribution> = envelope.items.map(({ attribution }) => attribution)
  const consulted = PanelSpec.match(spec, {
    Commentary: ({ resourceId }) => [resourceId],
    Confessions: () => [],
    CrossReferences: () => [],
    OriginalLanguage: () => [],
  })
  const answered = envelope.resources
    .filter(({ coverage }) => coverage === "covered" || coverage === "no_entry")
    .map(({ resourceId }) => resourceId)
  return [...items, ...resourceAttributions(context, [...consulted, ...answered])]
}

const contentView = <M>(result: PanelResult, context: PanelContext, h: HtmlBuilder<M>) =>
  PanelResult.match(result, {
    Commentary: ({ envelope }) => commentaryView(envelope, context, h),
    Confessions: ({ envelope }) => confessionsView(envelope, context, h),
    CrossReferences: ({ envelope }) => crossReferencesView(envelope, context, h),
    OriginalLanguage: ({ envelope }) => originalLanguageView(envelope, context, h),
  })

export type ViewInputs = Readonly<{ catalog: ReadonlyArray<CatalogResource> }>

export const view = Submodel.defineView<Model, Message, ViewInputs>((model, { catalog }, h): Html =>
  LoadState.match(model.load, {
    Idle: () => loadingView(h),
    Loading: () => loadingView(h),
    Failed: ({ error }) => loadErrorView(error, Message.ClickedRetry(), h),
    Loaded: ({ focus, result, more }) =>
      Option.match(passageOfFocus(focus), {
        onNone: () => loadingView(h),
        onSome: (passage) => {
          const context: PanelContext = { catalog, passage }
          return h.div(
            [h.Class("panel-body")],
            [
              ...contentView(result, context, h),
              ...(Option.isSome(cursorOf(result))
                ? [
                    h.button(
                      [
                        h.Type("button"),
                        h.Class("show-more"),
                        h.OnClick(Message.ClickedShowMore()),
                        h.Disabled(more === "Loading"),
                      ],
                      [
                        more === "Failed"
                          ? "Could not load more. Try again"
                          : more === "Loading"
                            ? "Loading more…"
                            : "Show more",
                      ],
                    ),
                  ]
                : []),
              attributionFooter(footerAttributions(model.spec, result, context), h),
            ],
          )
        },
      }),
  }),
)
