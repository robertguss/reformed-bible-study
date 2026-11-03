import { readFileSync } from "node:fs"
import { describe, expect, it } from "@effect/vitest"
import { buildGreekChapters, parseSblgnt } from "../../src/ingest/sblgnt.ts"
import { indexLexicon, parseStepLexicon } from "../../src/ingest/stepbible-lexicon.ts"
import { parseTagnt } from "../../src/ingest/stepbible-tagged.ts"

const fixture = (name: string) =>
  readFileSync(new URL(`../fixtures/original-language/${name}`, import.meta.url), "utf8")

const sblText = fixture("sblgnt-romans.txt")
const lexicon = indexLexicon(parseStepLexicon(fixture("tbesg-excerpt.txt")))
const built = buildGreekChapters(
  parseSblgnt("Rom", sblText),
  parseTagnt(fixture("tagnt-romans.txt")),
  lexicon,
)
const verse = (chapter: number, n: number) =>
  built.chapters.find((c) => c.chapter === chapter)?.verses.find((v) => v.verse === n)

// The SBLGNT marks variation units with these signs; they are not part of the words.
const SIGLA = new RegExp(`[${String.fromCodePoint(0x2e00)}-${String.fromCodePoint(0x2e0f)}]`, "gu")
const LETTER = /\p{L}/u
const NOT_IN_SBL =
  "This verse is not in the SBL Greek New Testament. The words shown come from other Greek editions, as listed on each word."

describe("SBLGNT words aligned to TAGNT tags", () => {
  it("shows the SBLGNT text of every verse word for word", () => {
    for (const line of sblText.split("\n")) {
      const match = /^Rom (\d+):(\d+)\t(.*)$/.exec(line)
      if (match === null) continue
      const expected = (match[3] ?? "")
        .replace(SIGLA, "")
        .split(/\s+/)
        .filter((token) => LETTER.test(token))
      expect(verse(Number(match[1]), Number(match[2]))?.words.map((w) => w.surface)).toEqual(
        expected,
      )
    }
    expect(built.untagged).toEqual([])
  })

  it("tags οἴδαμεν in Romans 8:28 with classic G1492 and STEPBible's G6063", () => {
    expect(verse(8, 28)?.words[0]).toEqual({
      position: 1,
      surface: "Οἴδαμεν",
      transliteration: "Oidamen",
      lemma: "εἴδω",
      strongs: "G1492",
      stepStrongs: "G6063",
      morphology: "V-RAI-1P",
      gloss: "to perceive",
      editions: ["NA28", "NA27", "Tyn", "SBL", "WH", "Treg", "TR", "Byz"],
    })
  })

  it("shows the SBL spelling where NA28 spells a word differently", () => {
    const words = verse(16, 6)?.words.map((w) => w.surface) ?? []
    expect(words).toContain("Μαριάμ,")
    expect(words.some((w) => w.startsWith("Μαρίαν"))).toBe(false)
    expect(verse(16, 6)?.words.find((w) => w.surface === "Μαριάμ,")?.transliteration).toBe("Mariam")
  })

  it("tags a word the SBL text takes from a meaning variant", () => {
    expect(verse(13, 12)?.words.find((w) => w.surface === "ἀποβαλώμεθα")).toMatchObject({
      strongs: "G577",
      stepStrongs: "G0577",
      morphology: "V-AMS-1P",
      editions: ["SBL"],
    })
  })

  it("notes where the Textus Receptus behind the KJV differs from the SBL text", () => {
    expect(verse(13, 12)?.notes).toEqual([
      "The Textus Receptus behind the KJV differs here. Not in it: ἀποβαλώμεθα δὲ. Only in it: ἀποθώμεθα καὶ.",
    ])
    expect(verse(16, 21)?.notes).toEqual([
      "The Textus Receptus behind the KJV differs here. Not in it: Ἀσπάζεται. Only in it: Ἀσπάζονται.",
    ])
    expect(verse(8, 28)?.notes).toEqual([])
  })

  it("flags Romans 16:24 as in the SBL text and the Textus Receptus but not NA28", () => {
    const v24 = verse(16, 24)
    expect(v24?.words).toHaveLength(11)
    for (const word of v24?.words ?? []) {
      expect(word.editions).toEqual(expect.arrayContaining(["SBL", "TR", "Byz"]))
      expect(word.editions).not.toContain("NA28")
    }
    expect(v24?.notes).toEqual([])
  })

  it("maps the doxology the Byzantine text places at 14:24 to Romans 16:25, noting both", () => {
    const v25 = verse(16, 25)
    expect(v25?.words[0]).toMatchObject({ surface: "Τῷ", strongs: "G3588" })
    for (const word of v25?.words ?? []) expect(word.editions).not.toContain("SBL")
    expect(v25?.notes).toEqual([
      NOT_IN_SBL,
      "In the Byzantine text these words stand at Romans 14:24.",
    ])
    expect(verse(14, 23)?.words.at(-1)?.surface).toBe("ἐστίν.")
  })
})
