import { Option } from "effect"
import { Scene, Story } from "foldkit"
import { UrlRequest } from "foldkit/navigation"
import { assert, describe, it } from "vitest"
import { Message } from "../src/message.ts"
import { defaultSaved, type Model } from "../src/model.ts"
import { SaveLayout } from "../src/layout/storage.ts"
import { NavigateInternal, ReplaceUrl } from "../src/navigation.ts"
import { coverageMessage, passageOfFocus } from "../src/panels/context.ts"
import * as Panel from "../src/panels/panel.ts"
import { init, update } from "../src/update.ts"
import { view } from "../src/view.ts"
import { boot, settle, urlOf } from "./app.ts"
import {
  BELGIC_ART_1_TEXT,
  BSB_ATTRIBUTION,
  CALVIN_ATTRIBUTION,
  CATALOG,
  CALVIN_ON_8_28,
  CALVIN_ON_8_31,
  CALVIN_ON_GEN_1_1,
  CALVIN_ON_THE_SOWER,
  HC_Q1_ANSWER,
  HC_Q1_QUESTION,
  HENRY_ATTRIBUTION,
  HENRY_ON_GEN_1_1,
  HENRY_ON_ISA_53_5,
  HENRY_ON_PROV_3_1,
  HENRY_ON_PROV_3_5,
  HENRY_ON_PROV_3_9,
  POOLE_ATTRIBUTION,
  POOLE_ON_PROV_3_5,
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

const CALVIN_PANEL = Panel.PanelSpec.Commentary({ resourceId: "calvin-commentaries" })
const DEFAULT_COMMENTARY = Panel.PanelSpec.DefaultCommentary()
/** The default commentary panel, titled by whose comment it shows. */
const commentaryBy = (creator: string) => panel(`Commentary: ${creator}`)

/** The app opened on a device whose saved arrangement holds these panels. */
const bootWith = (panels: ReadonlyArray<Panel.PanelSpec>, path: string, host = staticHost()) =>
  settle(init({ saved: { ...defaultSaved, panels } }, urlOf(path)), host)

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
        commentaryBy("John Calvin"),
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
      inside(commentaryBy("John Calvin"), expect(text(CALVIN_ON_8_31)).toExist()),
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
  it("says Isaiah 53 is not yet covered in a Calvin panel", async () => {
    scene(
      app,
      given(await bootWith([CALVIN_PANEL], "/isaiah/53")),
      expect(verse(1)).toContainText("Who has believed"),
      inside(
        panel("Calvin's Commentaries"),
        expect(text("Isaiah 53:1 is not yet covered.")).toExist(),
      ),
    )
  })

  it("says Calvin did not write on Revelation rather than that it is not yet covered", async () => {
    scene(
      app,
      given(await bootWith([CALVIN_PANEL], "/revelation/1")),
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
        commentaryBy("John Calvin"),
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

  it("groups the articles citing the verse under each confession that cites it", async () => {
    const confession = (title: string) =>
      Scene.first(
        Scene.filter(all.selector("section.confession"), {
          has: role("heading", { name: title, level: 3 }),
        }),
      )
    scene(
      app,
      given(await boot("/romans/8/28", staticHost({ withHeidelberg: true }))),
      inside(
        panel("Confessions"),
        expect(
          within(
            confession("The Westminster Confession of Faith"),
            role("link", { name: "WCF 3.6" }),
          ),
        ).toHaveAttr("href", "/confessions/wcf/3/6"),
        expect(
          within(confession("The Heidelberg Catechism"), role("link", { name: "HC Q1" })),
        ).toHaveAttr("href", "/confessions/hc/1"),
        expect(within(confession("The Heidelberg Catechism"), text(HC_Q1_QUESTION))).toExist(),
        expect(within(confession("The Heidelberg Catechism"), text(HC_Q1_ANSWER))).toExist(),
        expect(text("Not yet available: The Heidelberg Catechism.")).toBeAbsent(),
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
      expect(within(commentaryBy("John Calvin"), selector("footer"))).toContainText(
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
      ? Panel.cursorOf(firstPage.load.result)
      : Option.none()
    const next = Panel.FetchPanel({
      spec: Panel.PanelSpec.CrossReferences(),
      focus: "Rom.8.28",
      cursor,
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

describe("the default commentary panel", () => {
  it("shows Calvin on Genesis 1, titled with his name, though Henry also holds the chapter", async () => {
    scene(
      app,
      given(await boot("/genesis/1")),
      inside(
        commentaryBy("John Calvin"),
        expect(text(CALVIN_ON_GEN_1_1)).toExist(),
        expect(text(HENRY_ON_GEN_1_1)).toBeAbsent(),
        expect(selector("footer")).toContainText(CALVIN_ATTRIBUTION),
      ),
    )
  })

  it("shows Henry on Proverbs 3:5 when Poole has not shipped", async () => {
    scene(
      app,
      given(await boot("/proverbs/3/5")),
      inside(
        commentaryBy("Matthew Henry"),
        expect(text(HENRY_ON_PROV_3_5)).toExist(),
        expect(selector("footer")).toContainText(HENRY_ATTRIBUTION),
      ),
    )
  })

  it("shows Poole on Proverbs 3:5 once Poole has shipped, ahead of Henry", async () => {
    scene(
      app,
      given(await boot("/proverbs/3/5", staticHost({ withPoole: true }))),
      inside(
        commentaryBy("Matthew Poole"),
        expect(text(POOLE_ON_PROV_3_5)).toExist(),
        expect(text(HENRY_ON_PROV_3_5)).toBeAbsent(),
        expect(selector("footer")).toContainText(POOLE_ATTRIBUTION),
      ),
    )
  })

  it("falls back past Calvin on Isaiah 53, a chapter of his not yet ingested", async () => {
    scene(
      app,
      given(await boot("/isaiah/53/5")),
      inside(commentaryBy("Matthew Henry"), expect(text(HENRY_ON_ISA_53_5)).toExist()),
    )
  })

  it("chooses again on a new chapter, and keeps its choice on a new verse", async () => {
    const genesis = await boot("/genesis/1/1")
    const proverbs = await settle(
      update(genesis, Message.ChangedUrl({ url: urlOf("/proverbs/3/1") })),
    )
    scene(
      app,
      given(proverbs),
      inside(commentaryBy("Matthew Henry"), expect(text(HENRY_ON_PROV_3_1)).toExist()),
      expect(commentaryBy("John Calvin")).toBeAbsent(),
    )
    const verseFive = await settle(
      update(proverbs, Message.ChangedUrl({ url: urlOf("/proverbs/3/5") })),
    )
    scene(
      app,
      given(verseFive),
      inside(commentaryBy("Matthew Henry"), expect(text(HENRY_ON_PROV_3_5)).toExist()),
    )
  })

  it("shows more from the same commentator", async () => {
    const opened = await boot("/proverbs/3/1-12")
    const firstPage = opened.panels.find(({ id }) => id === Panel.panelId(DEFAULT_COMMENTARY))
    const cursor =
      firstPage !== undefined && Panel.LoadState.guards.Loaded(firstPage.load)
        ? Panel.cursorOf(firstPage.load.result)
        : Option.none()
    const next = Panel.FetchPanel({ spec: DEFAULT_COMMENTARY, focus: "Prov.3.1-Prov.3.12", cursor })
    const nextPage = await runCommand(next)
    scene(
      app,
      given(opened),
      inside(commentaryBy("Matthew Henry"), expectAll(all.selector("article")).toHaveCount(3)),
      click(within(commentaryBy("Matthew Henry"), role("button", { name: "Show more" }))),
      Scene.Command.expectExact(next),
      Scene.Command.resolve(next, nextPage),
      inside(
        commentaryBy("Matthew Henry"),
        expectAll(all.selector("article")).toHaveCount(4),
        expect(text(HENRY_ON_PROV_3_9)).toExist(),
        expect(role("button", { name: "Show more" })).toBeAbsent(),
      ),
    )
  })

  it("leaves a Calvin panel beside it saying Proverbs is outside Calvin's work", async () => {
    scene(
      app,
      given(await bootWith([DEFAULT_COMMENTARY, CALVIN_PANEL], "/proverbs/3/5")),
      inside(
        panel("Calvin's Commentaries"),
        expect(text("John Calvin did not write on Proverbs.")).toExist(),
      ),
      inside(commentaryBy("Matthew Henry"), expect(text(HENRY_ON_PROV_3_5)).toExist()),
    )
  })

  it("says the passage is not yet covered when no commentator holds the chapter", async () => {
    scene(
      app,
      given(await boot("/revelation/1")),
      inside(panel("Commentary"), expect(text("Revelation 1:1 is not yet covered.")).toExist()),
    )
  })

  it("offers a retry when the catalog cannot be read, and then shows Calvin", async () => {
    const busy = staticHost({ unavailable: ["catalog.json"] })
    const retry = Panel.FetchPanel({
      spec: DEFAULT_COMMENTARY,
      focus: "Gen.1.1",
      cursor: Option.none(),
    })
    scene(
      app,
      given(await boot("/genesis/1", busy)),
      inside(
        panel("Commentary"),
        expect(role("alert")).toContainText("could not be reached"),
        click(role("button", { name: "Retry" })),
      ),
      Scene.Command.expectExact(retry),
      Scene.Command.resolve(Panel.FetchPanel, await runCommand(retry)),
      inside(commentaryBy("John Calvin"), expect(text(CALVIN_ON_GEN_1_1)).toExist()),
    )
  })

  it("can be added back after a reader removes it", async () => {
    const add = Panel.FetchPanel({
      spec: DEFAULT_COMMENTARY,
      focus: "Rom.8.28",
      cursor: Option.none(),
    })
    scene(
      app,
      given(await boot("/romans/8/28")),
      click(role("button", { name: "Remove Commentary: John Calvin" })),
      Scene.Command.resolve(SaveLayout, Message.CompletedSaveLayout()),
      expect(commentaryBy("John Calvin")).toBeAbsent(),
      Scene.change(Scene.label("Add panel"), Panel.panelId(DEFAULT_COMMENTARY)),
      Scene.Command.expectExact(add, SaveLayout),
      Scene.Command.resolve(SaveLayout, Message.CompletedSaveLayout()),
      Scene.Command.resolve(Panel.FetchPanel, await runCommand(add)),
      inside(commentaryBy("John Calvin"), expect(text(CALVIN_ON_8_28, { exact: false })).toExist()),
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
        panel("Commentary"),
        expect(role("alert")).toContainText("could not be reached"),
        expect(text(/not yet covered|did not write|has no comment/)).toBeAbsent(),
        click(role("button", { name: "Retry" })),
      ),
      Scene.Command.expectExact(
        Panel.FetchPanel({ spec: DEFAULT_COMMENTARY, focus: "Rom.8.28", cursor: Option.none() }),
      ),
      Scene.Command.resolve(
        Panel.FetchPanel,
        await runCommand(
          Panel.FetchPanel({ spec: DEFAULT_COMMENTARY, focus: "Rom.8.28", cursor: Option.none() }),
        ),
      ),
      inside(commentaryBy("John Calvin"), expect(text(CALVIN_ON_8_28, { exact: false })).toExist()),
    )
  })

  it("shows the app page served for a data file as a load error, never as not covered", async () => {
    const stale = staticHost({ servesAppPage: ["commentary/calvin-commentaries/Rom.8.json"] })
    scene(
      app,
      given(await boot("/romans/8/28", stale)),
      inside(
        panel("Commentary"),
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
      click(role("button", { name: "Move Commentary: John Calvin down" })),
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
        expect(Scene.nth(all.role("tab"), 0)).toHaveText("Commentary: John Calvin"),
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

  it("lists the proofs of a whole Belgic article under its text, against no clause", async () => {
    const article = await boot("/confessions/bc/1", staticHost({ withBelgic: true }))
    scene(
      app,
      given(article),
      expect(role("heading", { name: "BC Art. 1: Article 1", level: 1 })).toExist(),
      expect(Scene.nth(all.selector(".confession-article p"), 1)).toHaveText(BELGIC_ART_1_TEXT),
      expect(Scene.nth(all.selector(".confession-article p"), 2)).toHaveText(
        "For the whole article: Ephesians 4:5; Deuteronomy 6:4",
      ),
      expect(
        within(selector(".article-proofs"), role("link", { name: "Ephesians 4:5" })),
      ).toHaveAttr("href", "/ephesians/4/5"),
      expect(selector("ul.proofs")).toBeAbsent(),
    )
  })
})

describe("a harmony comment at a parallel passage", () => {
  it("shows Calvin on Matthew 13 at Mark 4:3 under its own range, linking the passages it also treats", async () => {
    scene(
      app,
      given(await boot("/mark/4/3")),
      inside(
        commentaryBy("John Calvin"),
        expect(role("heading", { name: "Matthew 13:2-8" })).toExist(),
        expect(selector(".parallels")).toHaveText("Also treats Mark 4:1-12; Luke 8:1-10"),
        expect(role("link", { name: "Mark 4:1-12" })).toHaveAttr("href", "/mark/4/1-12"),
        expect(role("link", { name: "Luke 8:1-10" })).toHaveAttr("href", "/luke/8/1-10"),
        expect(text(CALVIN_ON_THE_SOWER)).toExist(),
      ),
    )
  })
})
