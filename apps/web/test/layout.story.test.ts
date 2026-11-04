import type { CatalogResource } from "@reformed-bible/core"
import { Effect, Layer, Option } from "effect"
import { KeyValueStore } from "effect/persistence"
import { Scene } from "foldkit"
import { describe, expect, it } from "vitest"
import { LAYOUT_STORAGE_KEY, LAYOUT_V1_STORAGE_KEY } from "../src/layout/layout-schema.ts"
import { readSaved, writeSaved } from "../src/layout/storage.ts"
import { Message } from "../src/message.ts"
import { defaultSaved, type Model, type Saved } from "../src/model.ts"
import * as Panel from "../src/panels/panel.ts"
import * as Reader from "../src/reader/index.ts"
import { init, update } from "../src/update.ts"
import { view } from "../src/view.ts"
import { argsOf, settle, urlOf } from "./app.ts"
import { CATALOG, RELEASE, staticHost } from "./fixture.ts"

const { PanelSpec } = Panel

const DEFAULT_PANELS = [
  PanelSpec.DefaultCommentary(),
  PanelSpec.Confessions(),
  PanelSpec.CrossReferences(),
  PanelSpec.OriginalLanguage(),
]

type Step = { readonly model: Model; readonly commands?: ReadonlyArray<unknown> }

/**
 * One browser's local storage, kept across reloads, seeded with text under each given key. Opening
 * a URL reads the stored layout the way the app does at boot; `keep` writes what every pending
 * save Command carries.
 */
const browser = (seeds: Readonly<Record<string, string>> = {}) => {
  const store = Effect.runSync(
    Effect.gen(function* () {
      const kv = yield* KeyValueStore.KeyValueStore
      for (const [key, text] of Object.entries(seeds)) yield* kv.set(key, text)
      return kv
    }).pipe(Effect.provide(KeyValueStore.layerMemory)),
  )
  const layer = Layer.succeed(KeyValueStore.KeyValueStore, store)
  const keep = async (step: Step): Promise<Model> => {
    for (const args of argsOf(step.commands as never, "SaveLayout"))
      await Effect.runPromise(writeSaved(layer, (args as { saved: Saved }).saved))
    return step.model
  }
  const open = async (path: string, host = staticHost()) => {
    const saved = await Effect.runPromise(readSaved(layer))
    const opened = init({ saved }, urlOf(path))
    const saves: Array<unknown> = []
    const model = await settle(opened, host, (command) => saves.push(command))
    await keep({ model, commands: [...(opened.commands ?? []), ...saves] })
    return { opened, model }
  }
  const raw = (key = LAYOUT_STORAGE_KEY) => Effect.runSync(store.get(key))
  return { open, keep, raw }
}

const app = { update, view }
const headings = () => Scene.all.selector("aside.panel-column .panel-header h2")

describe("a rearranged layout", () => {
  it("restores removing cross-references and moving confessions to the top after a reload", async () => {
    const here = browser()
    const { model: opened } = await here.open("/romans/8/28")
    const removed = await here.keep(
      update(opened, Message.ClickedRemovePanel({ panelId: "cross-references" })),
    )
    await here.keep(update(removed, Message.ClickedMovePanelUp({ panelId: "confessions" })))

    const { model: reloaded } = await here.open("/romans/8/28")
    expect(reloaded.saved.panels).toEqual([
      PanelSpec.Confessions(),
      PanelSpec.DefaultCommentary(),
      PanelSpec.OriginalLanguage(),
    ])
    Scene.scene(
      app,
      Scene.given(reloaded),
      Scene.expect(Scene.nth(headings(), 0)).toHaveText("Confessions"),
      Scene.expect(Scene.nth(headings(), 1)).toHaveText("Commentary: John Calvin"),
      Scene.expect(Scene.nth(headings(), 2)).toHaveText("Original language"),
      Scene.expect(Scene.role("region", { name: "Cross-references" })).toBeAbsent(),
    )

    const otherDevice = browser()
    const { model: elsewhere } = await otherDevice.open("/romans/8/28")
    expect(elsewhere.saved.panels).toEqual(DEFAULT_PANELS)
  })

  it("writes a versioned record of panel ids, kinds, resources, translation and position", async () => {
    const here = browser()
    const { model } = await here.open("/romans/8/28")
    await here.keep(update(model, Message.ClickedRemovePanel({ panelId: "original-language" })))
    expect(JSON.parse(here.raw() ?? "null")).toEqual({
      version: 2,
      translation: "bsb",
      panels: [
        { id: "default-commentary", kind: "default-commentary" },
        { id: "confessions", kind: "confessions" },
        { id: "cross-references", kind: "cross-references" },
      ],
      readingPosition: { book: "Rom", chapter: 8, verse: 28 },
    })
  })
})

