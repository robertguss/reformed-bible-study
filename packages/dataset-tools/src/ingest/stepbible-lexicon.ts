import { lexiconBucket, UNSAFE_CHARACTERS, type LexiconEntry } from "@reformed-bible/core"
import { normalizeSpace } from "./usfm.ts"

export const LEXICON_RESOURCE_ID = "stepbible-lexicons"

export interface StepLexiconRow {
  readonly eStrong: string
  readonly dStrong: string
  readonly uStrongs: ReadonlyArray<string>
  readonly lemma: string
  readonly transliteration: string
  readonly morph: string
  readonly gloss: string
  readonly meaning: string
}

export type Lexicon = ReadonlyMap<string, StepLexiconRow>

const STRONGS = /^([GH])(\d+)/
const CLASSIC_LIMIT: Readonly<Record<string, number>> = { G: 5624, H: 8674 }
const UNSAFE_GLOBAL = new RegExp(UNSAFE_CHARACTERS.source, "gu")

export const removeUnsafe = (text: string): string => text.replace(UNSAFE_GLOBAL, "")

export const parseStepLexicon = (text: string): ReadonlyArray<StepLexiconRow> =>
  removeUnsafe(text)
    .split(/\r?\n/)
    .flatMap((line) => {
      const [
        eStrong = "",
        dColumn = "",
        uColumn = "",
        lemma = "",
        translit = "",
        morph = "",
        gloss = "",
        meaning = "",
      ] = line.split("\t")
      const dStrong = /^[GH]\d{4}[A-Za-z]?/.exec(dColumn)?.[0]
      if (!/^[GH]\d{4}[A-Za-z]?$/.test(eStrong) || dStrong === undefined) return []
      return [
        {
          eStrong,
          dStrong,
          uStrongs: uColumn.split(/[\s,]+/).filter((u) => STRONGS.test(u)),
          // Greek lemmas use composed accents to match the tagged texts; Hebrew points are left as published.
          lemma: eStrong.startsWith("G") ? lemma.trim().normalize("NFC") : lemma.trim(),
          transliteration: translit.trim(),
          morph: morph.trim(),
          gloss: gloss.trim(),
          meaning,
        },
      ]
    })

export const indexLexicon = (rows: ReadonlyArray<StepLexiconRow>): Lexicon => {
  const index = new Map<string, StepLexiconRow>()
  for (const row of rows) if (!index.has(row.dStrong)) index.set(row.dStrong, row)
  return index
}

const classicOf = (number: string): string | undefined => {
  const match = STRONGS.exec(number)
  if (match?.[1] === undefined) return undefined
  const value = Number(match[2])
  return value >= 1 && value <= (CLASSIC_LIMIT[match[1]] ?? 0) ? `${match[1]}${value}` : undefined
}

export const classicStrongs = (dStrong: string, lexicon: Lexicon): string => {
  const own = classicOf(dStrong)
  if (own !== undefined) return own
  const language = dStrong.charAt(0)
  for (const unified of lexicon.get(dStrong)?.uStrongs ?? []) {
    const classic = unified.startsWith(language) ? classicOf(unified) : undefined
    if (classic !== undefined) return classic
  }
  const match = STRONGS.exec(dStrong)
  return match === null ? dStrong : `${match[1]}${Number(match[2])}`
}

const ENTITIES: Readonly<Record<string, string>> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
}

export const plainDefinition = (html: string): string =>
  removeUnsafe(html)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#\d+|[a-z]+);/gi, (entity, name: string) =>
      name.startsWith("#")
        ? String.fromCodePoint(Number(name.slice(1)))
        : (ENTITIES[name.toLowerCase()] ?? entity),
    )
    .replace(/_{2,}/g, "")
    .split("\n")
    .map(normalizeSpace)
    .filter((line) => line !== "")
    .join("\n")

export const lexiconEntries = (
  rows: ReadonlyArray<StepLexiconRow>,
): ReadonlyArray<LexiconEntry> => {
  const lexicon = indexLexicon(rows)
  return [...lexicon.values()].map((row) => ({
    resourceId: LEXICON_RESOURCE_ID,
    strongs: classicStrongs(row.dStrong, lexicon),
    stepStrongs: row.dStrong,
    lemma: row.lemma,
    transliteration: row.transliteration,
    gloss: row.gloss,
    definition: plainDefinition(row.meaning),
  }))
}

/** The normalized file holding an entry: `G14.json` holds G1400 to G1499, with or without a letter. */
export const lexiconFileName = (stepStrongs: string): string => `${lexiconBucket(stepStrongs)}.json`
