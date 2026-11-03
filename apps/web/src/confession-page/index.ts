import {
  type CatalogResource,
  getConfessionArticle,
  getConfessionArticleContract,
  passagePath,
} from "@reformed-bible/core"
import { Effect, Option, Schema } from "effect"
import { Command, Submodel, type Update } from "foldkit"
import type { Html } from "foldkit/html"
import { defineMessageUnion } from "foldkit/message"
import { defineTaggedUnion } from "foldkit/schema"
import { modifyFields } from "foldkit/struct"
import { attributionFooter } from "../attribution.ts"
import { type AppServices, load, LoadError } from "../content.ts"
import { loadErrorView, loadingView } from "../load-views.ts"
import { catalogEntry, passageOfFocus } from "../panels/context.ts"
import { paragraphsView, runsView } from "../text.ts"

export const ArticleKey = Schema.Struct({ confession: Schema.String, article: Schema.String })
export type ArticleKey = typeof ArticleKey.Type

const sameKey = Schema.toEquivalence(ArticleKey)

export const LoadState = defineTaggedUnion({
  Idle: {},
  Loading: { key: ArticleKey },
  Loaded: { key: ArticleKey, envelope: getConfessionArticleContract.output },
  Failed: { key: ArticleKey, error: LoadError },
})
export type LoadState = typeof LoadState.Type

export const Model = Schema.Struct({ load: LoadState })
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  SucceededFetchConfessionArticle: {
    key: ArticleKey,
    envelope: getConfessionArticleContract.output,
  },
  FailedFetchConfessionArticle: { key: ArticleKey, error: LoadError },
  ClickedRetry: {},
})
export type Message = typeof Message.Type

export const OutMessage = defineMessageUnion({ DetectedMissingContent: {} })
export type OutMessage = typeof OutMessage.Type

export const FetchConfessionArticle = Command.define("FetchConfessionArticle", {
  args: ArticleKey.fields,
  messages: [Message.SucceededFetchConfessionArticle, Message.FailedFetchConfessionArticle],
  execute: (key) =>
    load(getConfessionArticle.handler({ id: key.confession, article: key.article })).pipe(
      Effect.map((envelope) => Message.SucceededFetchConfessionArticle({ key, envelope })),
      Effect.catch((error: LoadError) =>
        Effect.succeed(Message.FailedFetchConfessionArticle({ key, error })),
      ),
    ),
})

export type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage, AppServices>

export const init = (): Model => ({ load: LoadState.Idle() })

const startLoading = (model: Model, key: ArticleKey): UpdateReturn => ({
  model: modifyFields(model, { load: () => LoadState.Loading({ key }) }),
  commands: [FetchConfessionArticle(key)],
})

export const informArticleChanged = (model: Model, key: ArticleKey): UpdateReturn =>
  !LoadState.guards.Idle(model.load) && sameKey(model.load.key, key)
    ? { model }
    : startLoading(model, key)

export const update = (model: Model, message: Message): UpdateReturn =>
  Message.match<UpdateReturn>(message, {
    SucceededFetchConfessionArticle: ({ key, envelope }) =>
      LoadState.guards.Loading(model.load) && sameKey(model.load.key, key)
        ? { model: modifyFields(model, { load: () => LoadState.Loaded({ key, envelope }) }) }
        : { model },
    FailedFetchConfessionArticle: ({ key, error }) => {
      if (!LoadState.guards.Loading(model.load) || !sameKey(model.load.key, key)) return { model }
      const next = modifyFields(model, { load: () => LoadState.Failed({ key, error }) })
      return LoadError.guards.Missing(error)
        ? { model: next, outMessage: OutMessage.DetectedMissingContent() }
        : { model: next }
    },
    ClickedRetry: () =>
      LoadState.guards.Failed(model.load) ? startLoading(model, model.load.key) : { model },
  })

export type ViewInputs = Readonly<{ catalog: ReadonlyArray<CatalogResource> }>

export const view = Submodel.defineView<Model, Message, ViewInputs>((model, { catalog }, h): Html =>
  h.article(
    [h.Class("confession-article")],
    [
      LoadState.match(model.load, {
        Idle: () => loadingView(h),
        Loading: () => loadingView(h),
        Failed: ({ error }) => loadErrorView(error, Message.ClickedRetry(), h),
        Loaded: ({ key, envelope }) => {
          const [item] = envelope.items
          if (item === undefined) {
            const title = catalogEntry(catalog, key.confession)?.title ?? key.confession
            return h.p([h.Class("coverage")], [`${title} is not yet available.`])
          }
          const { value } = item
          return h.div(
            [],
            [
              h.h1([], [`${value.citation}: ${value.label}`]),
              h.p([h.Class("division")], [value.division]),
              ...(value.question === undefined
                ? []
                : [h.p([h.Class("question")], runsView(value.question, h))]),
              ...paragraphsView(value.paragraphs, h),
              h.h2([], ["Scripture proofs"]),
              h.ul(
                [h.Class("proofs")],
                value.proofs.map((proof) =>
                  h.keyed("li")(
                    `${proof.label ?? ""}:${proof.refs.map(({ osis }) => osis).join(",")}`,
                    [],
                    [
                      ...(proof.label === undefined ? [] : [`${proof.label}. `]),
                      ...proof.refs.flatMap((ref, index) => [
                        ...(index === 0 ? [] : ["; "]),
                        Option.match(passageOfFocus(ref.osis), {
                          onNone: () => ref.display,
                          onSome: (passage) => h.a([h.Href(passagePath(passage))], [ref.display]),
                        }),
                      ]),
                    ],
                  ),
                ),
              ),
              attributionFooter([item.attribution], h),
            ],
          )
        },
      }),
    ],
  ),
)
