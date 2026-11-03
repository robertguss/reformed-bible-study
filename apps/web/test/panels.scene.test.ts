import { Option } from "effect"
import { Scene, Story } from "foldkit"
import { UrlRequest } from "foldkit/navigation"
import { assert, describe, it } from "vitest"
import { Message } from "../src/message.ts"
import type { Model } from "../src/model.ts"
import { SaveLayout } from "../src/layout/storage.ts"
import { NavigateInternal, ReplaceUrl } from "../src/navigation.ts"
import { coverageMessage, passageOfFocus } from "../src/panels/context.ts"
import * as Panel from "../src/panels/panel.ts"
import { update } from "../src/update.ts"
import { view } from "../src/view.ts"
import { boot, urlOf } from "./app.ts"
import {
  BSB_ATTRIBUTION,
  CALVIN_ATTRIBUTION,
  CATALOG,
  CALVIN_ON_8_28,
  CALVIN_ON_8_31,
  ROMANS_8_28_KJV,
  runCommand,
  SBLGNT_ATTRIBUTION,
  SCRIPT_IN_COMMENTARY,
  staticHost,
  WCF_3_6_TEXT,
  WCF_ATTRIBUTION,
  XREF_ATTRIBUTION,
} from "./fixture.ts"

const {
  all,
  click,
  expect,
  expectAll,
  given,
  inside,
  keydown,
  role,
  scene,
  selector,
  text,
  within,
} = Scene

const app = { update, view }

const panel = (name: string) => role("region", { name })
const verse = (n: number) => selector(`[data-verse="${n}"]`)

describe("the chapter view", () => {
  it("highlights the linked verse and shows the panels on it, then follows a selected verse", async () => {
    const opened = await boot("/romans/8/28")
    scene(
      app,
      given(opened),
      expect(role("heading", { name: "Romans 8", level: 1 })).toExist(),
      expect(verse(28)).toHaveAttr("aria-current", "true"),
      expect(verse(31)).not.toHaveAttr("aria-current", "true"),
      inside(
        panel("Calvin's Commentaries"),
        expect(role("heading", { name: "Romans 8:28-30" })).toExist(),
        expect(text(CALVIN_ON_8_28, { exact: false })).toExist(),
      ),
      click(verse(31)),
      Scene.Command.expectExact(ReplaceUrl({ url: "/romans/8/31" })),
      Scene.Command.resolve(ReplaceUrl, Message.CompletedReplaceUrl()),
    )
    const moved = await boot("/romans/8/31")
    scene(
      app,
      given(moved),
      expect(verse(31)).toHaveAttr("aria-current", "true"),
      inside(panel("Calvin's Commentaries"), expect(text(CALVIN_ON_8_31)).toExist()),
    )
  })

  it("selects a focused verse with Enter", async () => {
    scene(
      app,
      given(await boot("/romans/8/28")),
      keydown(verse(31), "Enter"),
      Scene.Command.expectExact(ReplaceUrl({ url: "/romans/8/31" })),
      Scene.Command.resolve(ReplaceUrl, Message.CompletedReplaceUrl()),
    )
  })

  it("shows the KJV for ?t=kjv", async () => {
    scene(
      app,
      given(await boot("/romans/8/28?t=kjv")),
      expect(verse(28)).toContainText(ROMANS_8_28_KJV),
      expect(Scene.label("Translation")).toHaveValue("kjv"),
    )
  })

  it("marks Romans 16:24 as not in the BSB", async () => {
    scene(
      app,
      given(await boot("/romans/16")),
      expect(verse(24)).toContainText("Not in this translation."),
      expect(verse(23)).toContainText("Gaius"),
    )
  })

  it("suggests Romans 16 for /romans/17", async () => {
    scene(
      app,
      given(await boot("/romans/17")),
      expect(text("Romans 17 is not in the Bible.")).toExist(),
      expect(role("link", { name: "Open Romans 16" })).toHaveAttr("href", "/romans/16"),
    )
  })

  it("shows chapter 8 with no highlight for /romans/8", async () => {
    scene(
      app,
      given(await boot("/romans/8")),
      expectAll(all.selector('[aria-current="true"]')).toBeEmpty(),
    )
  })
})

