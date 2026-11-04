import { BrowserKeyValueStore } from "@effect/platform-browser"
import { Effect, type Layer, Option, Schema } from "effect"
import { KeyValueStore } from "effect/persistence"
import { Command } from "foldkit"
import { Message } from "../message.ts"
import { defaultSaved, Saved } from "../model.ts"
import { PanelSpec, panelId } from "../panels/panel.ts"
import {
  LAYOUT_STORAGE_KEY,
  LAYOUT_VERSION,
  type StoredLayout,
  StoredLayoutJson,
  type StoredPanel,
} from "./layout-schema.ts"

type Store = Layer.Layer<KeyValueStore.KeyValueStore>

const toStoredPanel = (spec: PanelSpec): StoredPanel => {
  const id = panelId(spec)
  return PanelSpec.match<StoredPanel>(spec, {
    Commentary: ({ resourceId }) => ({ id, kind: "commentary", resourceId }),
    DefaultCommentary: () => ({ id, kind: "default-commentary" }),
    Confessions: () => ({ id, kind: "confessions" }),
    CrossReferences: () => ({ id, kind: "cross-references" }),
    OriginalLanguage: () => ({ id, kind: "original-language" }),
  })
}

const fromStoredPanel = (panel: StoredPanel): PanelSpec => {
  switch (panel.kind) {
    case "commentary":
      return PanelSpec.Commentary({ resourceId: panel.resourceId })
    case "default-commentary":
      return PanelSpec.DefaultCommentary()
    case "confessions":
      return PanelSpec.Confessions()
    case "cross-references":
      return PanelSpec.CrossReferences()
    case "original-language":
      return PanelSpec.OriginalLanguage()
  }
}

export const toStored = (saved: Saved): StoredLayout => ({
  version: LAYOUT_VERSION,
  translation: saved.translation,
  panels: saved.panels.map(toStoredPanel),
  ...Option.match(saved.readingPosition, {
    onNone: () => ({}),
    onSome: (readingPosition) => ({ readingPosition }),
  }),
})

const fromStored = (stored: StoredLayout): Saved => ({
  translation: stored.translation,
  panels: stored.panels.map(fromStoredPanel),
  readingPosition: Option.fromUndefinedOr(stored.readingPosition),
})

export const readSaved = (store: Store): Effect.Effect<Saved> =>
  Effect.gen(function* () {
    const kv = yield* KeyValueStore.KeyValueStore
    const text = yield* kv.get(LAYOUT_STORAGE_KEY)
    if (text === undefined) return defaultSaved
    return fromStored(yield* Schema.decodeEffect(StoredLayoutJson)(text))
  }).pipe(
    // oxlint-disable-next-line effecttsgo/strict-effect-provide
    Effect.provide(store),
    Effect.catchCause(() => Effect.succeed(defaultSaved)),
  )

export const writeSaved = (store: Store, saved: Saved): Effect.Effect<void> =>
  Effect.gen(function* () {
    const kv = yield* KeyValueStore.KeyValueStore
    yield* kv.set(LAYOUT_STORAGE_KEY, yield* Schema.encodeEffect(StoredLayoutJson)(toStored(saved)))
  }).pipe(
    // oxlint-disable-next-line effecttsgo/strict-effect-provide
    Effect.provide(store),
    Effect.ignoreCause,
  )

// Storage is opened inside each read and write rather than provided as an app resource: a browser
// that blocks local storage throws on access, and that must not stop the app from starting.
const localStorage: Store = BrowserKeyValueStore.layerLocalStorage

export const SaveLayout = Command.define("SaveLayout", {
  args: { saved: Saved },
  messages: [Message.CompletedSaveLayout],
  execute: ({ saved }) =>
    writeSaved(localStorage, saved).pipe(Effect.as(Message.CompletedSaveLayout())),
})

export const Flags = Schema.Struct({ saved: Saved })
export type Flags = typeof Flags.Type

export const flags: Effect.Effect<Flags> = Effect.map(readSaved(localStorage), (saved) => ({
  saved,
}))