describe("loading the stored layout", () => {
  it("loads the default arrangement from empty storage", async () => {
    const { model } = await browser().open("/romans/8/28")
    expect(model.saved).toEqual(
      expect.objectContaining({ translation: "bsb", panels: DEFAULT_PANELS }),
    )
  })

  it.each([
    ["corrupt JSON", "{not json"],
    [
      "an unknown panel kind",
      JSON.stringify({ version: 2, translation: "kjv", panels: [{ id: "x", kind: "x" }] }),
    ],
    [
      "an older version",
      JSON.stringify({
        version: 0,
        translation: "kjv",
        panels: [{ id: "confessions", kind: "confessions" }],
      }),
    ],
  ])("loads the default arrangement from %s", async (_, stored) => {
    const { model } = await browser({ [LAYOUT_STORAGE_KEY]: stored }).open("/romans/8/28")
    expect(model.saved.panels).toEqual(DEFAULT_PANELS)
    expect(model.saved.translation).toBe("bsb")
  })

  it("loads the default arrangement when storage cannot be read", async () => {
    const unreadable = Layer.effect(
      KeyValueStore.KeyValueStore,
      Effect.die(new Error("SecurityError: storage is disabled")),
    )
    expect(await Effect.runPromise(readSaved(unreadable))).toEqual(defaultSaved)
  })
})

const CALVIN_V1 = {
  id: "commentary:calvin-commentaries",
  kind: "commentary",
  resourceId: "calvin-commentaries",
}
const CONFESSIONS_V1 = { id: "confessions", kind: "confessions" }
const CROSS_REFERENCES_V1 = { id: "cross-references", kind: "cross-references" }
const ORIGINAL_LANGUAGE_V1 = { id: "original-language", kind: "original-language" }
const HENRY_V1 = { id: "commentary:matthew-henry", kind: "commentary", resourceId: "matthew-henry" }

/** A record as clients before the default commentary panel wrote it, read in the KJV at Romans 8:31. */
const v1Record = (panels: ReadonlyArray<object>) =>
  JSON.stringify({
    version: 1,
    translation: "kjv",
    panels,
    readingPosition: { book: "Rom", chapter: 8, verse: 31 },
  })

const ORIGINAL_DEFAULT_V1 = v1Record([
  CALVIN_V1,
  CONFESSIONS_V1,
  CROSS_REFERENCES_V1,
  ORIGINAL_LANGUAGE_V1,
])
const REORDERED_V1 = v1Record([
  CONFESSIONS_V1,
  CALVIN_V1,
  CROSS_REFERENCES_V1,
  ORIGINAL_LANGUAGE_V1,
])

const CALVIN = PanelSpec.Commentary({ resourceId: "calvin-commentaries" })

