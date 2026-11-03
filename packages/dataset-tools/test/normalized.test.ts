import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "@effect/vitest"
import { TranslationChapter } from "@reformed-bible/core"
import { Effect, Exit } from "effect"
import { readNormalized, writeNormalized } from "../src/normalized.ts"

const chapter: TranslationChapter = {
  resourceId: "bsb",
  book: "Rom",
  chapter: 16,
  headings: [],
  verses: [
    { verse: 23, text: [{ text: "Gaius, who has hosted me..." }] },
    { verse: 24, absent: true, note: "Not in this translation." },
  ],
}

describe("normalized content", () => {
  it.effect("round-trips a chapter with an absent verse", () =>
    Effect.gen(function* () {
      const root = mkdtempSync(join(tmpdir(), "normalized-"))
      yield* writeNormalized(root, "bsb", "Rom.16.json", TranslationChapter, chapter)
      const read = yield* readNormalized(root, "bsb", "Rom.16.json", TranslationChapter)
      expect(read).toEqual(chapter)
    }),
  )

  it.effect("refuses to write a chapter for a book outside the canon", () =>
    Effect.gen(function* () {
      const root = mkdtempSync(join(tmpdir(), "normalized-"))
      const bad = { ...chapter, book: "Tob" } as unknown as TranslationChapter
      const result = yield* Effect.exit(
        writeNormalized(root, "bsb", "Tob.1.json", TranslationChapter, bad),
      )
      expect(Exit.isFailure(result)).toBe(true)
    }),
  )
})
