import { type BookId, type InvalidReference, parseOsis } from "@reformed-bible/core"
import { Option, Result } from "effect"
import { AppRoute, type VerseSpan } from "./route.ts"

export interface Reading {
  readonly book: BookId
  readonly chapter: number
  readonly selection: Option.Option<VerseSpan>
  readonly t: Option.Option<string>
}

const HOME_READING: Reading = {
  book: "Rom",
  chapter: 1,
  selection: Option.none(),
  t: Option.none(),
}

export const readingOfRoute = (route: AppRoute): Option.Option<Reading> =>
  AppRoute.match(route, {
    Home: () => Option.some(HOME_READING),
    Chapter: ({ book, chapter, t }) => Option.some({ book, chapter, selection: Option.none(), t }),
    Verses: ({ book, chapter, verses, t }) =>
      Option.some({ book, chapter, selection: Option.some(verses), t }),
    ConfessionSection: () => Option.none(),
    ConfessionQuestion: () => Option.none(),
    ConfessionConclusion: () => Option.none(),
    NotFound: () => Option.none(),
  })

export const focusOf = ({ book, chapter, selection }: Reading): string =>
  Option.match(selection, {
    onNone: () => `${book}.${chapter}.1`,
    onSome: ({ first, last }) =>
      first === last
        ? `${book}.${chapter}.${first}`
        : `${book}.${chapter}.${first}-${book}.${chapter}.${last}`,
  })

export const problemOf = (reading: Reading): Option.Option<InvalidReference> =>
  Result.getFailure(parseOsis(focusOf(reading)))

export const validReading = (route: AppRoute): Option.Option<Reading> =>
  Option.filter(readingOfRoute(route), (reading) => Option.isNone(problemOf(reading)))
