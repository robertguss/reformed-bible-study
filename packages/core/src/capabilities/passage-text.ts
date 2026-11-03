import { defineContract, implement } from "@reformed-bible/capability"
import { Effect, Schema } from "effect"
import {
  ContentCorrupt,
  ContentNotFound,
  ContentStore,
  ContentUnavailable,
} from "../content-store/index.ts"
import { makeEnvelope, TextRuns } from "../envelope/index.ts"
import { InvalidReference } from "../reference/index.ts"
import { shardPaths, TextShard } from "../shards/index.ts"
import { decodeCursor, nextCursor } from "./cursor.ts"
import { InvalidCursor, UnknownResource } from "./errors.ts"
import {
  attributionOf,
  chapterSpans,
  coverageEntry,
  coverageOf,
  envelope,
  findResource,
  hasChapter,
  inSpan,
  parsePassages,
  passageUrl,
  READ_ONLY,
  readCatalog,
  REFERENCE_GRAMMAR,
  RESULT_SHAPE,
} from "./shared.ts"

const NAME = "get_passage"
const DEFAULT_TRANSLATION = "bsb"

const VerseFields = {
  osis: Schema.String,
  verse: Schema.Int,
  /** Section heading the translation prints before this verse. */
  heading: Schema.optionalKey(Schema.String),
}

/** One verse of a translation, or a marker that the translation omits a verse KJV numbering includes. */
export const PassageVerse = Schema.Union([
  Schema.Struct({ ...VerseFields, text: TextRuns }),
  Schema.Struct({ ...VerseFields, absent: Schema.Literal(true), note: Schema.String }),
])
export type PassageVerse = typeof PassageVerse.Type

export const getPassageContract = defineContract(NAME, {
  description: `Returns the text of a Bible passage in one translation, one chapter per call; a passage spanning chapters returns a cursor for the next chapter. Text comes as runs of plain text with emphasis flags. Where the translation omits a verse that KJV numbering includes (such as Romans 16:24 in the BSB), the item is marked absent with the translation's note. ${REFERENCE_GRAMMAR} ${RESULT_SHAPE}`,
  input: Schema.Struct({
    ref: Schema.String.annotate({ description: "The passage, such as Romans 8:28-30." }),
    translation: Schema.optional(
      Schema.String.annotate({
        description: `Translation id from list_resources, such as bsb, kjv, web or asv. Defaults to ${DEFAULT_TRANSLATION}.`,
      }),
    ),
    cursor: Schema.optional(
      Schema.String.annotate({ description: "Cursor from a previous page of this request." }),
    ),
  }),
  output: makeEnvelope(PassageVerse),
  failure: Schema.Union([
    InvalidReference,
    UnknownResource,
    InvalidCursor,
    ContentNotFound,
    ContentUnavailable,
    ContentCorrupt,
  ]),
  annotations: READ_ONLY,
  http: { method: "GET", path: "/v1/passages/:ref" },
})

export const getPassage = implement(getPassageContract, (input) =>
  Effect.gen(function* () {
    const store = yield* ContentStore
    const catalog = yield* readCatalog
    const translation = yield* findResource(
      catalog,
      input.translation ?? DEFAULT_TRANSLATION,
      "translation",
    )
    const passages = yield* parsePassages(input.ref)
    const spans = chapterSpans(passages)
    const page = yield* decodeCursor(input.cursor, store.release, NAME)
    const span = spans[page]
    if (span === undefined)
      return yield* new InvalidCursor({ cursor: input.cursor ?? "", reason: "malformed" })

    const verses: Array<PassageVerse> = []
    if (hasChapter(translation, span)) {
      const { payload } = yield* store.read(
        shardPaths.text(translation.id, span.book, span.chapter),
        TextShard,
      )
      const headings = new Map(payload.headings.map((h) => [h.beforeVerse, h.text]))
      for (const verse of payload.verses) {
        if (!inSpan(span, verse.verse)) continue
        const heading = headings.get(verse.verse)
        const fields = {
          osis: `${span.book}.${span.chapter}.${verse.verse}`,
          verse: verse.verse,
          ...(heading === undefined ? {} : { heading }),
        }
        verses.push(
          "absent" in verse
            ? { ...fields, absent: true, note: verse.note }
            : { ...fields, text: verse.text },
        )
      }
    }

    const attribution = attributionOf(translation)
    return yield* envelope({
      items: verses.map((value) => ({ value, attribution })),
      resources: [coverageEntry(translation, coverageOf(translation, [span], verses.length > 0))],
      canonicalUrl: yield* passageUrl(passages[0]),
      cursor: nextCursor(store.release, NAME, page + 1, spans.length),
    })
  }),
)
