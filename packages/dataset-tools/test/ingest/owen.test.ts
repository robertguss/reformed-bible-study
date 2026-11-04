import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { describe, expect, it } from "@effect/vitest"
import { CommentaryBook, type TextRun } from "@reformed-bible/core"
import { Effect, Layer } from "effect"
import { HttpClient, HttpClientResponse } from "effect/http"
import { sha256Hex } from "../../src/ingest/download.ts"
import { ingestEeboCommentator } from "../../src/ingest/eebo-commentators.ts"
import { OWEN } from "../../src/ingest/eebo-english-expositions.ts"
import { NORMALIZED_DIR, readNormalized } from "../../src/normalized.ts"
import { sourceCachePath } from "../../src/source-cache.ts"

const FIXTURES = join(import.meta.dirname, "../fixtures/owen-sample")

/** Excerpts of Owen's two volumes, in the order the commentator table reads them. */
const EXCERPTS = ["A53696-hebrews-1-and-2-excerpt.xml", "A53678-hebrews-6-and-10-excerpt.xml"]

// Every source is served from the cache, so a request reaching the network fails the test.
const offline = Layer.succeed(
  HttpClient.HttpClient,
  HttpClient.make((request) =>
    Effect.succeed(HttpClientResponse.fromWeb(request, new Response(null, { status: 503 }))),
  ),
)

const plain = (runs: ReadonlyArray<TextRun>): string => runs.map((run) => run.text).join("")

/**
 * Ingests both excerpts through the shared commentator ingest, each with its own volume's layout,
 * and returns what landed in the file it writes.
 */
const ingest = () => {
  const root = mkdtempSync(join(tmpdir(), "owen-"))
  const works = OWEN.works.map((work, volume) => {
    const name = EXCERPTS[volume] as string
    const bytes = readFileSync(join(FIXTURES, name))
    const url = `https://raw.githubusercontent.com/textcreationpartnership/fixture/${name}`
    mkdirSync(dirname(sourceCachePath(root, url)), { recursive: true })
    writeFileSync(sourceCachePath(root, url), bytes)
    return { ...work, source: { url, sha256: sha256Hex(bytes) } }
  })
  return Effect.gen(function* () {
    yield* ingestEeboCommentator(root, { resourceId: OWEN.resourceId, works })
    const files = readdirSync(join(root, NORMALIZED_DIR, OWEN.resourceId))
    const hebrews = yield* readNormalized(root, OWEN.resourceId, "Heb.json", CommentaryBook)
    const sections = hebrews.sections.map((section) => ({
      ref: section.ref,
      paragraphs: section.paragraphs.map(plain),
      notes: section.notes.map(plain),
    }))
    return { files, sections }
  }).pipe(Effect.provide(offline))
}

const read = Effect.map(Effect.suspend(ingest), ({ sections }) => sections)

const section = <S extends { readonly ref: string }>(sections: ReadonlyArray<S>, ref: string) =>
  sections.find((s) => s.ref === ref)

