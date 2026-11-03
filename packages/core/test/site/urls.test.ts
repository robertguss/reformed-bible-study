import { describe, expect, it } from "@effect/vitest"
import { books } from "../../src/reference/index.ts"
import {
  BOOK_SLUGS,
  bookBySlug,
  confessionArticlePath,
  confessionPath,
  passagePath,
  RESERVED_PATHS,
} from "../../src/site/index.ts"

const verse = (book: "Rom" | "1John" | "Song", chapter: number, v: number) => ({
  book,
  chapter,
  verse: v,
})

describe("web URL contract", () => {
  it("writes passage paths as /{book}/{chapter}, a verse, or a verse range", () => {
    expect([
      passagePath({ start: verse("Rom", 8, 28), end: verse("Rom", 8, 28) }),
      passagePath({ start: verse("Rom", 8, 28), end: verse("Rom", 8, 30) }),
      passagePath({ start: verse("Rom", 8, 1), end: verse("Rom", 8, 39) }),
      passagePath({ start: verse("1John", 4, 8), end: verse("1John", 4, 8) }),
      passagePath({ start: verse("Song", 2, 1), end: verse("Song", 2, 1) }),
    ]).toEqual([
      "/romans/8/28",
      "/romans/8/28-30",
      "/romans/8",
      "/1-john/4/8",
      "/song-of-solomon/2/1",
    ])
  })

  it("opens a range that crosses chapters at its first verse", () => {
    expect(passagePath({ start: verse("Rom", 7, 24), end: verse("Rom", 8, 1) })).toBe(
      "/romans/7/24",
    )
  })

  it("writes confession paths by chapter and section, or by question", () => {
    expect([
      confessionArticlePath("wcf", "3.6"),
      confessionArticlePath("wsc", "Q30"),
      confessionArticlePath("wlc", "Q45"),
      confessionPath("wcf"),
    ]).toEqual([
      "/confessions/wcf/3/6",
      "/confessions/wsc/30",
      "/confessions/wlc/45",
      "/confessions/wcf",
    ])
  })

  it("has one unique slug per book that never collides with a reserved path", () => {
    const slugs = books.map((book) => BOOK_SLUGS[book.id])
    expect(new Set(slugs).size).toBe(66)
    for (const slug of slugs) expect(RESERVED_PATHS).not.toContain(slug)
    expect(bookBySlug("romans")?.id).toBe("Rom")
    expect(bookBySlug("psalms")?.id).toBe("Ps")
  })
})
