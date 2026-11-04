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
import { buildModule, pericope, section } from "./zcom-module.ts"

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
      [
        {
          text: `${section("Exod.20.2", "x2", "I am the Lord thy God.")}${pericope("Exodus 20:3")}${pericope("Deuteronomy 5:7")}`,
          slots: ["Exod.20.2"],
        },
        {
          text: section("Exod.20.3", "x3", "Thou shalt have no other gods before me."),
          slots: ["Exod.20.3"],
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
      [
        {
          text: `${section("Matt.12.42", "m42", "The queen of the south.")}${pericope("Matthew 13:1-17", "Mark 4:1-12", "Luke 8:1-10")}`,
          slots: ["Matt.12.42"],
        },
        { text: section("Matt.13.2", "m2", "Great multitudes."), slots: ["Matt.13.2"] },
      ],
      // Outside the harmonies, a table in an argument or a back-matter index also cites other books.
      [
        {
          text: `${section("Acts.2.1", "a21", "When the day of Pentecost was fully come.")}${pericope("Judges 7:22", "Luke 24:49")}`,
          slots: ["Acts.2.1"],
        },
        { text: section("Acts.2.2", "a22", "A sound from heaven."), slots: ["Acts.2.2"] },
        {
          text: `${section("Heb.12.5", "h5", "My son, despise not.")}${pericope("Proverbs 3:11-12")}`,
          slots: ["Heb.12.5"],
        },
        { text: section("Heb.12.6", "h6", "Whom the Lord loveth."), slots: ["Heb.12.6"] },
        {
          text: `${section("1Pet.3.9", "p9", "Not rendering evil for evil.")}${pericope("Psalms 34:12-16")}`,
          slots: ["1Pet.3.9"],
        },
        { text: section("1Pet.3.10", "p10", "He that will love life."), slots: ["1Pet.3.10"] },
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
      expect((yield* bookOf("Acts")).map((s) => s.ref)[0]).toBe("Acts.1.1-Acts.1.26")
    }),
  )

  it.effect("names the parallels of a comment in the Harmony of the Gospels", () =>
    Effect.gen(function* () {
      expect((yield* bookOf("Matt")).map((s) => [s.ref, s.parallels])).toEqual([
        ["Matt.12.42-Matt.12.50", undefined],
        ["Matt.13.2-Matt.13.17", ["Mark.4.1-Mark.4.12", "Luke.8.1-Luke.8.10"]],
      ])
    }),
  )

  it.effect("names the parallels of a comment in the Harmony of the Law", () =>
    Effect.gen(function* () {
      expect((yield* bookOf("Exod")).map((s) => [s.ref, s.parallels])).toEqual([
        ["Exod.20.2", undefined],
        ["Exod.20.3", ["Deut.5.7"]],
      ])
    }),
  )

  it.effect("gives no parallels in Hebrews, 1 Peter or Acts, whose tables cite other books", () =>
    Effect.gen(function* () {
      const books = yield* read
      const outside = books.filter((b) => ["Heb", "1Pet", "Acts"].includes(b.book))
      expect(outside.flatMap((b) => b.sections.map((s) => s.ref))).toEqual([
        "Acts.1.1-Acts.1.26",
        "Acts.2.1",
        "Acts.2.2-Acts.2.47",
        "Heb.12.5",
        "Heb.12.6-Heb.12.29",
        "1Pet.3.9",
        "1Pet.3.10-1Pet.3.22",
      ])
      expect(JSON.stringify(outside)).not.toContain("parallels")
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
      // Mark 4, Luke 8 and Deuteronomy 5 hold only parallels, and nothing in Judges, Psalms or
      // Proverbs is ingested though tables outside the harmonies cite them.
      expect(entry?.ingested).toEqual([
        { book: "Gen", chapters: [1] },
        { book: "Exod", chapters: [20] },
        { book: "Deut", chapters: [5] },
        { book: "Isa", chapters: [48] },
        { book: "Ezek", chapters: [20] },
        { book: "Matt", chapters: [12, 13] },
        { book: "Mark", chapters: [4] },
        { book: "Luke", chapters: [8] },
        { book: "Acts", chapters: [1, 2] },
        { book: "Rom", chapters: [8] },
        { book: "Heb", chapters: [12] },
        { book: "1Pet", chapters: [3] },
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
