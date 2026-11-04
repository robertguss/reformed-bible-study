import {
  bookByOsis,
  type CatalogResource,
  formatPassage,
  passagePath,
  verseCount,
} from "@reformed-bible/core"
import { Option } from "effect"
import type { Document, Html, HtmlBuilder } from "foldkit/html"
import * as ConfessionPage from "./confession-page/index.ts"
import { Message } from "./message.ts"
import { catalogOf, type Model } from "./model.ts"
import { addablePanels, panelTitle } from "./panels/arrangement.ts"
import * as Panel from "./panels/panel.ts"
import * as Reader from "./reader/index.ts"
import { problemOf, type Reading, readingOfRoute, validReading } from "./reading.ts"
import { AppRoute, articleOfRoute, type ConfessionRoute, homeRouter } from "./route.ts"
import { DockTabs, translationOf } from "./update.ts"

const SITE_NAME = "Reformed Bible Study"

const chapterTitle = ({ book, chapter }: Reading): string =>
  formatPassage({
    start: { book, chapter, verse: 1 },
    end: { book, chapter, verse: verseCount(book, chapter) },
  })

const translationOptions = (model: Model): ReadonlyArray<CatalogResource> =>
  catalogOf(model).filter(
    (resource) => resource.kind === "translation" && resource.status.state === "active",
  )

const translationPicker = (model: Model, h: HtmlBuilder<Message>) => {
  const current = translationOf(model)
  const listed = translationOptions(model)
  const options = listed.some(({ id }) => id === current)
    ? listed.map(({ id, title }) => ({ id, title }))
    : [
        { id: current, title: current.toUpperCase() },
        ...listed.map(({ id, title }) => ({ id, title })),
      ]
  return h.div(
    [h.Class("translation-picker")],
    [
      h.label([h.For("translation-picker")], ["Translation"]),
      h.select(
        [
          h.Id("translation-picker"),
          h.Value(current),
          h.OnChange((translation) => Message.ChangedTranslation({ translation })),
        ],
        options.map(({ id, title }) =>
          h.keyed("option")(id, [h.Value(id), h.Selected(id === current)], [title]),
        ),
      ),
    ],
  )
}

const referenceForm = (model: Model, h: HtmlBuilder<Message>) =>
  h.form(
    [h.Class("reference-form"), h.Role("search"), h.OnSubmit(Message.SubmittedReference())],
    [
      h.label([h.For("reference-input")], ["Passage"]),
      h.input([
        h.Id("reference-input"),
        h.Type("text"),
        h.Placeholder("Romans 8:28"),
        h.Value(model.referenceInput),
        h.OnInput((value) => Message.UpdatedReferenceInput({ value })),
      ]),
      h.button([h.Type("submit")], ["Go"]),
      ...Option.match(model.referenceProblem, {
        onNone: () => [],
        onSome: ({ message, suggestion }) => [
          h.p(
            [h.Class("reference-problem"), h.Role("alert")],
            [
              message,
              ...Option.match(suggestion, {
                onNone: () => [],
                onSome: ({ label, href }) => [" ", h.a([h.Href(href)], [`Open ${label}`])],
              }),
            ],
          ),
        ],
      }),
    ],
  )

const headerView = (model: Model, h: HtmlBuilder<Message>) =>
  h.header(
    [h.Class("site-header")],
    [
      h.a([h.Class("site-name"), h.Href(homeRouter())], [SITE_NAME]),
      referenceForm(model, h),
      translationPicker(model, h),
    ],
  )

const layoutNoticeView = (model: Model, h: HtmlBuilder<Message>): Html =>
  Option.match(model.layoutNotice, {
    onNone: () => null,
    onSome: (removed) =>
      h.div(
        [h.Class("layout-notice"), h.Role("status")],
        [
          h.p(
            [],
            [
              `Removed from your saved layout because they are no longer available: ${removed.join(", ")}.`,
            ],
          ),
          h.button([h.Type("button"), h.OnClick(Message.DismissedLayoutNotice())], ["Dismiss"]),
        ],
      ),
  })

