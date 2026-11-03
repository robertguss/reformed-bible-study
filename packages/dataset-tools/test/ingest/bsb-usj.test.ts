import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import { parseUsj } from "../../src/ingest/bsb-usj.ts"

const fixture = (name: string) =>
  readFileSync(join(import.meta.dirname, "../fixtures/bible-text", name), "utf8")

const verseText =
  (verses: ReadonlyArray<{ chapter: number; verse: number; text: string }>) =>
  (chapter: number, verse: number) =>
    verses.find((v) => v.chapter === chapter && v.verse === verse)?.text

describe("BSB USJ parser", () => {
  it.effect("reads Romans 8:28 as the publisher prints it", () =>
    Effect.gen(function* () {
      const book = yield* parseUsj(fixture("bsb-ROM-excerpt.usj"))
      expect(book.code).toBe("ROM")
      expect(verseText(book.verses)(8, 28)).toBe(
        "And we know that God works all things together for the good of those who love Him, who are called according to His purpose.",
      )
    }),
  )

  it.effect("keeps section headings and leaves parallel-passage lines out of the text", () =>
    Effect.gen(function* () {
      const book = yield* parseUsj(fixture("bsb-ROM-excerpt.usj"))
      expect(book.headings).toContainEqual({
        chapter: 8,
        beforeVerse: 28,
        text: "God Works in All Things",
      })
      expect(verseText(book.verses)(8, 27)).toBe(
        "And He who searches our hearts knows the mind of the Spirit, because the Spirit intercedes for the saints according to the will of God.",
      )
    }),
  )

  it.effect("keeps a numbered psalm title in verse 1 and drops footnotes", () =>
    Effect.gen(function* () {
      const book = yield* parseUsj(fixture("bsb-PSA-3.usj"))
      const text = verseText(book.verses)
      expect(text(3, 1)).toBe(
        "A Psalm of David, when he fled from his son Absalom. O LORD, how my foes have increased! How many rise up against me!",
      )
      expect(text(3, 2)).toBe("Many say of me, “God will not deliver him.” Selah")
    }),
  )
})
