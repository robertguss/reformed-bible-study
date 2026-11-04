import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { describe, expect, it } from "@effect/vitest"
import { CommentaryBook, type BookId } from "@reformed-bible/core"
import { Effect, Layer } from "effect"
import { HttpClient, HttpClientResponse } from "effect/http"
import { sha256Hex, type SourceSpec } from "../../src/ingest/download.ts"
import {
  ingestEeboCommentator,
  VolumeOverlapError,
  type EeboWork,
} from "../../src/ingest/eebo-commentators.ts"
import { NORMALIZED_DIR, readNormalized } from "../../src/normalized.ts"
import { sourceCachePath } from "../../src/source-cache.ts"

const FIXTURES = join(import.meta.dirname, "../fixtures/eebo-commentators-sample")

// Every source is served from the cache, so a request reaching the network fails the test.
const offline = Layer.succeed(
  HttpClient.HttpClient,
  HttpClient.make((request) =>
    Effect.succeed(HttpClientResponse.fromWeb(request, new Response(null, { status: 503 }))),
  ),
)

/** Places a fixture in the root's source cache and returns the source pinned to it. */
const cachedSource = (root: string, fixture: string): SourceSpec => {
  const bytes = readFileSync(join(FIXTURES, fixture))
  const url = `https://raw.githubusercontent.com/textcreationpartnership/fixture/${fixture}`
  const cached = sourceCachePath(root, url)
  mkdirSync(dirname(cached), { recursive: true })
  writeFileSync(cached, bytes)
  return { url, sha256: sha256Hex(bytes) }
}

const work = (root: string, fixture: string, books: ReadonlyArray<BookId>): EeboWork => ({
  source: cachedSource(root, fixture),
  books,
  layout: { chapterDivisions: new Set(["psalm"]) },
})

const freshRoot = () => mkdtempSync(join(tmpdir(), "eebo-commentators-"))

describe("EEBO-TCP commentator ingest", () => {
  it.effect("merges a book split across two volumes into one file, in volume order", () => {
    const root = freshRoot()
    const resourceId = "test-psalms"
    const works = [
      work(root, "psalms-1-to-50.xml", ["Ps"]),
      work(root, "psalms-51-to-100.xml", ["Ps"]),
    ]
    return Effect.gen(function* () {
      yield* ingestEeboCommentator(root, { resourceId, works })
      expect(readdirSync(join(root, NORMALIZED_DIR, resourceId))).toEqual(["Ps.json"])
      const psalms = yield* readNormalized(root, resourceId, "Ps.json", CommentaryBook)
      expect(psalms.sections.map((section) => section.ref)).toEqual([
        "Ps.1.1",
        "Ps.1.2-Ps.1.6",
        "Ps.50.1",
        "Ps.50.2-Ps.50.23",
        "Ps.51.1",
        "Ps.51.2-Ps.51.19",
        "Ps.100.1",
        "Ps.100.2-Ps.100.5",
      ])
    }).pipe(Effect.provide(offline))
  })

  it.effect("fails, naming the commentator and the chapter, when two volumes hold Psalm 50", () => {
    const root = freshRoot()
    const resourceId = "test-psalms"
    const works = [
      work(root, "psalms-1-to-50.xml", ["Ps"]),
      work(root, "psalms-50-to-51.xml", ["Ps"]),
    ]
    return Effect.gen(function* () {
      const error = yield* Effect.flip(ingestEeboCommentator(root, { resourceId, works }))
      expect(error).toBeInstanceOf(VolumeOverlapError)
      expect(error).toMatchObject({ resourceId, book: "Ps", chapter: 50 })
    }).pipe(Effect.provide(offline))
  })

  it.effect("writes only Jude.json for a commentator whose single work is on Jude", () => {
    const root = freshRoot()
    const resourceId = "test-jude"
    const works = [work(root, "jude.xml", ["Jude"])]
    return Effect.gen(function* () {
      yield* ingestEeboCommentator(root, { resourceId, works })
      expect(readdirSync(join(root, NORMALIZED_DIR, resourceId))).toEqual(["Jude.json"])
      const jude = yield* readNormalized(root, resourceId, "Jude.json", CommentaryBook)
      expect(jude.sections.map((section) => section.ref)).toEqual([
        "Jude.1.1",
        "Jude.1.2-Jude.1.25",
      ])
    }).pipe(Effect.provide(offline))
  })
})
