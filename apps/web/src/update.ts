import { formatPassage, parseReference, passagePath } from "@reformed-bible/core"
import * as Tabs from "@foldkit/ui/tabs"
import { Option, Result } from "effect"
import { type Runtime, Update } from "foldkit"
import { UrlRequest } from "foldkit/navigation"
import { modifyFields } from "foldkit/struct"
import { toString as urlToString, type Url } from "foldkit/url"
import { FetchCatalog } from "./catalog.ts"
import * as ConfessionPage from "./confession-page/index.ts"
import { type AppServices, LoadError } from "./content.ts"
import {
  dropUnavailable,
  positionRoute,
  recordPosition,
  saveIfChanged,
} from "./layout/layout-update.ts"
import type { Flags } from "./layout/storage.ts"
import { Message } from "./message.ts"
import { CatalogState, catalogOf, type Model } from "./model.ts"
import { LoadExternal, NavigateInternal, ReplaceUrl, ScrollToVerse } from "./navigation.ts"
import { addablePanels, movePanel, removePanel } from "./panels/arrangement.ts"
import * as Panel from "./panels/panel.ts"
import * as Reader from "./reader/index.ts"
import { focusOf, readingOfRoute, validReading } from "./reading.ts"
import { ReloadOntoCurrentBuild } from "./reload.ts"
import {
  AppRoute,
  articleOfRoute,
  chapterRouter,
  hrefOfRoute,
  urlToAppRoute,
  versesRouter,
} from "./route.ts"

type UpdateReturn = Update.Return<Model, Message, AppServices>
type Step = Update.Step<Model, Message, AppServices>

const keepModel: Step = (model) => ({ model })

const requestReload: Step = (model) =>
  model.reloadRequested
    ? { model }
    : {
        model: modifyFields(model, { reloadRequested: () => true }),
        commands: [ReloadOntoCurrentBuild()],
      }

const selectVerse =
  (verse: number): Step =>
  (model) =>
    Option.match(readingOfRoute(model.route), {
      onNone: () => ({ model }),
      onSome: ({ book, chapter, t }) => ({
        model,
        commands: [
          ReplaceUrl({
            url: versesRouter({ book, chapter, verses: { first: verse, last: verse }, t }),
          }),
        ],
      }),
    })

const scrollToSelection: Step = (model) =>
  Option.match(
    Option.flatMap(validReading(model.route), ({ selection }) => selection),
    {
      onNone: () => ({ model }),
      onSome: ({ first }) => ({ model, commands: [ScrollToVerse({ verse: first })] }),
    },
  )

const readerFold = <Input>(update: (reader: Reader.Model, input: Input) => Reader.UpdateReturn) =>
  Update.foldChild({
    update,
    read: (model: Model) => Option.some(model.reader),
    write: (model, reader) => modifyFields(model, { reader: () => reader }),
    toParentMessage: (message) => Message.GotReaderMessage({ message }),
    foldOutMessage: (outMessage) =>
      Reader.OutMessage.match<Step>(outMessage, {
        SelectedVerse: ({ verse }) => selectVerse(verse),
        LoadedChapter: () => scrollToSelection,
        DetectedMissingContent: () => requestReload,
      }),
  })

const foldReader = readerFold(Reader.update)
const foldReaderChapter = readerFold(Reader.informChapterChanged)

const panelFold = <Input>(update: (panel: Panel.Model, input: Input) => Panel.UpdateReturn) =>
  Update.foldChildAt({
    update,
    readAt: (model: Model, id: string) =>
      Option.fromUndefinedOr(model.panels.find((panel) => panel.id === id)),
    writeAt: (model, id, next) =>
      modifyFields(model, {
        panels: (panels) => panels.map((panel) => (panel.id === id ? next : panel)),
      }),
    toParentMessage: (panelId, message) => Message.GotPanelMessage({ panelId, message }),
    foldOutMessage: () => (outMessage) =>
      Panel.OutMessage.match<Step>(outMessage, { DetectedMissingContent: () => requestReload }),
  })

const foldPanel = panelFold(Panel.update)
const foldPanelFocus = panelFold(Panel.informFocusChanged)

const confessionPageFold = <Input>(
  update: (page: ConfessionPage.Model, input: Input) => ConfessionPage.UpdateReturn,
) =>
  Update.foldChild({
    update,
    read: (model: Model) => Option.some(model.confessionPage),
    write: (model, confessionPage) => modifyFields(model, { confessionPage: () => confessionPage }),
    toParentMessage: (message) => Message.GotConfessionPageMessage({ message }),
    foldOutMessage: (outMessage) =>
      ConfessionPage.OutMessage.match<Step>(outMessage, {
        DetectedMissingContent: () => requestReload,
      }),
  })