describe("Owen on Hebrews", () => {
  it.effect("writes one Hebrews file holding chapters 1 and 2 and then chapters 6 to 10", () =>
    Effect.gen(function* () {
      const { files, sections } = yield* ingest()
      expect(files).toEqual(["Heb.json"])
      expect(sections.map((s) => s.ref)).toEqual([
        // The first volume, keyed by Owen's headings in Roman figures.
        ...["Heb.1.1-Heb.1.2", "Heb.1.3", "Heb.1.4", "Heb.1.5-Heb.1.13", "Heb.1.14"],
        ...["Heb.2.1", "Heb.2.2-Heb.2.4", "Heb.2.5-Heb.2.18"],
        // The second volume, keyed by its divisions' numbers.
        ...["Heb.6.1-Heb.6.2", "Heb.6.3", "Heb.6.4-Heb.6.6", "Heb.6.7-Heb.6.20"],
        ...["Heb.10.1", "Heb.10.2-Heb.10.39"],
      ])
    }),
  )

  it.effect("leaves out the Exercitations bound before the exposition of chapters 1 and 2", () =>
    Effect.gen(function* () {
      const text = JSON.stringify(yield* read)
      expect(text).not.toContain("Exercitatio")
      expect(text).not.toContain("DISSERTATION")
      expect(text).not.toContain("Penman")
    }),
  )

  it.effect("continues a verse heading's section through the divisions after it", () =>
    Effect.gen(function* () {
      const sections = yield* read
      const verses1and2 = section(sections, "Heb.1.1-Heb.1.2")?.paragraphs ?? []
      expect(verses1and2[0]).toMatch(/^THE General scope and design of the Apostle/)
      expect(verses1and2).toContainEqual(
        expect.stringMatching(/^Vers\. 1, 2\. By sundry parts, and in diverse manners God/),
      )
      expect(verses1and2.some((p) => p.startsWith("AN EXPOSITION"))).toBe(false)
      // The division that names no verse continues verse 3.
      expect(section(sections, "Heb.1.3")?.paragraphs).toContainEqual(
        expect.stringMatching(/^PRoceed we now with our Apostle/),
      )
      // The label in Arabic figures over the quoted text continues Owen's heading on verse 5.
      expect(section(sections, "Heb.1.5-Heb.1.13")?.paragraphs.slice(0, 3)).toEqual([
        "Verse V.",
        expect.stringMatching(/^THe Apostle proceedeth to the confirmation/),
        "Verse 5. Vnto which of the Angels did he at any time (or ever) say, thou art my Son this day have I begotten thee.",
      ])
      expect(section(sections, "Heb.1.14")?.paragraphs[0]).toBe("Verse XIV.")
    }),
  )

  it.effect("keys the notes Owen labels verses 3 to 5 to the verses 2 to 4 they quote", () =>
    Effect.gen(function* () {
      const verses2to4 = section(yield* read, "Heb.2.2-Heb.2.4")?.paragraphs ?? []
      expect(verses2to4[0]).toBe("Verse II, III, IV.")
      expect(verses2to4).toContainEqual(
        expect.stringMatching(/^Verse 4\. How shall we escape \(fly or avoid\) if we neglect/),
      )
      expect(verses2to4).toContainEqual(
        expect.stringMatching(/^Verse 5\. God bearing witness with Signs and Wonders/),
      )
      expect(verses2to4.at(-1)).toMatch(/^The design of the Apostle in these three Verses/)
    }),
  )

  it.effect("keys each exposition to the first verse its division names", () =>
    Effect.gen(function* () {
      const sections = yield* read
      const verses4to6 = section(sections, "Heb.6.4-Heb.6.6")?.paragraphs ?? []
      expect(verses4to6.slice(0, 2)).toEqual(["Verse 4, 5, 6.", "〈 in non-Latin alphabet 〉."])
      expect(verses4to6[2]).toMatch(
        /^〈 in non-Latin alphabet 〉\. Impossibile enim, that is, est, it is impossible, Syr\. 〈 in non-Latin alphabet 〉 But they cannot\./,
      )
      expect(section(sections, "Heb.6.3")).toMatchObject({
        paragraphs: [
          "Verse 3.",
          "〈 in non-Latin alphabet 〉. And this will we do, if so be that God permit.",
          expect.stringMatching(/^These words contain two things\./),
        ],
        notes: ["Ver. 3."],
      })
    }),
  )

  it.effect(
    "opens the chapter's first section with its introduction, leaving out the chapter heading",
    () =>
      Effect.gen(function* () {
        const verses1and2 = section(yield* read, "Heb.6.1-Heb.6.2")?.paragraphs ?? []
        expect(verses1and2[0]).toMatch(/^THis whole Chapter is a continuation of the Digression/)
        expect(verses1and2.slice(3, 5)).toEqual(["Ver. 1.", "〈 in non-Latin alphabet 〉."])
        // The division on verses 1 and 2 opens on the same verse, so it shares the section.
        expect(verses1and2.slice(-2)[0]).toBe("Verse 1, 2.")
        expect(verses1and2.some((p) => p.startsWith("AN EXPOSITION"))).toBe(false)
      }),
  )

  it.effect("keys the introduction to verse 1 when the chapter's first division begins later", () =>
    Effect.gen(function* () {
      const verse1 = section(yield* read, "Heb.10.1")?.paragraphs ?? []
      expect(verse1[0]).toMatch(/^THere are two parts of this Chapter\./)
      expect(verse1).toContain("The first of these is contained in the first verse.")
      expect(verse1.at(-1)).toMatch(
        /^1\. The conjunctive particle 〈 in non-Latin alphabet 〉, For, intimates/,
      )
    }),
  )

  it.effect("leaves out the closing FINIS and duplicate-page marks after the last division", () =>
    Effect.gen(function* () {
      expect(section(yield* read, "Heb.10.2-Heb.10.39")?.paragraphs).toEqual([
        "VERSE II, III.",
        "〈 in non-Latin alphabet 〉",
      ])
    }),
  )
})
