import { BOOK_IDS, BOOK_SLUGS, RESERVED_PATHS } from "@reformed-bible/core"
import { Option } from "effect"
import { fromString } from "foldkit/url"
import { describe, expect, it } from "vitest"
import {
  AppRoute,
  chapterRouter,
  confessionQuestionRouter,
  confessionSectionRouter,
  hrefOfRoute,
  urlToAppRoute,
  versesRouter,
} from "../src/route.ts"

const parse = (path: string) =>
  urlToAppRoute(Option.getOrThrow(fromString(`https://reader.example${path}`)))

describe("passage routes", () => {
  it("parses /romans/8/28 to chapter 8 with verse 28 in focus, and prints the same URL", () => {
    const route = parse("/romans/8/28")
    expect(route).toEqual(
      AppRoute.Verses({
        book: "Rom",
        chapter: 8,
        verses: { first: 28, last: 28 },
        t: Option.none(),
      }),
    )
    expect(hrefOfRoute(route)).toBe("/romans/8/28")
  })

  it("keeps the translation query and prints it back", () => {
    const route = parse("/romans/8/28?t=kjv")
    expect(route).toEqual(
      AppRoute.Verses({
        book: "Rom",
        chapter: 8,
        verses: { first: 28, last: 28 },
        t: Option.some("kjv"),
      }),
    )
    expect(hrefOfRoute(route)).toBe("/romans/8/28?t=kjv")
  })

  it("parses a chapter and a verse range and prints them back", () => {
    expect(parse("/romans/8")).toEqual(
      AppRoute.Chapter({ book: "Rom", chapter: 8, t: Option.none() }),
    )
    expect(chapterRouter({ book: "Rom", chapter: 8, t: Option.none() })).toBe("/romans/8")
    expect(parse("/1-john/4/7-8")).toEqual(
      AppRoute.Verses({
        book: "1John",
        chapter: 4,
        verses: { first: 7, last: 8 },
        t: Option.none(),
      }),
    )
    expect(
      versesRouter({
        book: "1John",
        chapter: 4,
        verses: { first: 7, last: 8 },
        t: Option.none(),
      }),
    ).toBe("/1-john/4/7-8")
  })

  it("parses the root path as the home route", () => {
    expect(parse("/")).toEqual(AppRoute.Home())
  })

  it("does not take an unknown book or a backwards range as a passage", () => {
    expect(parse("/romanz/8")).toEqual(AppRoute.NotFound({ path: "/romanz/8" }))
    expect(parse("/romans/8/30-28")).toEqual(AppRoute.NotFound({ path: "/romans/8/30-28" }))
  })
})

describe("confession article routes", () => {
  it("parses a chapter and section and a question, and prints them back", () => {
    const section = parse("/confessions/wcf/3/5")
    expect(section).toEqual(
      AppRoute.ConfessionSection({ confession: "wcf", part: "3", section: 5 }),
    )
    expect(hrefOfRoute(section)).toBe("/confessions/wcf/3/5")
    expect(confessionSectionRouter({ confession: "cd", part: "I", section: 7 })).toBe(
      "/confessions/cd/I/7",
    )
    const question = parse("/confessions/wsc/30")
    expect(question).toEqual(AppRoute.ConfessionQuestion({ confession: "wsc", number: 30 }))
    expect(confessionQuestionRouter({ confession: "wsc", number: 30 })).toBe("/confessions/wsc/30")
  })
})

describe("book slugs", () => {
  const slugs = Object.values(BOOK_SLUGS)

  it("are unique and never equal a reserved top-level path", () => {
    expect(new Set(slugs).size).toBe(66)
    for (const slug of slugs) expect(RESERVED_PATHS).not.toContain(slug)
  })

  it("each open its book's first chapter and print back unchanged", () => {
    for (const book of BOOK_IDS) {
      const slug = BOOK_SLUGS[book]
      const route = parse(`/${slug}/1`)
      expect(route).toEqual(AppRoute.Chapter({ book, chapter: 1, t: Option.none() }))
      expect(hrefOfRoute(route)).toBe(`/${slug}/1`)
    }
  })

  it("leave reserved paths to the site", () => {
    for (const reserved of RESERVED_PATHS)
      expect(parse(`/${reserved}/1`)).toEqual(AppRoute.NotFound({ path: `/${reserved}/1` }))
  })
})
