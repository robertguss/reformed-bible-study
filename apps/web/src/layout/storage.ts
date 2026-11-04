import { BrowserKeyValueStore } from "@effect/platform-browser"
import { Effect, type Layer, Option, Schema } from "effect"
import { KeyValueStore } from "effect/persistence"
import { Command } from "foldkit"
import { Message } from "../message.ts"
import { defaultSaved, Saved } from "../model.ts"
import { PanelSpec, panelId } from "../panels/panel.ts"
import {
  LAYOUT_STORAGE_KEY,
  LAYOUT_V1_STORAGE_KEY,
  LAYOUT_VERSION,
  type StoredLayout,
  StoredLayoutJson,
  StoredLayoutV1Json,
  type StoredPanel,
  type StoredPanelV1,
  V1_DEFAULT_PANELS,
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

const isV1Default = (panels: ReadonlyArray<StoredPanelV1>): boolean =>
  panels.length === V1_DEFAULT_PANELS.length &&
  panels.every((panel, index) => {
    const expected = V1_DEFAULT_PANELS[index]
    const resourceId = panel.kind === "commentary" ? panel.resourceId : undefined
    return panel.kind === expected?.kind && resourceId === expected.resourceId
  })

/**
 * A layout the reader never changed gets today's default; one they changed keeps its panels, so a
 * Calvin panel they arranged stays Calvin's. Translation and reading position carry over in both.
 */
const fromStoredV1 = (stored: typeof StoredLayoutV1Json.Type): Saved => ({
  translation: stored.translation,
  panels: isV1Default(stored.panels) ? defaultSaved.panels : stored.panels.map(fromStoredPanel),
  readingPosition: Option.fromUndefinedOr(stored.readingPosition),
})

const put = (kv: KeyValueStore.KeyValueStore, saved: Saved) =>
  Effect.flatMap(Schema.encodeEffect(StoredLayoutJson)(toStored(saved)), (text) =>
    kv.set(LAYOUT_STORAGE_KEY, text),
  )

/**
 * Reads the current record, or else migrates the version 1 record and writes the result under the
 * current key. The version 1 record is left in place, and is migrated again whenever the current
 * record is missing or cannot be decoded.
 */
export const readSaved = (store: Store): Effect.Effect<Saved> =>
  Effect.gen(function* () {
    const kv = yield* KeyValueStore.KeyValueStore
    const current = Option.flatMap(
      Option.fromUndefinedOr(yield* kv.get(LAYOUT_STORAGE_KEY)),
      Schema.decodeOption(StoredLayoutJson),
    )
    if (Option.isSome(current)) return fromStored(current.value)
    const old = yield* kv.get(LAYOUT_V1_STORAGE_KEY)
    if (old === undefined) return defaultSaved
    const migrated = fromStoredV1(yield* Schema.decodeEffect(StoredLayoutV1Json)(old))
    yield* Effect.ignoreCause(put(kv, migrated))
    return migrated
  }).pipe(
    // oxlint-disable-next-line effecttsgo/strict-effect-provide
    Effect.provide(store),
    Effect.catchCause(() => Effect.succeed(defaultSaved)),
  )

export const writeSaved = (store: Store, saved: Saved): Effect.Effect<void> =>
  Effect.gen(function* () {
    yield* put(yield* KeyValueStore.KeyValueStore, saved)
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