describe("coverage messages", () => {
  it("says Genesis 1 is not yet covered in the commentary panel", async () => {
    scene(
      app,
      given(await boot("/genesis/1")),
      expect(verse(1)).toContainText("In the beginning"),
      inside(
        panel("Calvin's Commentaries"),
        expect(text("Genesis 1:1 is not yet covered.")).toExist(),
      ),
    )
  })

  it("says Calvin did not write on Revelation rather than that it is not yet covered", async () => {
    scene(
      app,
      given(await boot("/revelation/1")),
      inside(
        panel("Calvin's Commentaries"),
        expect(text("John Calvin did not write on Revelation.")).toExist(),
        expect(text(/not yet covered/)).toBeAbsent(),
      ),
    )
  })

  it("says when a covered work has no entry for the verse", async () => {
    scene(
      app,
      given(await boot("/romans/8/2")),
      inside(
        panel("Calvin's Commentaries"),
        expect(text("Calvin's Commentaries has no comment on this verse.")).toExist(),
      ),
      inside(
        panel("Confessions"),
        expect(
          text("No article cites this verse in: The Westminster Confession of Faith."),
        ).toExist(),
      ),
    )
  })

  it("gives a withdrawn resource's reason", () => {
    const message = coverageMessage(
      {
        resourceId: "calvin-commentaries",
        coverage: "covered",
        status: { state: "withdrawn", reason: "The source retracted its license." },
      },
      { catalog: CATALOG, passage: Option.getOrThrow(passageOfFocus("Rom.8.28")) },
      () => "unused",
    )
    assert.deepStrictEqual(
      message,
      Option.some("Calvin's Commentaries has been withdrawn: The source retracted its license."),
    )
  })

  it("lists confessions that cite the verse, then those not yet available", async () => {
    scene(
      app,
      given(await boot("/romans/8/28")),
      inside(
        panel("Confessions"),
        expect(role("link", { name: "WCF 3.6" })).toHaveAttr("href", "/confessions/wcf/3/6"),
        expect(text("Not yet available: The Heidelberg Catechism.")).toExist(),
      ),
    )
  })
})

describe("panel content", () => {
  it("shows each panel's attribution text in its footer", async () => {
    const opened = await boot("/romans/8/28")
    scene(
      app,
      given(opened),
      expect(within(panel("Calvin's Commentaries"), selector("footer"))).toContainText(
        CALVIN_ATTRIBUTION,
      ),
      expect(within(panel("Confessions"), selector("footer"))).toContainText(WCF_ATTRIBUTION),
      expect(within(panel("Cross-references"), selector("footer"))).toContainText(XREF_ATTRIBUTION),
      expect(within(panel("Original language"), selector("footer"))).toContainText(
        SBLGNT_ATTRIBUTION,
      ),
      expect(within(selector("article.passage"), selector("footer"))).toContainText(
        BSB_ATTRIBUTION,
      ),
    )
  })

  it("renders a commentary run holding <script> as literal text", async () => {
    scene(
      app,
      given(await boot("/romans/8/28")),
      expect(text(SCRIPT_IN_COMMENTARY)).toExist(),
      expectAll(all.selector("script")).toBeEmpty(),
    )
  })

  it("shows Greek with its Strong's number and gloss, tagged as Greek", async () => {
    scene(
      app,
      given(await boot("/romans/8/28")),
      inside(
        panel("Original language"),
        expect(selector('ol[lang="grc"]')).toContainText("Οἴδαμεν"),
        expect(text("G1492")).toExist(),
        expect(text("to know")).toExist(),
        expect(text("The Textus Receptus behind the KJV differs here.")).toExist(),
      ),
    )
  })

  it("loads the next page when a result carries a cursor", async () => {
    const opened = await boot("/romans/8/28")
    const firstPage = Option.getOrThrow(
      Option.fromUndefinedOr(opened.panels.find(({ id }) => id === "cross-references")),
    )
    const cursor = Panel.LoadState.guards.Loaded(firstPage.load)
      ? firstPage.load.result.envelope.cursor
      : undefined
    const next = Panel.FetchPanel({
      spec: Panel.PanelSpec.CrossReferences(),
      focus: "Rom.8.28",
      cursor: Option.fromUndefinedOr(cursor),
    })
    const nextPage = await runCommand(next)
    scene(
      app,
      given(opened),
      inside(panel("Cross-references"), expectAll(all.role("listitem")).toHaveCount(25)),
      click(within(panel("Cross-references"), role("button", { name: "Show more" }))),
      Scene.Command.expectExact(next),
      Scene.Command.resolve(next, nextPage),
      inside(panel("Cross-references"), expectAll(all.role("listitem")).toHaveCount(30)),
      expect(within(panel("Cross-references"), role("button", { name: "Show more" }))).toBeAbsent(),
    )
  })
})

describe("load failures", () => {
  it("shows an unavailable panel as a retry message, not a coverage message", async () => {
    const busy = staticHost({ unavailable: ["commentary/calvin-commentaries/Rom.8.json"] })
    scene(
      app,
      given(await boot("/romans/8/28", busy)),
      inside(
        panel("Calvin's Commentaries"),
        expect(role("alert")).toContainText("could not be reached"),
        expect(text(/not yet covered|did not write|has no comment/)).toBeAbsent(),
        click(role("button", { name: "Retry" })),
      ),
      Scene.Command.expectExact(
        Panel.FetchPanel({
          spec: Panel.PanelSpec.Commentary({ resourceId: "calvin-commentaries" }),
          focus: "Rom.8.28",
          cursor: Option.none(),
        }),
      ),
      Scene.Command.resolve(
        Panel.FetchPanel,
        await runCommand(
          Panel.FetchPanel({
            spec: Panel.PanelSpec.Commentary({ resourceId: "calvin-commentaries" }),
            focus: "Rom.8.28",
            cursor: Option.none(),
          }),
        ),
      ),
      inside(
        panel("Calvin's Commentaries"),
        expect(text(CALVIN_ON_8_28, { exact: false })).toExist(),
      ),
    )
  })

  it("shows the app page served for a data file as a load error, never as not covered", async () => {
    const stale = staticHost({ servesAppPage: ["commentary/calvin-commentaries/Rom.8.json"] })
    scene(
      app,
      given(await boot("/romans/8/28", stale)),
      inside(
        panel("Calvin's Commentaries"),
        expect(role("alert")).toExist(),
        expect(text(/not yet covered/)).toBeAbsent(),
      ),
    )
  })
})