describe("a layout saved before the default commentary panel", () => {
  it("opens one still equal to the original default with the default commentary panel, keeping the KJV and the last verse read", async () => {
    const here = browser({ [LAYOUT_V1_STORAGE_KEY]: ORIGINAL_DEFAULT_V1 })
    const { opened, model } = await here.open("/")
    expect(model.saved.panels).toEqual(DEFAULT_PANELS)
    expect(model.saved.translation).toBe("kjv")
    expect(model.saved.readingPosition).toEqual(Option.some({ book: "Rom", chapter: 8, verse: 31 }))
    expect(argsOf(opened.commands, "ReplaceUrl")).toEqual([{ url: "/romans/8/31" }])
    expect(argsOf(opened.commands, "FetchPassage")).toEqual([
      { book: "Rom", chapter: 8, translation: "kjv" },
    ])
    expect(JSON.parse(here.raw() ?? "null")).toEqual({
      version: 2,
      translation: "kjv",
      panels: [
        { id: "default-commentary", kind: "default-commentary" },
        CONFESSIONS_V1,
        CROSS_REFERENCES_V1,
        ORIGINAL_LANGUAGE_V1,
      ],
      readingPosition: { book: "Rom", chapter: 8, verse: 31 },
    })
    expect(here.raw(LAYOUT_V1_STORAGE_KEY)).toBe(ORIGINAL_DEFAULT_V1)
  })

  it.each([
    [
      "reordered",
      REORDERED_V1,
      [PanelSpec.Confessions(), CALVIN, PanelSpec.CrossReferences(), PanelSpec.OriginalLanguage()],
    ],
    [
      "added to",
      v1Record([CALVIN_V1, CONFESSIONS_V1, CROSS_REFERENCES_V1, ORIGINAL_LANGUAGE_V1, HENRY_V1]),
      [
        CALVIN,
        PanelSpec.Confessions(),
        PanelSpec.CrossReferences(),
        PanelSpec.OriginalLanguage(),
        PanelSpec.Commentary({ resourceId: "matthew-henry" }),
      ],
    ],
  ])(
    "keeps one the reader %s in order with Calvin as his own panel, the KJV and the last verse read",
    async (_, stored, panels) => {
      const here = browser({ [LAYOUT_V1_STORAGE_KEY]: stored })
      const { opened, model } = await here.open("/")
      expect(model.saved.panels).toEqual(panels)
      expect(model.saved.translation).toBe("kjv")
      expect(argsOf(opened.commands, "ReplaceUrl")).toEqual([{ url: "/romans/8/31" }])
      expect(JSON.parse(here.raw() ?? "null")).toEqual({
        ...JSON.parse(stored),
        version: 2,
      })
      expect(here.raw(LAYOUT_V1_STORAGE_KEY)).toBe(stored)

      const { model: reloaded } = await here.open("/romans/8/28")
      expect(reloaded.saved.panels).toEqual(panels)
    },
  )

  it("reads a version 2 record in preference to the version 1 record", async () => {
    const here = browser({
      [LAYOUT_STORAGE_KEY]: JSON.stringify({
        version: 2,
        translation: "bsb",
        panels: [CONFESSIONS_V1],
      }),
      [LAYOUT_V1_STORAGE_KEY]: ORIGINAL_DEFAULT_V1,
    })
    const { model } = await here.open("/romans/8/28")
    expect(model.saved.panels).toEqual([PanelSpec.Confessions()])
    expect(model.saved.translation).toBe("bsb")
  })

  it("migrates again from version 1 when the version 2 record cannot be read", async () => {
    const here = browser({
      [LAYOUT_STORAGE_KEY]: "{not json",
      [LAYOUT_V1_STORAGE_KEY]: REORDERED_V1,
    })
    const { model } = await here.open("/")
    expect(model.saved.panels).toEqual([
      PanelSpec.Confessions(),
      CALVIN,
      PanelSpec.CrossReferences(),
      PanelSpec.OriginalLanguage(),
    ])
    expect(model.saved.translation).toBe("kjv")
    expect(JSON.parse(here.raw() ?? "null")).toEqual({ ...JSON.parse(REORDERED_V1), version: 2 })
    expect(here.raw(LAYOUT_V1_STORAGE_KEY)).toBe(REORDERED_V1)
  })

  it("loads the default arrangement from a version 1 record naming a panel version 1 never stored", async () => {
    const { model } = await browser({
      [LAYOUT_V1_STORAGE_KEY]: v1Record([{ id: "default-commentary", kind: "default-commentary" }]),
    }).open("/romans/8/28")
    expect(model.saved.panels).toEqual(DEFAULT_PANELS)
    expect(model.saved.translation).toBe("bsb")
  })
})

const withdrawn = (resource: CatalogResource): CatalogResource => ({
  ...resource,
  status: { state: "withdrawn", reason: "The source retracted its license." },
})

const HENRY: CatalogResource = withdrawn({
  ...(CATALOG.find(({ id }) => id === "calvin-commentaries") as CatalogResource),
  id: "henry-commentary",
  title: "Matthew Henry's Commentary",
})

/** The fixture host, serving a catalog that also lists Henry as withdrawn and the KJV as given. */
const hostWithCatalog = (kjv: (resource: CatalogResource) => CatalogResource) => {
  const resources = [...CATALOG.map((r) => (r.id === "kjv" ? kjv(r) : r)), HENRY]
  const base = staticHost()
  return (request: Request) =>
    new URL(request.url).pathname === `/data/${RELEASE}/catalog.json`
      ? Promise.resolve(new Response(JSON.stringify({ release: RELEASE, payload: { resources } })))
      : base(request)
}

const NOTICE =
  "Removed from your saved layout because they are no longer available: Matthew Henry's Commentary, gone-commentary."

