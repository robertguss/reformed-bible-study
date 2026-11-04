import { BOOK_IDS } from "@reformed-bible/core"
import { Schema } from "effect"

export const LAYOUT_STORAGE_KEY = "reformed-bible:layout"

export const LAYOUT_VERSION = 1

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
