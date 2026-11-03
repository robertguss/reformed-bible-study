import { type BookId, type InvalidReference, parseOsis } from "@reformed-bible/core"
import { Option, Result } from "effect"
import { AppRoute, type VerseSpan } from "./route.ts"

/** The chapter a passage route shows, the verses it focuses on, and any translation override. */
export interface Reading {
  readonly book: BookId
  readonly chapter: number
  readonly selection: Option.Option<VerseSpan>
  readonly t: Option.Option<string>
}

/** `/` opens Romans 1, with no verse highlighted. */
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
    NotFound: () => Option.none(),
  })

/**
 * The OSIS reference the panels follow: the selected verses, or verse 1 of the chapter until the
 * reader selects one.
 */
export const focusOf = ({ book, chapter, selection }: Reading): string =>
  Option.match(selection, {
    onNone: () => `${book}.${chapter}.1`,
    onSome: ({ first, last }) =>
      first === last
        ? `${book}.${chapter}.${first}`
        : `${book}.${chapter}.${first}-${book}.${chapter}.${last}`,
  })

/** Why a reading names no real passage, such as Romans 17, with the nearest passage that exists. */
export const problemOf = (reading: Reading): Option.Option<InvalidReference> =>
  Result.getFailure(parseOsis(focusOf(reading)))

/** A reading the app can show: its route names a passage, and the passage exists. */
export const validReading = (route: AppRoute): Option.Option<Reading> =>
  Option.filter(readingOfRoute(route), (reading) => Option.isNone(problemOf(reading)))
