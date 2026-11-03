import {
  BOOK_IDS,
  type BookId,
  parseArticleIdentifier,
  type Passage,
  verseCount,
} from "@reformed-bible/core"
import { Option, pipe, Result, Schema, SchemaGetter } from "effect"
import { Route } from "foldkit"
import { defineRouteUnion, int, literal, schemaSegment, slash, string } from "foldkit/route"
import { BookSlug } from "./book-slugs.ts"

const Book = Schema.Literals(BOOK_IDS)

const PositiveInt = Schema.Int.check(Schema.isGreaterThanOrEqualTo(1))

/** The verses a URL focuses on within its chapter: one verse, or a range read first to last. */
export const VerseSpan = Schema.Struct({ first: PositiveInt, last: PositiveInt }).check(
  Schema.makeFilter((span) => (span.last >= span.first ? undefined : "must not run backwards")),
)
export type VerseSpan = typeof VerseSpan.Type

const VERSES = /^(\d+)(?:-(\d+))?$/

const VerseSpanSegment = Schema.String.check(Schema.isPattern(VERSES)).pipe(
  Schema.decodeTo(VerseSpan, {
    decode: SchemaGetter.transform((segment: string) => {
      const [, first = "", last = first] = VERSES.exec(segment) ?? []
      return { first: Number(first), last: Number(last) }
    }),
    encode: SchemaGetter.transform(({ first, last }: { first: number; last: number }) =>
      first === last ? `${first}` : `${first}-${last}`,
    ),
  }),
)

/** `t` names a translation for this view only; it never changes the reader's stored choice. */
const TranslationQuery = Schema.Struct({ t: Schema.OptionFromOptionalKey(Schema.String) })

export const AppRoute = defineRouteUnion({
  Home: {},
  Chapter: { book: Book, chapter: Schema.Int, t: Schema.Option(Schema.String) },
  Verses: {
    book: Book,
    chapter: Schema.Int,
    verses: VerseSpan,
    t: Schema.Option(Schema.String),
  },
  ConfessionSection: { confession: Schema.String, part: Schema.String, section: Schema.Int },
  ConfessionQuestion: { confession: Schema.String, number: Schema.Int },
  NotFound: { path: Schema.String },
})
export type AppRoute = typeof AppRoute.Type
export type PassageRoute = typeof AppRoute.Chapter.Type | typeof AppRoute.Verses.Type

export const homeRouter = pipe(Route.root, Route.mapTo(AppRoute.Home))

export const chapterRouter = pipe(
  schemaSegment("book", BookSlug),
  slash(int("chapter")),
  Route.query(TranslationQuery),
  Route.mapTo(AppRoute.Chapter),
)

export const versesRouter = pipe(
  schemaSegment("book", BookSlug),
  slash(int("chapter")),
  slash(schemaSegment("verses", VerseSpanSegment)),
  Route.query(TranslationQuery),
  Route.mapTo(AppRoute.Verses),
)

export const confessionSectionRouter = pipe(
  literal("confessions"),
  slash(string("confession")),
  slash(string("part")),
  slash(int("section")),
  Route.mapTo(AppRoute.ConfessionSection),
)

export const confessionQuestionRouter = pipe(
  literal("confessions"),
  slash(string("confession")),
  slash(int("number")),
  Route.mapTo(AppRoute.ConfessionQuestion),
)

export const urlToAppRoute = Route.parseUrlWithFallback(
  Route.oneOf(
    homeRouter,
    confessionSectionRouter,
    confessionQuestionRouter,
    chapterRouter,
    versesRouter,
  ),
  AppRoute.NotFound,
)

/** The URL of a route, so a route held in the Model can be written back to the address bar. */
export const hrefOfRoute = (route: AppRoute): string =>
  AppRoute.match(route, {
    Home: () => homeRouter(),
    Chapter: (chapter) => chapterRouter(chapter),
    Verses: (verses) => versesRouter(verses),
    ConfessionSection: (section) => confessionSectionRouter(section),
    ConfessionQuestion: (question) => confessionQuestionRouter(question),
    NotFound: ({ path }) => path,
  })

/**
 * Link to a passage within the app, written the way canonical passage URLs are: a whole chapter
 * as `/{book}/{chapter}`, verses within one chapter with their numbers, and a passage crossing
 * chapters at its first verse.
 */
export const passageHref = (passage: Passage, t: Option.Option<string> = Option.none()): string => {
  const { start, end } = passage
  const book: BookId = start.book
  const sameChapter = start.book === end.book && start.chapter === end.chapter
  if (sameChapter && start.verse === 1 && end.verse === verseCount(book, start.chapter))
    return chapterRouter({ book, chapter: start.chapter, t })
  return versesRouter({
    book,
    chapter: start.chapter,
    verses: { first: start.verse, last: sameChapter ? end.verse : start.verse },
    t,
  })
}

/** Link to a confession article by its canonical id: `3.5`, `I.7`, `Q30` or `Art16`. */
export const confessionArticleHref = (confession: string, articleId: string): string => {
  const numbered = /^(?:Q|Art)(\d+)$/.exec(articleId)
  if (numbered !== null)
    return confessionQuestionRouter({ confession, number: Number(numbered[1]) })
  const [part = articleId, section = "1"] = articleId.split(".")
  return confessionSectionRouter({ confession, part, section: Number(section) })
}

/** The canonical article a confession route names, or none when the route cannot name one. */
export const articleOfRoute = (
  route: typeof AppRoute.ConfessionSection.Type | typeof AppRoute.ConfessionQuestion.Type,
): Option.Option<{ readonly confession: string; readonly article: string }> => {
  const citation = AppRoute.guards.ConfessionSection(route)
    ? `${route.confession} ${route.part}.${route.section}`
    : `${route.confession} ${route.number}`
  return pipe(
    parseArticleIdentifier(citation),
    Result.map(({ confession, article }) => ({ confession: confession as string, article })),
    Result.getSuccess,
  )
}