describe("a stored layout naming resources no longer available", () => {
  const stored = JSON.stringify({
    version: 2,
    translation: "bsb",
    panels: [
      { id: "commentary:henry-commentary", kind: "commentary", resourceId: "henry-commentary" },
      { id: "confessions", kind: "confessions" },
      { id: "commentary:gone-commentary", kind: "commentary", resourceId: "gone-commentary" },
      { id: "cross-references", kind: "cross-references" },
    ],
  })

  it("loads without those panels, keeps the rest in order, and says so once", async () => {
    const here = browser({ [LAYOUT_STORAGE_KEY]: stored })
    const host = hostWithCatalog((kjv) => kjv)
    const { model } = await here.open("/romans/8/28", host)
    expect(model.saved.panels).toEqual([PanelSpec.Confessions(), PanelSpec.CrossReferences()])
    Scene.scene(
      app,
      Scene.given(model),
      Scene.expectAll(Scene.all.role("status")).toHaveCount(1),
      Scene.expect(Scene.role("status")).toContainText(NOTICE),
      Scene.click(Scene.role("button", { name: "Dismiss" })),
      Scene.expect(Scene.role("status")).toBeAbsent(),
    )

    const { model: reloaded } = await here.open("/romans/8/28", host)
    expect(reloaded.saved.panels).toEqual([PanelSpec.Confessions(), PanelSpec.CrossReferences()])
    Scene.scene(app, Scene.given(reloaded), Scene.expect(Scene.role("status")).toBeAbsent())
  })

  it("falls back to the default translation when the stored one was withdrawn", async () => {
    const here = browser({
      [LAYOUT_STORAGE_KEY]: JSON.stringify({ version: 2, translation: "kjv", panels: [] }),
    })
    const { model } = await here.open("/romans/8/28", hostWithCatalog(withdrawn))
    expect(model.saved.translation).toBe("bsb")
    Scene.scene(
      app,
      Scene.given(model),
      Scene.expect(Scene.role("status")).toContainText(
        "Removed from your saved layout because they are no longer available: King James Version.",
      ),
    )
  })
})

describe("the reading position", () => {
  it("opens / at the last verse read, then at the last chapter read", async () => {
    const here = browser()
    const { model } = await here.open("/romans/8/28")
    const clicked = update(
      model,
      Message.GotReaderMessage({ message: Reader.Message.ClickedVerse({ verse: 31 }) }),
    )
    expect(argsOf(clicked.commands, "ReplaceUrl")).toEqual([{ url: "/romans/8/31" }])
    // Replacing the URL reports the change back, as the browser does.
    await here.keep(update(clicked.model, Message.ChangedUrl({ url: urlOf("/romans/8/31") })))

    const { opened } = await here.open("/")
    expect(argsOf(opened.commands, "ReplaceUrl")).toEqual([{ url: "/romans/8/31" }])
    expect(argsOf(opened.commands, "FetchPassage")).toEqual([
      { book: "Rom", chapter: 8, translation: "bsb" },
    ])
    expect(
      argsOf(opened.commands, "FetchPanel").map((args) => (args as { focus: string }).focus),
    ).toEqual(Array(4).fill("Rom.8.31"))

    const { model: atVerse } = await here.open("/romans/8/31")
    await here.keep(update(atVerse, Message.ChangedUrl({ url: urlOf("/romans/16") })))
    const { opened: again } = await here.open("/")
    expect(argsOf(again.commands, "ReplaceUrl")).toEqual([{ url: "/romans/16" }])
  })

  it("opens / at Romans 1 with nothing stored", async () => {
    const { opened } = await browser().open("/")
    expect(argsOf(opened.commands, "ReplaceUrl")).toEqual([])
    expect(argsOf(opened.commands, "FetchPassage")).toEqual([
      { book: "Rom", chapter: 1, translation: "bsb" },
    ])
  })
})

describe("the translation choice", () => {
  it("keeps the KJV chosen in the picker after a reload, and ?t=asv does not change it", async () => {
    const here = browser()
    const { model } = await here.open("/romans/8/28")
    await here.keep(update(model, Message.ChangedTranslation({ translation: "kjv" })))

    const { opened: overridden, model: viewing } = await here.open("/romans/8/28?t=asv")
    expect(argsOf(overridden.commands, "FetchPassage")).toEqual([
      { book: "Rom", chapter: 8, translation: "asv" },
    ])
    expect(viewing.saved.translation).toBe("kjv")

    const { opened } = await here.open("/romans/8/28")
    expect(argsOf(opened.commands, "FetchPassage")).toEqual([
      { book: "Rom", chapter: 8, translation: "kjv" },
    ])
    expect(JSON.parse(here.raw() ?? "null")).toMatchObject({ translation: "kjv" })
  })
})

describe("saving", () => {
  it("saves after a layout change and not after a change that leaves it alone", async () => {
    const { model } = await browser().open("/romans/8/28")
    const moved = update(model, Message.ClickedMovePanelDown({ panelId: "confessions" }))
    expect(
      argsOf(moved.commands, "SaveLayout").map((args) => (args as { saved: Saved }).saved.panels),
    ).toEqual([
      [
        PanelSpec.DefaultCommentary(),
        PanelSpec.CrossReferences(),
        PanelSpec.Confessions(),
        PanelSpec.OriginalLanguage(),
      ],
    ])
    const typed = update(model, Message.UpdatedReferenceInput({ value: "Rom 3" }))
    expect(argsOf(typed.commands, "SaveLayout")).toEqual([])
  })
})
