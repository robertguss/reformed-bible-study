import { Option } from "effect"
import { Command, given, message, story } from "foldkit/story"
import { describe, expect, it } from "vitest"
import { Message } from "../src/message.ts"
import { defaultSaved } from "../src/model.ts"
import { ReplaceUrl } from "../src/navigation.ts"
import * as Panel from "../src/panels/panel.ts"
import * as Reader from "../src/reader/index.ts"
import { ReloadOntoCurrentBuild } from "../src/reload.ts"
import { init, update } from "../src/update.ts"
import { argsOf, boot, settle, urlOf } from "./app.ts"
import { runCommand, staticHost } from "./fixture.ts"

const DEFAULT_PANELS = [
  Panel.PanelSpec.Commentary({ resourceId: "calvin-commentaries" }),
  Panel.PanelSpec.Confessions(),
  Panel.PanelSpec.CrossReferences(),
  Panel.PanelSpec.OriginalLanguage(),
]

/** Nothing stored on this device yet. */
const FIRST_VISIT = { saved: defaultSaved }

const panelFetches = (focus: string) =>
  DEFAULT_PANELS.map((spec) => ({ spec, focus, cursor: Option.none() }))

const panelFocuses = (state: { readonly panels: ReadonlyArray<Panel.Model> }) =>
  state.panels.map(({ load }) =>
    Panel.LoadState.match(load, {
      Idle: () => "idle",
      Loading: ({ focus }) => `Loading ${focus}`,
      Loaded: ({ focus }) => `Loaded ${focus}`,
      Failed: ({ focus }) => `Failed ${focus}`,
    }),
  )

describe("opening a passage URL", () => {
  it("opens /romans/8/28 in the default translation with every default panel on 8:28", () => {
    const opened = init(FIRST_VISIT, urlOf("/romans/8/28"))
    expect(argsOf(opened.commands, "FetchPassage")).toEqual([
      { book: "Rom", chapter: 8, translation: "bsb" },
    ])
    expect(argsOf(opened.commands, "FetchPanel")).toEqual(panelFetches("Rom.8.28"))
  })

  it("shows the KJV for ?t=kjv and leaves the stored translation unchanged", () => {
    const opened = init(FIRST_VISIT, urlOf("/romans/8/28?t=kjv"))
    expect(argsOf(opened.commands, "FetchPassage")).toEqual([
      { book: "Rom", chapter: 8, translation: "kjv" },
    ])
    expect(opened.model.saved.translation).toBe("bsb")
  })

  it("points the panels at verse 1 for a chapter URL with no verse", () => {
    const opened = init(FIRST_VISIT, urlOf("/romans/8"))
    expect(argsOf(opened.commands, "FetchPanel")).toEqual(panelFetches("Rom.8.1"))
  })

  it("opens Romans 1 in the default arrangement on a first visit to /", () => {
    const opened = init(FIRST_VISIT, urlOf("/"))
    expect(argsOf(opened.commands, "FetchPassage")).toEqual([
      { book: "Rom", chapter: 1, translation: "bsb" },
    ])
    expect(argsOf(opened.commands, "FetchPanel")).toEqual(panelFetches("Rom.1.1"))
    expect(opened.model.saved.panels).toEqual(DEFAULT_PANELS)
  })
})

describe("selecting a verse", () => {
  it("replaces the history entry with the verse URL, keeping the translation query", async () => {
    const opened = await boot("/romans/8/28?t=kjv")
    story(
      update,
      given(opened),
      message(Message.GotReaderMessage({ message: Reader.Message.ClickedVerse({ verse: 31 }) })),
      Command.expectExact(ReplaceUrl({ url: "/romans/8/31?t=kjv" })),
      Command.resolve(ReplaceUrl, Message.CompletedReplaceUrl()),
    )
  })

  it("moves the panels from 8:28 to 8:31 without reloading the chapter", async () => {
    const opened = await boot("/romans/8/28")
    expect(panelFocuses(opened)).toEqual(Array(4).fill("Loaded Rom.8.28"))
    const moved = update(opened, Message.ChangedUrl({ url: urlOf("/romans/8/31") }))
    expect(argsOf(moved.commands, "FetchPassage")).toEqual([])
    expect(argsOf(moved.commands, "FetchPanel")).toEqual(panelFetches("Rom.8.31"))
    expect(panelFocuses(await settle(moved))).toEqual(Array(4).fill("Loaded Rom.8.31"))
  })

  it("keeps the panels on 8:31 when the 8:28 response arrives after 8:31 was selected", async () => {
    const opened = init(FIRST_VISIT, urlOf("/romans/8/28"))
    const late = await runCommand(
      Panel.FetchPanel({ spec: DEFAULT_PANELS[0]!, focus: "Rom.8.28", cursor: Option.none() }),
    )
    const moved = update(opened.model, Message.ChangedUrl({ url: urlOf("/romans/8/31") })).model
    const after = update(
      moved,
      Message.GotPanelMessage({ panelId: "commentary:calvin-commentaries", message: late }),
    )
    expect(after.model.panels[0]?.load).toMatchObject({ _tag: "Loading", focus: "Rom.8.31" })
    expect(after.commands ?? []).toEqual([])
  })
})

describe("switching translation", () => {
  it("sets the stored translation from the picker and loads the chapter in it", async () => {
    const opened = await boot("/romans/8/28")
    const switched = update(opened, Message.ChangedTranslation({ translation: "kjv" }))
    expect(switched.model.saved.translation).toBe("kjv")
    expect(argsOf(switched.commands, "FetchPassage")).toEqual([
      { book: "Rom", chapter: 8, translation: "kjv" },
    ])
  })
})

describe("a data file replaced by a newer deploy", () => {
  const appPageForCommentary = staticHost({
    servesAppPage: ["commentary/calvin-commentaries/Rom.8.json"],
  })

  it("reloads once onto the current build instead of reporting the passage as not covered", async () => {
    const opened = init(FIRST_VISIT, urlOf("/romans/8/28"))
    const missing = await runCommand(
      Panel.FetchPanel({ spec: DEFAULT_PANELS[0]!, focus: "Rom.8.28", cursor: Option.none() }),
      appPageForCommentary,
    )
    expect(missing).toMatchObject({ _tag: "FailedFetchPanel", error: { _tag: "Missing" } })

    const first = update(
      opened.model,
      Message.GotPanelMessage({ panelId: "commentary:calvin-commentaries", message: missing }),
    )
    expect(argsOf(first.commands, ReloadOntoCurrentBuild.name)).toHaveLength(1)
    expect(first.model.panels[0]?.load).toMatchObject({ _tag: "Failed", focus: "Rom.8.28" })

    const again = update(
      first.model,
      Message.GotPanelMessage({ panelId: "commentary:calvin-commentaries", message: missing }),
    )
    expect(argsOf(again.commands, ReloadOntoCurrentBuild.name)).toHaveLength(0)
  })
})
