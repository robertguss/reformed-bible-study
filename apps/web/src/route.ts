import { BOOK_IDS, parseArticleIdentifier } from "@reformed-bible/core"
import { Option, pipe, Result, Schema, SchemaGetter } from "effect"
import { Route } from "foldkit"
import { defineRouteUnion, int, literal, schemaSegment, slash, string } from "foldkit/route"
import { BookSlug } from "./book-slugs.ts"

const Book = Schema.Literals(BOOK_IDS)

const PositiveInt = Schema.Int.check(Schema.isGreaterThanOrEqualTo(1))

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

export const hrefOfRoute = (route: AppRoute): string =>
  AppRoute.match(route, {
    Home: () => homeRouter(),
    Chapter: (chapter) => chapterRouter(chapter),
    Verses: (verses) => versesRouter(verses),
    ConfessionSection: (section) => confessionSectionRouter(section),
    ConfessionQuestion: (question) => confessionQuestionRouter(question),
    NotFound: ({ path }) => path,
  })

export const confessionArticleHref = (confession: string, articleId: string): string => {
  const numbered = /^(?:Q|Art)(\d+)$/.exec(articleId)
  if (numbered !== null)
    return confessionQuestionRouter({ confession, number: Number(numbered[1]) })
  const [part = articleId, section = "1"] = articleId.split(".")
  return confessionSectionRouter({ confession, part, section: Number(section) })
}

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