const panelControls = (
  model: Model,
  spec: Panel.PanelSpec,
  index: number,
  h: HtmlBuilder<Message>,
) => {
  const id = Panel.panelId(spec)
  const title = panelTitle(spec, catalogOf(model))
  const last = model.saved.panels.length - 1
  return h.header(
    [h.Class("panel-header")],
    [
      h.h2([h.Id(`panel-title-${id}`)], [title]),
      h.div(
        [h.Class("panel-controls")],
        [
          h.button(
            [
              h.Type("button"),
              h.AriaLabel(`Move ${title} up`),
              h.Disabled(index === 0),
              h.OnClick(Message.ClickedMovePanelUp({ panelId: id })),
            ],
            ["↑"],
          ),
          h.button(
            [
              h.Type("button"),
              h.AriaLabel(`Move ${title} down`),
              h.Disabled(index === last),
              h.OnClick(Message.ClickedMovePanelDown({ panelId: id })),
            ],
            ["↓"],
          ),
          h.button(
            [
              h.Type("button"),
              h.AriaLabel(`Remove ${title}`),
              h.OnClick(Message.ClickedRemovePanel({ panelId: id })),
            ],
            ["×"],
          ),
        ],
      ),
    ],
  )
}

const panelBody = (model: Model, id: string, h: HtmlBuilder<Message>): Html =>
  Option.match(Option.fromUndefinedOr(model.panels.find((panel) => panel.id === id)), {
    onNone: () => null,
    onSome: (panel) =>
      h.submodel({
        slotId: id,
        model: panel,
        view: Panel.view,
        viewInputs: { catalog: catalogOf(model) },
        toParentMessage: (message) => Message.GotPanelMessage({ panelId: id, message }),
      }),
  })

const panelSection = (
  model: Model,
  spec: Panel.PanelSpec,
  index: number,
  h: HtmlBuilder<Message>,
) => {
  const id = Panel.panelId(spec)
  return h.keyed("section")(
    id,
    [h.Class("panel"), h.AriaLabelledBy(`panel-title-${id}`)],
    [panelControls(model, spec, index, h), panelBody(model, id, h)],
  )
}

const addPanelMenu = (model: Model, placement: "column" | "dock", h: HtmlBuilder<Message>) => {
  const options = addablePanels(model.saved.panels, catalogOf(model))
  return options.length === 0
    ? null
    : h.div(
        [h.Class("add-panel")],
        [
          h.label([h.For(`add-panel-${placement}`)], ["Add panel"]),
          h.select(
            [
              h.Id(`add-panel-${placement}`),
              h.Value(""),
              h.OnChange((panelId) => Message.ChosePanelToAdd({ panelId })),
            ],
            [
              h.option([h.Value(""), h.Selected(true)], ["Choose a panel…"]),
              ...options.map(({ spec, label }) =>
                h.keyed("option")(Panel.panelId(spec), [h.Value(Panel.panelId(spec))], [label]),
              ),
            ],
          ),
        ],
      )
}

const panelColumn = (model: Model, h: HtmlBuilder<Message>) =>
  h.aside(
    [h.Class("panel-column"), h.AriaLabel("Study panels")],
    [
      ...model.saved.panels.map((spec, index) => panelSection(model, spec, index, h)),
      addPanelMenu(model, "column", h),
    ],
  )

const panelDock = (model: Model, h: HtmlBuilder<Message>) => {
  const ids = model.saved.panels.map(Panel.panelId)
  const [firstId] = ids
  if (firstId === undefined) return h.div([h.Class("panel-dock")], [addPanelMenu(model, "dock", h)])
  const selected = Option.getOrElse(
    Option.filter(model.activeTab, (id) => ids.includes(id)),
    () => firstId,
  )
  return h.div(
    [h.Class("panel-dock")],
    [
      h.submodel({
        slotId: "panel-tabs",
        model: model.dockTabs,
        view: DockTabs.view,
        viewInputs: {
          tabs: ids,
          selectedValue: selected,
          ariaLabel: "Study panels",
          toView: ({ tablist, tabs }) =>
            h.div(
              [h.Class("dock-tabs")],
              [
                h.div(
                  [h.Class("tablist"), ...tablist],
                  tabs.map(({ value, tab, index }) => {
                    const spec = model.saved.panels[index]
                    return h.keyed("button")(
                      value,
                      [...tab],
                      [spec === undefined ? value : panelTitle(spec, catalogOf(model))],
                    )
                  }),
                ),
                ...tabs.flatMap(({ value, panel, isActive, index }) => {
                  const spec = model.saved.panels[index]
                  return isActive && spec !== undefined
                    ? [
                        h.keyed("div")(
                          value,
                          [h.Class("dock-panel"), ...panel],
                          [panelSection(model, spec, index, h)],
                        ),
                      ]
                    : []
                }),
              ],
            ),
        },
        toParentMessage: (message) => Message.GotDockTabsMessage({ message }),
      }),
      addPanelMenu(model, "dock", h),
    ],
  )
}

