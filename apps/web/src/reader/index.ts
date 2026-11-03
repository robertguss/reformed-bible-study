import {
  BOOK_IDS,
  getPassage,
  getPassageContract,
  type PassageVerse,
  verseCount,
} from "@reformed-bible/core"
import { Effect, Option, Schema } from "effect"
import { Command, Submodel, type Update } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import { defineMessageUnion } from "foldkit/message"
import { defineTaggedUnion } from "foldkit/schema"
import { modifyFields } from "foldkit/struct"
import { attributionFooter } from "../attribution.ts"
import { type AppServices, load, LoadError } from "../content.ts"
import { loadErrorView, loadingView } from "../load-views.ts"
import type { VerseSpan } from "../route.ts"
import { runsView } from "../text.ts"

/** One chapter in one translation: what the passage text shows and what a request loads. */
export const ChapterKey = Schema.Struct({
  book: Schema.Literals(BOOK_IDS),
  chapter: Schema.Int,
  translation: Schema.String,
})
export type ChapterKey = typeof ChapterKey.Type

const sameKey = (a: ChapterKey, b: ChapterKey): boolean =>
  a.book === b.book && a.chapter === b.chapter && a.translation === b.translation

export const LoadState = defineTaggedUnion({
  Idle: {},
  Loading: { key: ChapterKey },
  Loaded: { key: ChapterKey, envelope: getPassageContract.output },
  Failed: { key: ChapterKey, error: LoadError },
})
export type LoadState = typeof LoadState.Type

export const Model = Schema.Struct({ load: LoadState })
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  SucceededFetchPassage: { key: ChapterKey, envelope: getPassageContract.output },
  FailedFetchPassage: { key: ChapterKey, error: LoadError },
  ClickedRetry: {},
  ClickedVerse: { verse: Schema.Int },
  PressedEnterOnVerse: { verse: Schema.Int },
})
export type Message = typeof Message.Type

export const OutMessage = defineMessageUnion({
  SelectedVerse: { verse: Schema.Int },
  LoadedChapter: {},
  /** A file this build expects is gone from the deploy, so the build itself is out of date. */
  DetectedMissingContent: {},
})
export type OutMessage = typeof OutMessage.Type

/** Runs the passage handler in the browser for a whole chapter. */
export const FetchPassage = Command.define("FetchPassage", {
  args: ChapterKey.fields,
  messages: [Message.SucceededFetchPassage, Message.FailedFetchPassage],
  execute: (key) =>
    load(
      getPassage.handler({
        ref: `${key.book}.${key.chapter}.1-${key.book}.${key.chapter}.${verseCount(key.book, key.chapter)}`,
        translation: key.translation,
      }),
    ).pipe(
      Effect.map((envelope) => Message.SucceededFetchPassage({ key, envelope })),
      Effect.catch((error: LoadError) =>
        Effect.succeed(Message.FailedFetchPassage({ key, error })),
      ),
    ),
})

export type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage, AppServices>

export const init = (): Model => ({ load: LoadState.Idle() })

const startLoading = (model: Model, key: ChapterKey): UpdateReturn => ({
  model: modifyFields(model, { load: () => LoadState.Loading({ key }) }),
  commands: [FetchPassage(key)],
})

/** Shows a chapter in a translation; the chapter already shown or loading is kept. */
export const informChapterChanged = (model: Model, key: ChapterKey): UpdateReturn =>
  !LoadState.guards.Idle(model.load) && sameKey(model.load.key, key)
    ? { model }
    : startLoading(model, key)

export const update = (model: Model, message: Message): UpdateReturn =>
  Message.match<UpdateReturn>(message, {
    SucceededFetchPassage: ({ key, envelope }) =>
      LoadState.guards.Loading(model.load) && sameKey(model.load.key, key)
        ? {
            model: modifyFields(model, { load: () => LoadState.Loaded({ key, envelope }) }),
            outMessage: OutMessage.LoadedChapter(),
          }
        : { model },
    FailedFetchPassage: ({ key, error }) => {
      if (!LoadState.guards.Loading(model.load) || !sameKey(model.load.key, key)) return { model }
      const next = modifyFields(model, { load: () => LoadState.Failed({ key, error }) })
      return LoadError.guards.Missing(error)
        ? { model: next, outMessage: OutMessage.DetectedMissingContent() }
        : { model: next }
    },
    ClickedRetry: () =>
      LoadState.guards.Failed(model.load) ? startLoading(model, model.load.key) : { model },
    ClickedVerse: ({ verse }) => ({ model, outMessage: OutMessage.SelectedVerse({ verse }) }),
    PressedEnterOnVerse: ({ verse }) => ({
      model,
      outMessage: OutMessage.SelectedVerse({ verse }),
    }),
  })

export type ViewInputs = Readonly<{
  title: string
  selection: Option.Option<VerseSpan>
}>

const isSelected = (selection: Option.Option<VerseSpan>, verse: number): boolean =>
  Option.match(selection, {
    onNone: () => false,
    onSome: ({ first, last }) => verse >= first && verse <= last,
  })

const enterSelects = (verse: number) => (key: string) =>
  key === "Enter" ? Option.some(Message.PressedEnterOnVerse({ verse })) : Option.none()

/**
 * Each verse is focusable in reading order and selects itself on click, tap or Enter. A verse the
 * translation omits keeps its place, marked as not in this translation, so numbering never shifts.
 */
const verseView = (
  value: PassageVerse,
  selection: Option.Option<VerseSpan>,
  h: HtmlBuilder<Message>,
) => {
  const selected = isSelected(selection, value.verse)
  return h.keyed("span")(
    value.osis,
    [
      h.Id(`v${value.verse}`),
      h.Class(selected ? "verse selected" : "verse"),
      h.DataAttribute("verse", `${value.verse}`),
      h.Tabindex(0),
      ...(selected ? [h.AriaCurrent("true")] : []),
      h.OnClick(Message.ClickedVerse({ verse: value.verse })),
      h.OnKeyDownPreventDefault(enterSelects(value.verse)),
    ],
    [
      h.sup([h.Class("verse-number")], [`${value.verse}`]),
      " ",
      ...("absent" in value ? [h.em([h.Class("absent")], [value.note])] : runsView(value.text, h)),
      " ",
    ],
  )
}

const versesView = (
  verses: ReadonlyArray<PassageVerse>,
  selection: Option.Option<VerseSpan>,
  h: HtmlBuilder<Message>,
) =>
  verses.flatMap((value) => [
    ...(value.heading === undefined
      ? []
      : [h.keyed("h2")(`heading-${value.osis}`, [h.Class("section-heading")], [value.heading])]),
    verseView(value, selection, h),
  ])

export const view = Submodel.defineView<Model, Message, ViewInputs>(
  (model, { title, selection }, h): Html =>
    h.article(
      [h.Class("passage"), h.AriaLabelledBy("passage-title")],
      [
        h.h1([h.Id("passage-title")], [title]),
        LoadState.match(model.load, {
          Idle: () => loadingView(h),
          Loading: () => loadingView(h),
          Failed: ({ error }) => loadErrorView(error, Message.ClickedRetry(), h),
          Loaded: ({ envelope }) =>
            h.div(
              [h.Class("passage-body")],
              [
                h.div(
                  [h.Class("verses")],
                  versesView(
                    envelope.items.map(({ value }) => value),
                    selection,
                    h,
                  ),
                ),
                attributionFooter(
                  envelope.items.map(({ attribution }) => attribution),
                  h,
                ),
              ],
            ),
        }),
      ],
    ),
)
