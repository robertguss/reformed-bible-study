import { defineContract, implement } from "@reformed-bible/capability"
import { Effect, Schema } from "effect"
import {
  ContentCorrupt,
  ContentNotFound,
  ContentStore,
  ContentUnavailable,
} from "../content-store/index.ts"
import { OriginalWord } from "../content/index.ts"
import { makeEnvelope } from "../envelope/index.ts"
import { InvalidReference } from "../reference/index.ts"
import { shardPaths, WordsShard } from "../shards/index.ts"
import { decodeCursor, nextCursor } from "./cursor.ts"
import { InvalidCursor } from "./errors.ts"
import {
  attributionOf,
  chapterSpans,
  coverageEntry,
  coverageOf,
  envelope,
  hasChapter,
  inSpan,
  ofKind,
  parsePassages,
  passageUrl,
  READ_ONLY,
  readCatalog,
  REFERENCE_GRAMMAR,
  RESULT_SHAPE,
} from "./shared.ts"

const NAME = "get_verse_words"

export const VerseWords = Schema.Struct({
  osis: Schema.String,
  verse: Schema.Int,
  language: Schema.Literals(["grc", "hbo"]),
  words: Schema.Array(OriginalWord),
  /** Notes on textual variants and on where the source numbers this verse differently. */
  notes: Schema.Array(Schema.String),
})
export type VerseWords = typeof VerseWords.Type

export const getVerseWordsContract = defineContract(NAME, {
  description: `Returns the original-language words of a passage, Greek for the New Testament and Hebrew for the Old, one chapter per call with a cursor for the next. Each word has its surface form, transliteration, lemma, classic Strong's number (strongs), STEPBible number (stepStrongs, which get_lexicon_entry accepts), morphology code, English gloss and the editions that contain it. ${REFERENCE_GRAMMAR} ${RESULT_SHAPE}`,
  input: Schema.Struct({
    ref: Schema.String.annotate({ description: "The passage, such as Romans 8:28." }),
    cursor: Schema.optional(
      Schema.String.annotate({ description: "Cursor from a previous page of this request." }),
    ),
  }),
  output: makeEnvelope(VerseWords),
  failure: Schema.Union([
    InvalidReference,
    InvalidCursor,
    ContentNotFound,
    ContentUnavailable,
    ContentCorrupt,
  ]),
  annotations: READ_ONLY,
  http: { method: "GET", path: "/v1/words/:ref" },
})

export const getVerseWords = implement(getVerseWordsContract, (input) =>
  Effect.gen(function* () {
    const store = yield* ContentStore
    const catalog = yield* readCatalog
    const passages = yield* parsePassages(input.ref)
    const spans = chapterSpans(passages)
    const page = yield* decodeCursor(input.cursor, store.release, NAME)
    const span = spans[page]
    if (span === undefined)
      return yield* new InvalidCursor({ cursor: input.cursor ?? "", reason: "malformed" })

    const sources = ofKind(catalog, "original-language")
    // One words file per chapter holds the text of whichever resource the chapter is ingested from.
    const file = sources.some((resource) => hasChapter(resource, span))
      ? (yield* store.read(shardPaths.words(span.book, span.chapter), WordsShard)).payload
      : undefined
    const owner = sources.find((resource) => resource.id === file?.resourceId)
    const items =
      file === undefined || owner === undefined
        ? []
        : file.verses
            .filter(({ verse }) => inSpan(span, verse))
            .map(({ verse, words, notes }) => ({
              value: {
                osis: `${span.book}.${span.chapter}.${verse}`,
                verse,
                language: file.language,
                words,
                notes,
              },
              attribution: attributionOf(owner),
            }))

    return yield* envelope({
      items,
      resources: sources.map((resource) =>
        coverageEntry(
          resource,
          coverageOf(resource, [span], resource === owner && items.length > 0),
        ),
      ),
      canonicalUrl: yield* passageUrl(passages[0]),
      cursor: nextCursor(store.release, NAME, page + 1, spans.length),
    })
  }),
)
