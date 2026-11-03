import { Schema } from "effect"
import { TextRuns } from "../envelope/index.ts"
import { BOOK_IDS } from "../reference/index.ts"
import { ResourceId } from "../resources/index.ts"

const Book = Schema.Literals(BOOK_IDS)
const PositiveInt = Schema.Int.check(Schema.isGreaterThanOrEqualTo(1))
const OsisRef = Schema.String.check(
  Schema.isPattern(/^[1-3]?[A-Za-z]+\.\d+\.\d+(?:-[1-3]?[A-Za-z]+\.\d+\.\d+)?$/),
)

/** A verse of a translation, or a marker that the translation omits a verse KJV numbering includes. */
export const TranslationVerse = Schema.Union([
  Schema.Struct({ verse: PositiveInt, text: TextRuns }),
  Schema.Struct({ verse: PositiveInt, absent: Schema.Literal(true), note: Schema.String }),
])
export type TranslationVerse = typeof TranslationVerse.Type

/** One chapter of one translation, in KJV verse numbering. */
export const TranslationChapter = Schema.Struct({
  resourceId: ResourceId,
  book: Book,
  chapter: PositiveInt,
  headings: Schema.Array(Schema.Struct({ beforeVerse: PositiveInt, text: Schema.String })),
  verses: Schema.Array(TranslationVerse),
})
export type TranslationChapter = typeof TranslationChapter.Type

/** Cross-references from each verse of one chapter, strongest first. */
export const CrossReferenceChapter = Schema.Struct({
  resourceId: ResourceId,
  book: Book,
  chapter: PositiveInt,
  verses: Schema.Array(
    Schema.Struct({
      verse: PositiveInt,
      targets: Schema.Array(Schema.Struct({ target: OsisRef, votes: Schema.Int })),
    }),
  ),
})
export type CrossReferenceChapter = typeof CrossReferenceChapter.Type

/** One original-language word. `strongs` is the classic number readers expect; `stepStrongs` joins the lexicon. */
export const OriginalWord = Schema.Struct({
  position: PositiveInt,
  surface: Schema.String,
  transliteration: Schema.String,
  lemma: Schema.String,
  strongs: Schema.String,
  stepStrongs: Schema.String,
  morphology: Schema.String,
  gloss: Schema.String,
  /** Editions containing this word, such as SBL, NA28, TR or Byz. */
  editions: Schema.Array(Schema.String),
})
export type OriginalWord = typeof OriginalWord.Type

/** Original-language words of one chapter, in KJV verse numbering, with notes on textual and numbering differences. */
export const OriginalChapter = Schema.Struct({
  resourceId: ResourceId,
  language: Schema.Literals(["grc", "hbo"]),
  book: Book,
  chapter: PositiveInt,
  verses: Schema.Array(
    Schema.Struct({
      verse: PositiveInt,
      words: Schema.Array(OriginalWord),
      notes: Schema.Array(Schema.String),
    }),
  ),
})
export type OriginalChapter = typeof OriginalChapter.Type

export const LexiconEntry = Schema.Struct({
  resourceId: ResourceId,
  strongs: Schema.String,
  stepStrongs: Schema.String,
  lemma: Schema.String,
  transliteration: Schema.String,
  gloss: Schema.String,
  definition: Schema.String,
})
export type LexiconEntry = typeof LexiconEntry.Type

/** One commentary section, keyed by the canonical range the author comments on. */
export const CommentarySection = Schema.Struct({
  ref: OsisRef,
  paragraphs: Schema.Array(TextRuns),
  notes: Schema.Array(TextRuns),
})
export type CommentarySection = typeof CommentarySection.Type

/** One commentary's sections on one book, in canonical order. */
export const CommentaryBook = Schema.Struct({
  resourceId: ResourceId,
  book: Book,
  sections: Schema.Array(CommentarySection),
})
export type CommentaryBook = typeof CommentaryBook.Type

/** References supporting one clause of a confession article; `label` is the print's clause letter when it has one. */
export const ProofText = Schema.Struct({
  label: Schema.optionalKey(Schema.String),
  refs: Schema.Array(OsisRef),
})
export type ProofText = typeof ProofText.Type

/** A confession section or catechism question with its proof texts. */
export const ConfessionArticle = Schema.Struct({
  /** Stable article id within the confession, such as `3.5` or `Q30`. */
  id: Schema.String.check(Schema.isPattern(/^(?:\d+\.\d+|Q\d+|[IVX]+\.\d+|Art\d+)$/)),
  label: Schema.String,
  question: Schema.optionalKey(TextRuns),
  paragraphs: Schema.Array(TextRuns),
  proofs: Schema.Array(ProofText),
})
export type ConfessionArticle = typeof ConfessionArticle.Type

/** A whole confession or catechism, divided into chapters or a single run of questions. */
export const Confession = Schema.Struct({
  resourceId: ResourceId,
  abbreviation: Schema.String,
  title: Schema.String,
  divisions: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      title: Schema.String,
      articles: Schema.Array(ConfessionArticle),
    }),
  ),
})
export type Confession = typeof Confession.Type
