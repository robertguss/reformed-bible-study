import { BOOK_IDS } from "@reformed-bible/core"
import { Schema } from "effect"

// A new key, so a tab still running an older client cannot write its version over this one.
export const LAYOUT_STORAGE_KEY = "reformed-bible:layout:v2"

export const LAYOUT_VERSION = 2

export const ReadingPosition = Schema.Struct({
  book: Schema.Literals(BOOK_IDS),
  chapter: Schema.Int,
  verse: Schema.optionalKey(Schema.Int),
})
export type ReadingPosition = typeof ReadingPosition.Type

const StoredCommentaryPanel = Schema.Struct({
  id: Schema.String,
  kind: Schema.Literal("commentary"),
  resourceId: Schema.String,
})

const StoredGatheringPanel = Schema.Struct({
  id: Schema.String,
  kind: Schema.Literals([
    "default-commentary",
    "confessions",
    "cross-references",
    "original-language",
  ]),
})

export const StoredPanel = Schema.Union([StoredCommentaryPanel, StoredGatheringPanel])
export type StoredPanel = typeof StoredPanel.Type

export const StoredLayout = Schema.Struct({
  version: Schema.Literal(LAYOUT_VERSION),
  translation: Schema.String,
  panels: Schema.Array(StoredPanel),
  readingPosition: Schema.optionalKey(ReadingPosition),
})
export type StoredLayout = typeof StoredLayout.Type

export const StoredLayoutJson = Schema.fromJsonString(StoredLayout)

// Version 1, frozen as released clients wrote it, read only to migrate a returning reader. It
// shares nothing with the live schema above, so changing that schema cannot make these records
// undecodable. Do not edit.

export const LAYOUT_V1_STORAGE_KEY = "reformed-bible:layout"

const StoredPanelV1 = Schema.Union([
  Schema.Struct({
    id: Schema.String,
    kind: Schema.Literal("commentary"),
    resourceId: Schema.String,
  }),
  Schema.Struct({
    id: Schema.String,
    kind: Schema.Literals(["confessions", "cross-references", "original-language"]),
  }),
])
export type StoredPanelV1 = typeof StoredPanelV1.Type

export const StoredLayoutV1Json = Schema.fromJsonString(
  Schema.Struct({
    version: Schema.Literal(1),
    translation: Schema.String,
    panels: Schema.Array(StoredPanelV1),
    readingPosition: Schema.optionalKey(
      Schema.Struct({
        book: Schema.Literals(BOOK_IDS),
        chapter: Schema.Int,
        verse: Schema.optionalKey(Schema.Int),
      }),
    ),
  }),
)

/** The panels version 1 clients opened with, compared on kind and resource id. */
export const V1_DEFAULT_PANELS: ReadonlyArray<{
  readonly kind: StoredPanelV1["kind"]
  readonly resourceId?: string
}> = [
  { kind: "commentary", resourceId: "calvin-commentaries" },
  { kind: "confessions" },
  { kind: "cross-references" },
  { kind: "original-language" },
]
