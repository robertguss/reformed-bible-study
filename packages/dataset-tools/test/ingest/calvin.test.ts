import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "@effect/vitest"
import {
  books as allBooks,
  CatalogShard,
  ResourceRecord,
  shardPaths,
  type TextRun,
} from "@reformed-bible/core"
import { Effect, Schema } from "effect"
import { buildRelease } from "../../src/build/release.ts"
import { calvinBooks } from "../../src/ingest/calvin.ts"
import { input } from "../build/fixtures.ts"
import { buildModule, section } from "./zcom-module.ts"

const calvin = Schema.decodeUnknownSync(ResourceRecord)(
  JSON.parse(
    readFileSync(
      join(import.meta.dirname, "../../../../dataset/resources/calvin-commentaries/resource.json"),
      "utf8",
    ),
  ),
)
const scope = calvin.scope ?? []

const plain = (runs: ReadonlyArray<TextRun>): string => runs.map((run) => run.text).join("")

// As in the real module, the first entry of Genesis opens with more than 64 KiB of front matter
// outside any section, so Calvin's section on 1:1 starts past the point where the slot's 16-bit
// size wraps.
const genesis = `Translator's Preface. ${"Several of the Commentaries of Calvin are before the public. ".repeat(1200)}${section("Gen.1.1", "g1", "In the beginning. To expound the term beginning, of Christ, is frivolous.")}`

const MODULE_DIR = "modules/comments/zcom/calvincommentaries"

const moduleFiles = (testament: "ot" | "nt", files: ReturnType<typeof buildModule>) => ({
  [`${MODULE_DIR}/${testament}.bzs`]: new Uint8Array(files.bzs),
  [`${MODULE_DIR}/${testament}.bzv`]: new Uint8Array(files.bzv),
  [`${MODULE_DIR}/${testament}.bzz`]: new Uint8Array(files.bzz),
})

const archive = {
  ...moduleFiles(
    "ot",
    buildModule("ot", [
      [
        { text: genesis, slots: ["Gen.1.1"] },
        { text: section("Gen.1.2", "g2", "And the earth was without form."), slots: ["Gen.1.2"] },
      ],
      [
        {
          text: section("Isa.48.20", "i20", "Go ye forth of Babylon."),
          slots: ["Isa.48.20"],
        },
      ],
      [
        {
          text: section("Ezek.20.44", "e44", "Ye shall know that I am the Lord."),
          slots: ["Ezek.20.44"],
        },
        {
          text: section(
            "Ezek.21.1",
            "e211",
            "As Calvin's Latin Translation ends here, so the version by the Translator comes naturally to a close.",
          ),
          slots: ["Ezek.21.1"],
        },
      ],
    ]),
  ),
  ...moduleFiles(
    "nt",
    buildModule("nt", [
      [
        {
          text: section("Acts.1.1", "a1", "The former treatise have I made."),
          slots: ["Acts.1.1"],
        },
        {
          text: section("Rom.8.28", "r28", "So far are afflictions from hindering."),
          slots: ["Rom.8.28"],
        },
      ],
    ]),
  ),
}

const read = calvinBooks(archive, scope)
const bookOf = (id: string) =>
  read.pipe(Effect.map((books) => books.find((b) => b.book === id)?.sections ?? []))

describe("Calvin's commentaries", () => {
  it.effect("writes one book for each book in Calvin's scope, from both testaments", () =>
    Effect.gen(function* () {
      const books = yield* read
      expect(books.map((b) => b.book)).toEqual(scope)
      expect(books.every((b) => b.resourceId === "calvin-commentaries")).toBe(true)
    }),
  )

  it.effect("gives Genesis 1:1 Calvin's whole section on it", () =>
    Effect.gen(function* () {
      const sections = yield* bookOf("Gen")
      expect(Buffer.byteLength(genesis)).toBeGreaterThan(65536)
      expect(sections.map((s) => [s.ref, s.paragraphs.map(plain)])).toEqual([
        ["Gen.1.1", ["In the beginning. To expound the term beginning, of Christ, is frivolous."]],
        ["Gen.1.2-Gen.1.31", ["And the earth was without form."]],
      ])
    }),
  )

  it.effect(
    "ends Isaiah at 48:22 and Ezekiel at chapter 20, leaving out the translator's note",
    () =>
      Effect.gen(function* () {
        expect((yield* bookOf("Isa")).map((s) => s.ref)).toEqual(["Isa.48.20-Isa.48.22"])
        const ezekiel = yield* bookOf("Ezek")
        expect(ezekiel.map((s) => s.ref)).toEqual(["Ezek.20.44-Ezek.20.49"])
        expect(JSON.stringify(ezekiel)).not.toContain("Translator")
      }),
  )

  it.effect("ingests Acts, which the module's list of books leaves out", () =>
    Effect.gen(function* () {
      expect((yield* bookOf("Acts")).map((s) => s.ref)).toEqual(["Acts.1.1-Acts.1.26"])
    }),
  )

  it.effect("builds a catalog that reports Proverbs as outside Calvin's work", () =>
    Effect.gen(function* () {
      const base = input()
      const release = yield* buildRelease(
        input({
          records: base.records.map((r) => (r.id === calvin.id ? calvin : r)),
          commentaries: yield* read,
        }),
        { date: "2026-11-04" },
      )
      const catalog = yield* Schema.decodeUnknownEffect(CatalogShard)(
        release.files.get(shardPaths.catalog),
      )
      const entry = catalog.payload.resources.find((r) => r.id === calvin.id)
      expect(entry?.scope).toContain("Gen")
      expect(entry?.scope).toContain("Acts")
      expect(entry?.scope).not.toContain("Prov")
      expect(entry?.ingested).toEqual([
        { book: "Gen", chapters: [1] },
        { book: "Isa", chapters: [48] },
        { book: "Ezek", chapters: [20] },
        { book: "Acts", chapters: [1] },
        { book: "Rom", chapters: [8] },
      ])
    }),
  )

  it("credits the translators and edition without naming a single book", () => {
    const credit = [calvin.edition, calvin.attribution.text]
      .join(" ")
      .replaceAll("John Calvin", "Calvin")
    expect(credit).toContain("Calvin Translation Society")
    for (const { name } of allBooks) {
      expect(credit).not.toMatch(new RegExp(`\\b${name}\\b`))
    }
  })
})