const foldConfessionPage = confessionPageFold(ConfessionPage.update)
const foldConfessionArticle = confessionPageFold(ConfessionPage.informArticleChanged)

const DockTabs = Tabs.create<string>()

const foldDockTabs = Update.foldChild({
  update: DockTabs.update,
  read: (model: Model) => Option.some(model.dockTabs),
  write: (model, dockTabs) => modifyFields(model, { dockTabs: () => dockTabs }),
  toParentMessage: (message) => Message.GotDockTabsMessage({ message }),
  foldOutMessage: (outMessage) =>
    Tabs.OutMessage.match<Update.Step<Model, Message>>(outMessage, {
      Selected:
        ({ value }) =>
        (model) => ({ model: modifyFields(model, { activeTab: () => Option.some(value) }) }),
    }),
})

export const translationOf = (model: Model): string =>
  Option.getOrElse(
    Option.flatMap(readingOfRoute(model.route), ({ t }) => t),
    () => model.saved.translation,
  )

const syncReader: Step = (model) =>
  Option.match(validReading(model.route), {
    onNone: () => ({ model }),
    onSome: ({ book, chapter }) =>
      foldReaderChapter(model, { book, chapter, translation: translationOf(model) }),
  })

const syncPanels: Step = (model) =>
  Option.match(validReading(model.route), {
    onNone: () => ({ model }),
    onSome: (reading) =>
      Update.combine(
        model,
        model.panels.map((panel) => foldPanelFocus(panel.id, focusOf(reading))),
      ),
  })

const syncConfessionPage: Step = (model) => {
  const { route } = model
  if (!AppRoute.guards.ConfessionSection(route) && !AppRoute.guards.ConfessionQuestion(route))
    return { model }
  return Option.match(articleOfRoute(route), {
    onNone: () => ({ model }),
    onSome: (key) => foldConfessionArticle(model, key),
  })
}

const followRoute = Update.combine([
  (model: Model) => ({ model: recordPosition(model) }),
  syncReader,
  syncPanels,
  syncConfessionPage,
])

export const init: Runtime.RoutingApplicationInit<Model, Message, Flags, AppServices> = (
  { saved },
  url: Url,
) => {
  const asked = urlToAppRoute(url)
  const resume = AppRoute.guards.Home(asked)
    ? Option.map(saved.readingPosition, positionRoute)
    : Option.none()
  const opened = followRoute({
    route: Option.getOrElse(resume, () => asked),
    saved,
    catalog: CatalogState.Loading(),
    reader: Reader.init(),
    panels: saved.panels.map(Panel.init),
    confessionPage: ConfessionPage.init(),
    referenceInput: "",
    referenceProblem: Option.none(),
    isNarrow: false,
    dockTabs: Tabs.init({ id: "panel-tabs" }),
    activeTab: Option.none(),
    reloadRequested: false,
    layoutNotice: Option.none(),
  })
  return saveIfChanged(saved, {
    model: opened.model,
    commands: [
      FetchCatalog(),
      ...Option.toArray(Option.map(resume, (route) => ReplaceUrl({ url: hrefOfRoute(route) }))),
      ...(opened.commands ?? []),
    ],
  })
}

const changeArrangement = (
  model: Model,
  change: (panels: Model["saved"]["panels"]) => Model["saved"]["panels"],
): Model => modifyFields(model, { saved: (saved) => modifyFields(saved, { panels: change }) })

const addPanel =
  (id: string): Step =>
  (model) => {
    const option = addablePanels(model.saved.panels, catalogOf(model)).find(
      ({ spec }) => Panel.panelId(spec) === id,
    )
    if (option === undefined) return { model }
    const added = modifyFields(
      changeArrangement(model, (panels) => [...panels, option.spec]),
      {
        panels: (panels) => [...panels, Panel.init(option.spec)],
      },
    )
    return Option.match(validReading(added.route), {
      onNone: () => ({ model: added }),
      onSome: (reading) => foldPanelFocus(added, id, focusOf(reading)),
    })
  }

const dropUnavailableResources: Step = (model) => {
  const { saved, removed } = dropUnavailable(model.saved, catalogOf(model))
  if (removed.length === 0) return { model }
  const kept = new Set(saved.panels.map(Panel.panelId))
  const dropped = modifyFields(model, {
    saved: () => saved,
    panels: (panels) => panels.filter(({ id }) => kept.has(id)),
    layoutNotice: () => Option.some(removed),
  })
  return saved.translation === model.saved.translation ? { model: dropped } : syncReader(dropped)
}

