import { BOOK_IDS } from "@reformed-bible/core"
import { Schema } from "effect"

/** Where the layout lives in the browser's local storage. */
export const LAYOUT_STORAGE_KEY = "reformed-bible:layout"

/**
 * The stored layout's format version. A record with any other version loads the default layout,
 * so a format change bumps this number rather than reading old records as new.
 */
export const LAYOUT_VERSION = 1

/** Where the reader last was: a chapter, and the first verse selected in it, if any. */
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
  kind: Schema.Literals(["confessions", "cross-references", "original-language"]),
})

/** One panel as stored: its stable id, its kind, and for a commentary the work it reads. */
export const StoredPanel = Schema.Union([StoredCommentaryPanel, StoredGatheringPanel])
export type StoredPanel = typeof StoredPanel.Type

/**
 * The record kept on the device. It is plain JSON with stable ids throughout, so optional sync
 * can later carry the same record between devices without migrating it.
 */
export const StoredLayout = Schema.Struct({
  version: Schema.Literal(LAYOUT_VERSION),
  translation: Schema.String,
  panels: Schema.Array(StoredPanel),
  readingPosition: Schema.optionalKey(ReadingPosition),
})
export type StoredLayout = typeof StoredLayout.Type

export const StoredLayoutJson = Schema.fromJsonString(StoredLayout)
