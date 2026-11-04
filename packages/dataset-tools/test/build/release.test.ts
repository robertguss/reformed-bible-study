import { describe, expect, it } from "@effect/vitest"
import {
  CatalogShard,
  CommentaryShard,
  ConfessionIndexShard,
  shardPaths,
  shardSchemaFor,
} from "@reformed-bible/core"
import { Effect, Schema } from "effect"
import { buildRelease, ReleaseBuildError, releaseLock } from "../../src/build/release.ts"
import { input, record } from "./fixtures.ts"

const build = (overrides = {}, options = {}) =>
  buildRelease(input(overrides), { date: "2026-11-03", ...options })

const decoded = <A>(schema: Schema.Codec<A, unknown>, value: unknown): A =>
  Schema.decodeUnknownSync(schema)(value)

describe("release builder", () => {
  it.effect("writes the 8:28-30 section exactly once in the Romans 8 commentary file", () =>
    Effect.gen(function* () {
      const release = yield* build()
      const file = decoded(
        CommentaryShard,
        release.files.get(shardPaths.commentary("calvin-commentaries", "Rom", 8)),
      )
      expect(file.payload.sections.map((s) => s.ref)).toEqual([
        "Rom.7.24-Rom.8.1",
        "Rom.8.28-Rom.8.30",
      ])
    }),
  )

  describe("a harmony comment with parallels", () => {
    const text = (words: string) => ({ paragraphs: [[{ text: words }]], notes: [] })
    const harmony = (ref: string, parallels: ReadonlyArray<string>, words: string) => ({
      ref,
      parallels,
      ...text(words),
    })
    const commentaries = [
      {
        resourceId: "calvin-commentaries",
        book: "Matt" as const,
        sections: [
          harmony(
            "Matt.13.2-Matt.13.8",
            ["Mark.4.1-Mark.4.12", "Luke.8.1-Luke.8.10", "Luke.8.18"],
            "Great multitudes",
          ),
        ],
      },
      {
        resourceId: "calvin-commentaries",
        book: "Mark" as const,
        sections: [
          harmony("Mark.4.12", ["Matt.13.1-Matt.13.17"], "That seeing they may see"),
          { ref: "Mark.4.26-Mark.4.29", ...text("So is the kingdom of God") },
        ],
      },
    ]
    const shard = (
      release: { readonly files: ReadonlyMap<string, unknown> },
      book: string,
      chapter: number,
    ) =>
      decoded(
        CommentaryShard,
        release.files.get(shardPaths.commentary("calvin-commentaries", book as "Mark", chapter)),
      ).payload.sections.map((s) => s.ref)

    it.effect(
      "files it in each parallel's chapter too, once, among that chapter's own sections in canonical order",
      () =>
        Effect.gen(function* () {
          const release = yield* build({ commentaries })
          expect(shard(release, "Matt", 13)).toEqual(["Matt.13.2-Matt.13.8", "Mark.4.12"])
          expect(shard(release, "Mark", 4)).toEqual([
            "Matt.13.2-Matt.13.8",
            "Mark.4.12",
            "Mark.4.26-Mark.4.29",
          ])
          expect(shard(release, "Luke", 8)).toEqual(["Matt.13.2-Matt.13.8"])
          const mark = decoded(
            CommentaryShard,
            release.files.get(shardPaths.commentary("calvin-commentaries", "Mark", 4)),
          )
          expect(mark.payload.sections[0]?.parallels).toEqual([
            "Mark.4.1-Mark.4.12",
            "Luke.8.1-Luke.8.10",
            "Luke.8.18",
          ])
          // A section without parallels is written without the field.
          expect(JSON.stringify(mark.payload.sections[2])).not.toContain("parallels")
        }),
    )

    it.effect("lists the parallels' chapters as ingested for the commentary", () =>
      Effect.gen(function* () {
        const release = yield* build({ commentaries })
        const catalog = decoded(CatalogShard, release.files.get(shardPaths.catalog))
        expect(
          catalog.payload.resources.find((r) => r.id === "calvin-commentaries")?.ingested,
        ).toEqual([
          { book: "Matt", chapters: [13] },
          { book: "Mark", chapters: [4] },
          { book: "Luke", chapters: [8] },
        ])
      }),
    )
  })

  it.effect("indexes every Westminster article citing a verse in Romans 8", () =>
    Effect.gen(function* () {
      const release = yield* build()
      const index = decoded(
        ConfessionIndexShard,
        release.files.get(shardPaths.confessionIndex("Rom", 8)),
      )
      const cited = (verse: number) =>
        index.payload.verses.find((v) => v.verse === verse)?.citations.map((c) => c.articleId) ?? []
      expect(cited(28)).toEqual(["3.6", "5.7"])
      expect(cited(29)).toEqual(["3.6"])
      expect(cited(30)).toEqual(["3.6"])
      expect(cited(31)).toEqual([])
    }),
  )

  it.effect(
    "keeps a proof marked as supporting the whole article, and leaves Westminster's file unmarked",
    () =>
      Effect.gen(function* () {
        const base = input()
        const belgic = {
          resourceId: "bc",
          abbreviation: "BC",
          title: "The Belgic Confession",
          divisions: [
            {
              id: "1",
              title: "There Is One Only God",
              articles: [
                {
                  id: "Art1",
                  label: "Article 1",
                  paragraphs: [[{ text: "We all believe with the heart" }]],
                  proofs: [{ wholeArticle: true, refs: ["Eph.4.5", "Deut.6.4"] }],
                },
              ],
            },
          ],
        } as const
        const release = yield* build({
          records: [...base.records, record({ id: "bc", kind: "confession" })],
          confessions: [...base.confessions, belgic],
        })
        const payload = (id: string) =>
          (release.files.get(shardPaths.confession(id)) as { payload: unknown }).payload
        expect(JSON.stringify(payload("bc"))).toBe(JSON.stringify(belgic))
        expect(JSON.stringify(payload("wcf"))).toBe(JSON.stringify(base.confessions[0]))
        expect(JSON.stringify(payload("wcf"))).not.toContain("wholeArticle")
      }),
  )

  it.effect("records Calvin covering Romans only, with his scope as the books he wrote on", () =>
    Effect.gen(function* () {
      const release = yield* build()
      const catalog = decoded(CatalogShard, release.files.get(shardPaths.catalog))
      const calvin = catalog.payload.resources.find((r) => r.id === "calvin-commentaries")
      expect(calvin?.scope).toEqual(["Gen", "Rom", "Gal"])
      expect(calvin?.ingested).toEqual([{ book: "Rom", chapters: [7, 8, 9] }])
    }),
  )

  it.effect(
    "leaves a withdrawn resource out of the files but keeps it in the catalog with its reason",
    () =>
      Effect.gen(function* () {
        const base = input()
        const records = base.records.map((r) =>
          r.id === "calvin-commentaries"
            ? {
                ...r,
                status: { state: "withdrawn" as const, reason: "License evidence retracted" },
              }
            : r,
        )
        const release = yield* build({ records })
        expect([...release.files.keys()].some((path) => path.startsWith("commentary/"))).toBe(false)
        expect(
          [...release.archive.keys()].some((path) => path.includes("calvin-commentaries/")),
        ).toBe(false)
        const catalog = decoded(CatalogShard, release.files.get(shardPaths.catalog))
        expect(
          catalog.payload.resources.find((r) => r.id === "calvin-commentaries")?.status,
        ).toEqual({
          state: "withdrawn",
          reason: "License evidence retracted",
        })
      }),
  )

  it.effect("fails a build over the file budget and reports the count", () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(build({}, { maxFiles: 3 }))
      expect(error).toBeInstanceOf(ReleaseBuildError)
      expect(error.message).toMatch(/\d+ files exceeds the budget of 3/)
    }),
  )

  it.effect("leaves a resource whose surfaces exclude the dataset out of the archive", () =>
    Effect.gen(function* () {
      const base = input()
      const records = base.records.map((r) =>
        r.id === "openbible-xrefs" ? { ...r, surfaces: ["web", "api", "mcp"] as const } : r,
      )
      const release = yield* build({
        records: records.map((r) => ({ ...r, surfaces: [...r.surfaces] })),
      })
      expect([...release.archive.keys()].some((path) => path.includes("openbible-xrefs"))).toBe(
        false,
      )
    }),
  )

  it.effect("leaves a resource whose surfaces exclude the web out of the static files", () =>
    Effect.gen(function* () {
      const base = input()
      const records = base.records.map((r) =>
        r.id === "bsb"
          ? { ...r, surfaces: ["api", "mcp", "dataset"] as Array<"api" | "mcp" | "dataset"> }
          : r,
      )
      const release = yield* build({ records })
      expect([...release.files.keys()].some((path) => path.startsWith("text/bsb/"))).toBe(false)
    }),
  )

  it.effect("stamps the release id on every file and every file decodes against its schema", () =>
    Effect.gen(function* () {
      const release = yield* build()
      expect(release.files.size).toBeGreaterThan(0)
      for (const [path, value] of release.files) {
        const shard = decoded(
          shardSchemaFor(path) as Schema.Codec<{ readonly release: string }, unknown>,
          value,
        )
        expect(shard.release).toBe(release.release)
      }
    }),
  )

  it.effect("names the release id and archive hash in the release lock", () =>
    Effect.gen(function* () {
      const release = yield* build()
      const lock = releaseLock(release)
      expect(lock.release).toBe(release.release)
      expect(lock.archiveSha256).toMatch(/^[0-9a-f]{64}$/)
      expect(lock.archive).toBe(`dataset-${release.release}.zip`)
    }),
  )

  it.effect("applies a correction overlay to a translation verse", () =>
    Effect.gen(function* () {
      const release = yield* build({
        corrections: [
          {
            resourceId: "bsb",
            ref: "Rom.8.29",
            find: "foreknew",
            replace: "foreknew,",
            reason: "Restore comma",
          },
        ],
      })
      const text = release.files.get(shardPaths.text("bsb", "Rom", 8)) as {
        payload: { verses: Array<{ verse: number; text: Array<{ text: string }> }> }
      }
      expect(text.payload.verses.find((v) => v.verse === 29)?.text[0]?.text).toBe(
        "For those God foreknew,",
      )
    }),
  )

  it.effect("fails when a correction no longer matches its text", () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(
        build({
          corrections: [
            {
              resourceId: "bsb",
              ref: "Rom.8.29",
              find: "not present",
              replace: "x",
              reason: "stale",
            },
          ],
        }),
      )
      expect(error.message).toMatch(/not present/)
    }),
  )

  it.effect("applies a commentary correction to the section that holds the verse", () =>
    Effect.gen(function* () {
      const release = yield* build({
        corrections: [
          {
            resourceId: "calvin-commentaries",
            ref: "Rom.8.29",
            find: "afflictions",
            replace: "trials",
            reason: "Modernize",
          },
        ],
      })
      const file = decoded(
        CommentaryShard,
        release.files.get(shardPaths.commentary("calvin-commentaries", "Rom", 8)),
      )
      const section = file.payload.sections.find((s) => s.ref === "Rom.8.28-Rom.8.30")
      expect(section?.paragraphs[0]?.[0]?.text).toBe("So far are trials from hindering")
    }),
  )

  it.effect("fails a commentary correction whose verse no section holds", () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(
        build({
          corrections: [
            {
              resourceId: "calvin-commentaries",
              ref: "Rom.8.2",
              find: "afflictions",
              replace: "trials",
              reason: "Wrong verse",
            },
          ],
        }),
      )
      expect(error.message).toMatch(/afflictions/)
    }),
  )

  it.effect("changes the release id when only a license file changes", () =>
    Effect.gen(function* () {
      const license = (text: string) =>
        new Map([["LICENSES/CC-BY-4.0.txt", new TextEncoder().encode(text)]])
      const a = yield* build({ licenseFiles: license("first") })
      const b = yield* build({ licenseFiles: license("second") })
      expect(a.release).not.toBe(b.release)
    }),
  )

  it.effect("builds the same archive bytes in every timezone", () =>
    Effect.gen(function* () {
      const original = process.env["TZ"]
      try {
        process.env["TZ"] = "UTC"
        const utc = yield* build()
        process.env["TZ"] = "Asia/Tokyo"
        const tokyo = yield* build()
        process.env["TZ"] = "America/New_York"
        const newYork = yield* build()
        expect(tokyo.archiveSha256).toBe(utc.archiveSha256)
        expect(newYork.archiveSha256).toBe(utc.archiveSha256)
      } finally {
        if (original === undefined) delete process.env["TZ"]
        else process.env["TZ"] = original
      }
    }),
  )

  it.effect("produces the same release id for the same content", () =>
    Effect.gen(function* () {
      const a = yield* build()
      const b = yield* build()
      expect(a.release).toBe(b.release)
      expect(a.release).toMatch(/^2026-11-03-[0-9a-f]{8}$/)
      const c = yield* build({
        records: [...input().records, record({ id: "extra", kind: "lexicon" })],
      })
      expect(c.release).not.toBe(a.release)
    }),
  )
})