describe("arranging panels", () => {
  it("removes, moves and adds panels with keyboard-operable buttons", async () => {
    const opened = await boot("/romans/8/28")
    const headings = () => all.selector("aside.panel-column .panel-header h2")
    scene(
      app,
      given(opened),
      click(role("button", { name: "Move Cross-references up" })),
      Scene.Command.resolve(SaveLayout, Message.CompletedSaveLayout()),
      expect(Scene.nth(headings(), 1)).toHaveText("Cross-references"),
      expect(Scene.nth(headings(), 2)).toHaveText("Confessions"),
      click(role("button", { name: "Move Calvin's Commentaries down" })),
      Scene.Command.resolve(SaveLayout, Message.CompletedSaveLayout()),
      expect(Scene.nth(headings(), 0)).toHaveText("Cross-references"),
      click(role("button", { name: "Remove Original language" })),
      Scene.Command.resolve(SaveLayout, Message.CompletedSaveLayout()),
      expect(panel("Original language")).toBeAbsent(),
      inside(
        Scene.label("Add panel"),
        expectAll(all.role("option", { name: "Original language" })).toHaveCount(1),
        expectAll(all.role("option", { name: "Confessions" })).toBeEmpty(),
      ),
      Scene.change(Scene.label("Add panel"), "original-language"),
      Scene.Command.expectExact(
        Panel.FetchPanel({
          spec: Panel.PanelSpec.OriginalLanguage(),
          focus: "Rom.8.28",
          cursor: Option.none(),
        }),
        SaveLayout,
      ),
      Scene.Command.resolve(SaveLayout, Message.CompletedSaveLayout()),
      Scene.Command.resolve(
        Panel.FetchPanel,
        await runCommand(
          Panel.FetchPanel({
            spec: Panel.PanelSpec.OriginalLanguage(),
            focus: "Rom.8.28",
            cursor: Option.none(),
          }),
        ),
      ),
      expect(Scene.nth(headings(), 3)).toHaveText("Original language"),
      expect(within(panel("Original language"), text("G1492"))).toExist(),
    )
  })
})

describe("narrow screens", () => {
  it("shows the panels as tabs in a dock, in panel order, apart from the scrolling text", async () => {
    const opened = await boot("/romans/8/28")
    const narrow: Model = update(opened, Message.ChangedViewportWidth({ isNarrow: true })).model
    scene(
      app,
      given(narrow),
      expect(selector("aside.panel-column")).toBeAbsent(),
      inside(
        selector(".panel-dock"),
        expect(Scene.nth(all.role("tab"), 0)).toHaveText("Calvin's Commentaries"),
        expect(Scene.nth(all.role("tab"), 3)).toHaveText("Original language"),
        expect(role("tabpanel")).toContainText(CALVIN_ON_8_28),
      ),
      expect(within(selector(".passage-scroll"), selector(".panel-dock"))).toBeAbsent(),
    )
  })
})

describe("confession pages", () => {
  it("opens an article from the confessions panel, and follows a proof text to its passage", async () => {
    const opened = await boot("/romans/8/28")
    const articleUrl = urlOf("/confessions/wcf/3/6")
    Story.story(
      update,
      Story.given(opened),
      Story.message(Message.ClickedLink({ request: UrlRequest.Internal({ url: articleUrl }) })),
      Story.Command.expectExact(
        NavigateInternal({ url: "https://reader.example/confessions/wcf/3/6" }),
      ),
      Story.Command.resolve(NavigateInternal, Message.CompletedNavigateInternal()),
    )
    const article = await boot("/confessions/wcf/3/6")
    scene(
      app,
      given(article),
      expect(role("heading", { name: "WCF 3.6: Chapter 3, Section 6", level: 1 })).toExist(),
      expect(text(WCF_3_6_TEXT)).toExist(),
      expect(role("link", { name: "Romans 8:28" })).toHaveAttr("href", "/romans/8/28"),
      expect(role("link", { name: "Ephesians 1:4-5" })).toHaveAttr("href", "/ephesians/1/4-5"),
      expect(selector("footer")).toContainText(WCF_ATTRIBUTION),
    )
  })
})