const goToReference = (model: Model): UpdateReturn => {
  const input = model.referenceInput.trim()
  return Result.match(parseReference(input), {
    onSuccess: ([passage]) =>
      passage === undefined
        ? { model }
        : {
            model: modifyFields(model, {
              referenceInput: () => "",
              referenceProblem: () => Option.none(),
            }),
            commands: [NavigateInternal({ url: passagePath(passage) })],
          },
    onFailure: (invalid) => ({
      model: modifyFields(model, {
        referenceProblem: () =>
          Option.some({
            message: `"${input}" is not a passage in the Bible.`,
            suggestion: Option.map(Option.fromUndefinedOr(invalid.suggestion), (passage) => ({
              label: formatPassage(passage),
              href: passagePath(passage),
            })),
          }),
      }),
    }),
  })
}

export const update = (model: Model, message: Message): UpdateReturn =>
  saveIfChanged(model.saved, updateModel(model, message))

const updateModel = (model: Model, message: Message): UpdateReturn =>
  Message.match<UpdateReturn>(message, {
    ClickedLink: ({ request }) =>
      UrlRequest.match<UpdateReturn>(request, {
        Internal: ({ url }) => ({ model, commands: [NavigateInternal({ url: urlToString(url) })] }),
        External: ({ href }) => ({ model, commands: [LoadExternal({ href })] }),
      }),
    ChangedUrl: ({ url }) =>
      followRoute(
        modifyFields(model, {
          route: () => urlToAppRoute(url),
          referenceProblem: () => Option.none(),
        }),
      ),
    CompletedNavigateInternal: () => ({ model }),
    CompletedReplaceUrl: () => ({ model }),
    CompletedLoadExternal: () => ({ model }),
    CompletedScrollToVerse: () => ({ model }),
    SucceededFetchCatalog: ({ resources }) =>
      dropUnavailableResources(
        modifyFields(model, { catalog: () => CatalogState.Loaded({ resources }) }),
      ),
    FailedFetchCatalog: ({ error }) =>
      Update.combine(modifyFields(model, { catalog: () => CatalogState.Failed({ error }) }), [
        LoadError.guards.Missing(error) ? requestReload : keepModel,
      ]),
    GotReaderMessage: ({ message: readerMessage }) => foldReader(model, readerMessage),
    GotPanelMessage: ({ panelId, message: panelMessage }) =>
      foldPanel(model, panelId, panelMessage),
    GotConfessionPageMessage: ({ message: pageMessage }) => foldConfessionPage(model, pageMessage),
    GotDockTabsMessage: ({ message: tabsMessage }) => foldDockTabs(model, tabsMessage),
    ChangedTranslation: ({ translation }) => {
      const chosen = modifyFields(model, {
        saved: (saved) => modifyFields(saved, { translation: () => translation }),
      })
      const { route } = chosen
      // A `t` override would hide the new choice, so the view drops it.
      const withoutOverride = AppRoute.matchOrElse(
        route,
        {
          Chapter: (chapter) =>
            Option.map(chapter.t, () => chapterRouter({ ...chapter, t: Option.none() })),
          Verses: (verses) =>
            Option.map(verses.t, () => versesRouter({ ...verses, t: Option.none() })),
        },
        () => Option.none<string>(),
      )
      return Option.match(withoutOverride, {
        onNone: () => followRoute(chosen),
        onSome: (url) => ({ model: chosen, commands: [ReplaceUrl({ url })] }),
      })
    },
    UpdatedReferenceInput: ({ value }) => ({
      model: modifyFields(model, { referenceInput: () => value }),
    }),
    SubmittedReference: () => goToReference(model),
    ClickedRemovePanel: ({ panelId }) => ({
      model: modifyFields(
        changeArrangement(model, (panels) => removePanel(panels, panelId)),
        {
          panels: (panels) => panels.filter((panel) => panel.id !== panelId),
        },
      ),
    }),
    ClickedMovePanelUp: ({ panelId }) => ({
      model: changeArrangement(model, (panels) => movePanel(panels, panelId, -1)),
    }),
    ClickedMovePanelDown: ({ panelId }) => ({
      model: changeArrangement(model, (panels) => movePanel(panels, panelId, 1)),
    }),
    ChosePanelToAdd: ({ panelId }) => addPanel(panelId)(model),
    ChangedViewportWidth: ({ isNarrow }) =>
      isNarrow === model.isNarrow
        ? { model }
        : { model: modifyFields(model, { isNarrow: () => isNarrow }) },
    StartedReload: () => ({ model }),
    DeclinedRepeatReload: () => ({ model }),
    CompletedSaveLayout: () => ({ model }),
    DismissedLayoutNotice: () => ({
      model: modifyFields(model, { layoutNotice: () => Option.none() }),
    }),
  })

export { DockTabs }