const readerView = (model: Model, reading: Reading, h: HtmlBuilder<Message>) =>
  h.submodel({
    slotId: "reader",
    model: model.reader,
    view: Reader.view,
    viewInputs: {
      title: chapterTitle(reading),
      selection: reading.selection,
    },
    toParentMessage: (message) => Message.GotReaderMessage({ message }),
  })

const workbench = (model: Model, reading: Reading, h: HtmlBuilder<Message>) =>
  h.div(
    [h.Class(model.isNarrow ? "workbench narrow" : "workbench")],
    [
      h.main([h.Class("passage-scroll")], [readerView(model, reading, h)]),
      model.isNarrow ? panelDock(model, h) : panelColumn(model, h),
    ],
  )

const invalidPassageView = (reading: Reading, h: HtmlBuilder<Message>) => {
  const book = bookByOsis(reading.book)?.name ?? reading.book
  const asked = Option.match(reading.selection, {
    onNone: () => `${book} ${reading.chapter}`,
    onSome: ({ first, last }) =>
      `${book} ${reading.chapter}:${first === last ? first : `${first}-${last}`}`,
  })
  return h.main(
    [h.Class("not-found")],
    [
      h.p([], [`${asked} is not in the Bible.`]),
      ...Option.match(
        Option.flatMap(problemOf(reading), ({ suggestion }) => Option.fromUndefinedOr(suggestion)),
        {
          onNone: () => [],
          onSome: (passage) => [
            h.a([h.Href(passagePath(passage))], [`Open ${formatPassage(passage)}`]),
          ],
        },
      ),
    ],
  )
}

const notFoundView = (h: HtmlBuilder<Message>) =>
  h.main(
    [h.Class("not-found")],
    [
      h.p([], ["There is no page at this address."]),
      h.a([h.Href(homeRouter())], ["Open Romans 1"]),
    ],
  )

const passageView = (model: Model, h: HtmlBuilder<Message>): Html =>
  Option.match(validReading(model.route), {
    onSome: (reading) => workbench(model, reading, h),
    onNone: () =>
      Option.match(readingOfRoute(model.route), {
        onSome: (reading) => invalidPassageView(reading, h),
        onNone: () => notFoundView(h),
      }),
  })

const confessionView = (model: Model, route: ConfessionRoute, h: HtmlBuilder<Message>): Html =>
  Option.isNone(articleOfRoute(route))
    ? notFoundView(h)
    : h.main(
        [h.Class("confession-page")],
        [
          h.submodel({
            slotId: "confession-page",
            model: model.confessionPage,
            view: ConfessionPage.view,
            viewInputs: { catalog: catalogOf(model) },
            toParentMessage: (message) => Message.GotConfessionPageMessage({ message }),
          }),
        ],
      )

const titleOf = (model: Model): string =>
  AppRoute.match(model.route, {
    Home: () => SITE_NAME,
    Chapter: () => pageTitle(model),
    Verses: () => pageTitle(model),
    ConfessionSection: () => `Confession · ${SITE_NAME}`,
    ConfessionQuestion: () => `Confession · ${SITE_NAME}`,
    ConfessionConclusion: () => `Confession · ${SITE_NAME}`,
    NotFound: () => `Not found · ${SITE_NAME}`,
  })

const pageTitle = (model: Model): string =>
  Option.match(validReading(model.route), {
    onNone: () => SITE_NAME,
    onSome: (reading) => `${chapterTitle(reading)} · ${SITE_NAME}`,
  })

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: titleOf(model),
  lang: "en",
  body: h.div(
    [h.Class("app")],
    [
      headerView(model, h),
      layoutNoticeView(model, h),
      AppRoute.match(model.route, {
        Home: () => passageView(model, h),
        Chapter: () => passageView(model, h),
        Verses: () => passageView(model, h),
        ConfessionSection: (route) => confessionView(model, route, h),
        ConfessionQuestion: (route) => confessionView(model, route, h),
        ConfessionConclusion: (route) => confessionView(model, route, h),
        NotFound: () => notFoundView(h),
      }),
    ],
  ),
})
