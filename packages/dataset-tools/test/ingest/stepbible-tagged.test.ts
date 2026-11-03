import { readFileSync } from "node:fs"
import { describe, expect, it } from "@effect/vitest"
import { indexLexicon, parseStepLexicon } from "../../src/ingest/stepbible-lexicon.ts"
import { buildHebrewChapters, parseTagnt, parseTahot } from "../../src/ingest/stepbible-tagged.ts"
import { parseTvtms } from "../../src/ingest/tvtms.ts"

const fixture = (name: string) =>
  readFileSync(new URL(`../fixtures/original-language/${name}`, import.meta.url), "utf8")

/** Hebrew words of one source row group, read straight from the fixture without the parser. */
const rawHebrew = (prefix: string): ReadonlyArray<string> =>
  fixture("tahot-excerpt.txt")
    .split("\n")
    .filter((line) => line.startsWith(prefix))
    .map((line) => (line.split("\t")[1] ?? "").replaceAll("/", "").replaceAll("\\", ""))

describe("TAGNT rows", () => {
  const rows = parseTagnt(fixture("tagnt-romans.txt"))

  it("skips comment, summary and repeated header lines", () => {
    const dataLines = fixture("tagnt-romans.txt")
      .split("\n")
      .filter((line) => /^Rom\.\d+\.\d+/.test(line))
    expect(rows).toHaveLength(dataLines.length)
    expect(rows[0]).toMatchObject({ kjv: { book: "Rom", chapter: 8, verse: 28 }, word: 1 })
  })

  it("reads οἴδαμεν in Romans 8:28 with STEPBible's G6063 and its lexicon form", () => {
    expect(rows[0]).toMatchObject({
      greek: "Οἴδαμεν",
      transliteration: "Oidamen",
      tags: [{ dStrong: "G6063", grammar: "V-RAI-1P" }],
      lemma: "εἴδω",
      gloss: "to perceive",
    })
    expect(rows[0]?.editions.map((e) => e.code)).toContain("SBL")
  })

  it("keeps the alternate reference and the Byzantine placement of the doxology", () => {
    const doxology = rows.find((r) => r.kjv.chapter === 16 && r.kjv.verse === 25 && r.word === 1)
    expect(doxology?.other).toEqual({ chapter: 14, verse: 24 })
    expect(doxology?.editions.find((e) => e.code === "Byz")?.movedTo).toEqual({
      chapter: 14,
      verse: 24,
    })
    expect(doxology?.editions.map((e) => e.code)).not.toContain("SBL")
  })

  it("reads a meaning variant that only the SBL text follows", () => {
    const row = rows.find((r) => r.kjv.chapter === 13 && r.kjv.verse === 12 && r.word === 8)
    expect(row?.variants).toEqual([
      {
        greek: "ἀποβαλώμεθα",
        transliteration: "apobalōmetha",
        gloss: "We may throw away",
        tags: [{ dStrong: "G0577", grammar: "V-AMS-1P" }],
        editions: [{ code: "SBL" }],
      },
    ])
  })
})

describe("TAHOT on KJV verse numbers", () => {
  const lexicon = indexLexicon(parseStepLexicon(fixture("tbesh-excerpt.txt")))
  const tvtms = parseTvtms(fixture("tvtms-excerpt.txt"))
  const built = buildHebrewChapters(parseTahot(fixture("tahot-excerpt.txt")), tvtms, lexicon)
  const verse = (book: string, chapter: number, n: number) =>
    built.chapters
      .find((c) => c.book === book && c.chapter === chapter)
      ?.verses.find((v) => v.verse === n)

  it("puts the Hebrew words of Psalm 51:3 in English Psalm 51:1, after the psalm title", () => {
    const v1 = verse("Ps", 51, 1)
    const title = [...rawHebrew("Psa.51.0(51.1)"), ...rawHebrew("Psa.51.0(51.2)")]
    const hebrew3 = rawHebrew("Psa.51.1(51.3)")
    expect(v1?.words.map((w) => w.surface)).toEqual([...title, ...hebrew3])
    expect(v1?.words.map((w) => w.position)).toEqual(
      Array.from({ length: title.length + hebrew3.length }, (_, i) => i + 1),
    )
    expect(v1?.notes).toEqual([
      "Words 1-12 are the psalm title, Psalm 51:1-2 in Hebrew Bibles.",
      "Hebrew Bibles number this verse Psalm 51:3.",
    ])
  })

  it("tags each Hebrew word with classic Strong's, STEPBible's number and the lexicon gloss", () => {
    expect(verse("Ps", 51, 1)?.words[12]).toEqual({
      position: 13,
      surface: rawHebrew("Psa.51.1(51.3)")[0],
      transliteration: "cho.ne.ni",
      lemma: "חָנַן",
      strongs: "H2603",
      stepStrongs: "H2603A",
      morphology: "HVqv2ms/Sp1bs",
      gloss: "be gracious",
      editions: ["Leningrad"],
    })
  })

  it("falls back to TAHOT's own dictionary form and gloss for a root the lexicon lacks", () => {
    expect(verse("Ps", 51, 1)?.words[15]).toMatchObject({
      stepStrongs: "H7230",
      strongs: "H7230",
      lemma: "רֹב",
      gloss: "abundance",
    })
  })

  it("puts Hebrew Malachi 3:19 in English Malachi 4:1 with a numbering note", () => {
    expect(verse("Mal", 4, 1)?.words.map((w) => w.surface)).toEqual(rawHebrew("Mal.4.1(3.19)"))
    expect(verse("Mal", 4, 1)?.notes).toEqual(["Hebrew Bibles number this verse Malachi 3:19."])
    expect(verse("Mal", 3, 18)?.notes).toEqual([])
  })

  it("keeps the restored words of Nehemiah 7:68, a verse Hebrew Bibles leave empty", () => {
    expect(verse("Neh", 7, 68)?.words.map((w) => w.surface)).toEqual(rawHebrew("Neh.7.68(7.67)"))
    expect(verse("Neh", 7, 68)?.words[0]?.editions).toEqual(["Restored"])
    expect(verse("Neh", 7, 68)?.notes).toEqual(["Hebrew Bibles number this verse Nehemiah 7:67."])
    expect(verse("Neh", 7, 69)?.notes).toEqual(["Hebrew Bibles number this verse Nehemiah 7:68."])
  })

  it("reports words whose STEPBible English reference disagrees with the TVTMS mapping", () => {
    const unmapped = buildHebrewChapters(
      parseTahot(fixture("tahot-excerpt.txt")),
      parseTvtms(""),
      lexicon,
    )
    expect(unmapped.problems.some((p) => p.includes("Psalm 51:3"))).toBe(true)
    expect(built.problems).toEqual([])
  })
})
