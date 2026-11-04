import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "@effect/vitest"
import { BOOK_IDS, type CommentaryBook, ResourceRecord, type TextRun } from "@reformed-bible/core"
import { Effect, Schema } from "effect"
import { HENRY, JFB, type WholeBibleModule, wholeBibleBooks } from "../../src/ingest/henry-jfb.ts"
import { buildModule, verseSlots } from "./zcom-module.ts"

const sample = (name: string): string =>
  readFileSync(join(import.meta.dirname, "../fixtures/henry-jfb-sample", `${name}.xml`), "utf8")

const plain = (runs: ReadonlyArray<TextRun>): string => runs.map((run) => run.text).join("")

const record = (id: string) =>
  Schema.decodeUnknownSync(ResourceRecord)(
    JSON.parse(
      readFileSync(
        join(import.meta.dirname, `../../../../dataset/resources/${id}/resource.json`),
        "utf8",
      ),
    ),
  )

const archive = (
  work: WholeBibleModule,
  ot: Parameters<typeof buildModule>[1],
  nt: Parameters<typeof buildModule>[1],
) => {
  const files: Record<string, Uint8Array> = {}
  for (const [testament, blocks] of [
    ["ot", ot],
    ["nt", nt],
  ] as const) {
    const built = buildModule(testament, blocks, "zCom4")
    for (const ext of ["bzs", "bzv", "bzz"] as const)
      files[`${work.moduleDir}/${testament}.${ext}`] = new Uint8Array(built[ext])
  }
  return files
}

const sectionsOf = (books: ReadonlyArray<CommentaryBook>, id: string) =>
  books
    .find((b) => b.book === id)
    ?.sections.map((s) => [s.ref, plain(s.paragraphs[0] ?? [])] as const) ?? []

describe("Henry and Jamieson-Fausset-Brown", () => {
  it("pins each module to the file its resource record names", () => {
    for (const work of [HENRY, JFB]) {
      const { id, scope, source } = record(work.resourceId)
      expect(id).toBe(work.resourceId)
      expect(scope).toBeUndefined()
      expect(source.files).toEqual([{ url: work.source.url, sha256: work.source.sha256 }])
    }
  })

  it.effect("reads Henry's every book from both testaments of his module", () =>
    Effect.gen(function* () {
      const books = yield* wholeBibleBooks(
        HENRY,
        archive(
          HENRY,
          [
            [
              { text: sample("mhc/Prov.3"), slots: ["Prov.3"] },
              { text: sample("mhc/Prov.3.1"), slots: verseSlots("Prov", 3, 1, 6) },
              { text: sample("mhc/Prov.3.7"), slots: verseSlots("Prov", 3, 7, 35) },
            ],
          ],
          [
            [
              {
                text: '<div sID="j1" type="x-p"/>Jude, the servant of Jesus Christ.<div eID="j1" type="x-p"/>',
                slots: verseSlots("Jude", 1, 1, 25),
              },
            ],
          ],
        ),
      )
      expect(books.map((b) => b.book)).toEqual(BOOK_IDS)
      expect(books.every((b) => b.resourceId === "matthew-henry")).toBe(true)
      expect(sectionsOf(books, "Prov")).toEqual([
        [
          "Prov.3.1-Prov.3.6",
          expect.stringMatching(/^This chapter is one of the most excellent in all this book/),
        ],
        ["Prov.3.7-Prov.3.35", "Consecration to God."],
      ])
      expect(sectionsOf(books, "Jude")).toEqual([
        ["Jude.1.1-Jude.1.25", "Jude, the servant of Jesus Christ."],
      ])
    }),
  )

  it.effect("leaves out the introduction to a book of one chapter in Jamieson-Fausset-Brown", () =>
    Effect.gen(function* () {
      const books = yield* wholeBibleBooks(
        JFB,
        archive(
          JFB,
          [[{ text: sample("jfb/Exod.1.1"), slots: ["Exod.1.1"] }]],
          [
            [
              { text: sample("jfb/Phlm.1"), slots: ["Phlm.1"] },
              { text: sample("jfb/Phlm.1.1"), slots: ["Phlm.1.1"] },
            ],
          ],
        ),
      )
      expect(books.every((b) => b.resourceId === "jamieson-fausset-brown")).toBe(true)
      expect(sectionsOf(books, "Exod")).toEqual([
        ["Exod.1.1-Exod.1.22", "Ex 1:1-22. Increase of the Israelites."],
      ])
      expect(sectionsOf(books, "Phlm")).toEqual([
        ["Phlm.1.1-Phlm.1.25", expect.stringMatching(/^1\. prisoner of Jesus Christ--/)],
      ])
    }),
  )
})
