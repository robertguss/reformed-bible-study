import { UNSAFE_CHARACTERS, type LexiconEntry } from "@reformed-bible/core"

export const LEXICON_RESOURCE_ID = "stepbible-lexicons"

/** One row of STEPBible's TBESG (abridged Abbott-Smith) or TBESH (abridged BDB) lexicon. */
export interface StepLexiconRow {
  /** Extended Strong's number, such as `G1492` or `H2603a`. */
  readonly eStrong: string
  /** STEPBible's disambiguated number, such as `G1492H` or `G6063`, which the tagged texts use. */
  readonly dStrong: string
  /** STEPBible's unified numbers, which point a form or meaning at its main entry. */
  readonly uStrongs: ReadonlyArray<string>
  readonly lemma: string
  readonly transliteration: string
  readonly morph: string
  readonly gloss: string
  /** The definition as STEPBible publishes it, with HTML markup. */
  readonly meaning: string
}

export type Lexicon = ReadonlyMap<string, StepLexiconRow>

const STRONGS = /^([GH])(\d+)/
const CLASSIC_LIMIT: Readonly<Record<string, number>> = { G: 5624, H: 8674 }
const UNSAFE_GLOBAL = new RegExp(UNSAFE_CHARACTERS.source, "gu")

/** Removes characters the dataset forbids, such as byte-order marks and bidirectional controls. */
export const removeUnsafe = (text: string): string => text.replace(UNSAFE_GLOBAL, "")

/** Reads the data rows of a STEPBible lexicon, skipping its introduction and proper-name records. */
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

/** Indexes lexicon rows by disambiguated number; the first row for a number wins. */
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

/**
 * The classic Strong's number readers know, such as `G1492`, for a STEPBible number. Numbers past
 * Strong's range, like `G6063` for οἶδα, take the number of the main entry STEPBible links them to.
 */
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

/** Turns a STEPBible definition into plain text: line breaks kept, markup and links dropped. */
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
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line !== "")
    .join("\n")

/** Lexicon rows in the normalized content contract, one entry per STEPBible number. */
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
export const lexiconFileName = (stepStrongs: string): string => {
  const match = STRONGS.exec(stepStrongs)
  return match === null ? "other.json" : `${match[1]}${Math.floor(Number(match[2]) / 100)}.json`
}
