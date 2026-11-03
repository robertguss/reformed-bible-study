import { readFileSync } from "node:fs"
import { describe, expect, it } from "@effect/vitest"
import { ResourceRecord } from "@reformed-bible/core"
import { Schema } from "effect"
import {
  classicStrongs,
  indexLexicon,
  lexiconEntries,
  lexiconFileName,
  parseStepLexicon,
} from "../../src/ingest/stepbible-lexicon.ts"

const fixture = (name: string) =>
  readFileSync(new URL(`../fixtures/original-language/${name}`, import.meta.url), "utf8")

const greek = parseStepLexicon(fixture("tbesg-excerpt.txt"))
const entries = lexiconEntries(greek)

describe("STEPBible lexicons", () => {
  it("returns the entry for G1492 with its gloss under the STEPBible lexicon resource", () => {
    const entry = entries.find((e) => e.stepStrongs === "G1492H")
    expect(entry).toMatchObject({
      resourceId: "stepbible-lexicons",
      strongs: "G1492",
      lemma: "εἴδω",
      transliteration: "eidō",
      gloss: "to perceive: see",
    })
    const record = Schema.decodeUnknownSync(ResourceRecord)(
      JSON.parse(
        readFileSync(
          new URL(
            "../../../../dataset/resources/stepbible-lexicons/resource.json",
            import.meta.url,
          ),
          "utf8",
        ),
      ),
    )
    expect(record.license.spdx).toBe("CC-BY-4.0")
    expect(record.attribution.text).toContain("STEP Bible")
    expect(record.attribution.text).toContain("Tyndale House")
  })

  it("gives STEPBible's G6063 the classic Strong's number G1492", () => {
    const lexicon = indexLexicon(greek)
    expect(classicStrongs("G6063", lexicon)).toBe("G1492")
    expect(classicStrongs("G0025", lexicon)).toBe("G25")
    expect(classicStrongs("G3754G", lexicon)).toBe("G3754")
    expect(entries.find((e) => e.stepStrongs === "G6063")?.strongs).toBe("G1492")
  })

  it("skips the header and the proper-name records", () => {
    expect(greek.map((row) => row.dStrong)).toEqual([
      "G0025",
      "G1492G",
      "G1492H",
      "G1492I",
      "G2458",
      "G3754G",
      "G3754H",
      "G6063",
    ])
  })

  it("turns the lexicon's HTML definitions into plain text", () => {
    const definition = entries.find((e) => e.stepStrongs === "G1492H")?.definition ?? ""
    expect(definition).toContain("to have seen or perceived")
    expect(definition).not.toMatch(/<[a-z/]/i)
    expect(definition).toContain("Mat.25:13")
  })

  it("buckets entries into files by hundreds of the STEPBible number", () => {
    expect(lexiconFileName("G6063")).toBe("G60.json")
    expect(lexiconFileName("G0025")).toBe("G0.json")
    expect(lexiconFileName("H2603A")).toBe("H26.json")
  })
})
