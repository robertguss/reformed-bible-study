import {
  formatPassage,
  verseCount,
  type BookId,
  type OriginalChapter,
  type OriginalWord,
  type VerseRef,
} from "@reformed-bible/core"
import { classicStrongs, removeUnsafe, type Lexicon } from "./stepbible-lexicon.ts"
import { mapHebrewVerse, stepBookToOsis, verseKey, type TvtmsTable } from "./tvtms.ts"

export const TAHOT_RESOURCE_ID = "stepbible-tahot"

/** One lexical tag: a STEPBible number and its grammar code. */
export interface Tag {
  readonly dStrong: string
  readonly grammar: string
}

/** An edition containing a word; `movedTo` is set when the edition places the word at another verse. */
export interface EditionMark {
  readonly code: string
  readonly movedTo?: { readonly chapter: number; readonly verse: number }
}

/** An alternative reading recorded on a TAGNT row, with the editions that follow it. */
export interface Reading {
  readonly greek: string
  readonly transliteration: string
  readonly gloss: string
  readonly tags: ReadonlyArray<Tag>
  readonly editions: ReadonlyArray<EditionMark>
}

/** One word row of STEPBible's Translators Amalgamated Greek NT. */
export interface TagntRow {
  readonly book: BookId
  /** Verse in KJV numbering: the bracketed KJV reference when given, otherwise the NRSV reference. */
  readonly kjv: VerseRef
  /** Verse in Nestle-Aland numbering, which the SBLGNT shares. */
  readonly na: VerseRef
  /** Another tradition's number for this verse, from the curly-bracket reference. */
  readonly other?: { readonly chapter: number; readonly verse: number }
  readonly word: number
  readonly type: string
  readonly greek: string
  readonly transliteration: string
  readonly tags: ReadonlyArray<Tag>
  readonly lemma: string
  /** Lexicon gloss of the word's dictionary form. */
  readonly gloss: string
  readonly editions: ReadonlyArray<EditionMark>
  readonly variants: ReadonlyArray<Reading>
  /** Spellings other editions use for this same word. */
  readonly spellings: ReadonlyArray<{
    readonly editions: ReadonlyArray<string>
    readonly form: string
  }>
}

const TAGNT_REF = /^([1-3]?[A-Za-z]{2,3})\.(\d+)\.(\d+)((?:[[({]\d+\.\d+[\])}])*)#(\d+)=(\S+)$/
const BRACKET = /([[({])(\d+)\.(\d+)[\])}]/g

export const parseEditions = (text: string): ReadonlyArray<EditionMark> =>
  text
    .split("+")
    .map((part) => part.trim())
    .filter((part) => part !== "")
    .map((part) => {
      const match = /^([^«»]+)(?:[«»](\d+)(?:\.(\d+))?)?$/.exec(part)
      const code = (match?.[1] ?? part).trim()
      return match?.[3] === undefined
        ? { code }
        : { code, movedTo: { chapter: Number(match[2]), verse: Number(match[3]) } }
    })

export const hasEdition = (editions: ReadonlyArray<EditionMark>, code: string): boolean =>
  editions.some((e) => e.code === code)

const parseTags = (text: string): ReadonlyArray<Tag> =>
  text
    .split(" + ")
    .map((part) => /^\s*([GH]\d{4}[A-Za-z]?)=(\S+)\s*$/.exec(part))
    .flatMap((m) =>
      m?.[1] === undefined || m[2] === undefined ? [] : [{ dStrong: m[1], grammar: m[2] }],
    )

/** TAGNT writes accents as oxia; the SBLGNT and the dataset use the composed (NFC) forms. */
const cleanGreek = (text: string): string =>
  removeUnsafe(text).replaceAll("¶", "").trim().normalize("NFC")

const parseVariants = (text: string): ReadonlyArray<Reading> =>
  text
    .split("¦")
    .map((part) =>
      /^(.*?)\s*\((?:[A-Za-z]=)?([^)]*)\)\s*(.*?)\s+-\s+(.+?)\s+in:\s*(.+?)\s*$/.exec(part.trim()),
    )
    .flatMap((m) => {
      if (m === null) return []
      const tags = parseTags(m[4] ?? "")
      if (tags.length === 0) return []
      return [
        {
          greek: cleanGreek(m[1] ?? ""),
          transliteration: (m[2] ?? "").trim(),
          gloss: (m[3] ?? "").trim(),
          tags,
          editions: parseEditions(m[5] ?? ""),
        },
      ]
    })

const parseSpellings = (text: string) =>
  text.split(";").flatMap((part) => {
    const m = /^\s*([^:]+):\s*(\S.*?)\s*$/.exec(part)
    return m?.[1] === undefined || m[2] === undefined
      ? []
      : [
          {
            editions: m[1].split("+").map((e) => e.replace(/[«»].*$/, "").trim()),
            form: cleanGreek(m[2]),
          },
        ]
  })

/** Reads the word rows of TAGNT, skipping comments, verse summaries and repeated header lines. */
export const parseTagnt = (text: string): ReadonlyArray<TagntRow> =>
  removeUnsafe(text)
    .split(/\r?\n/)
    .flatMap((line): ReadonlyArray<TagntRow> => {
      const columns = line.split("\t")
      const ref = TAGNT_REF.exec(columns[0] ?? "")
      const book = ref?.[1] === undefined ? undefined : stepBookToOsis(ref[1])
      if (ref === null || book === undefined) return []
      const base = { book, chapter: Number(ref[2]), verse: Number(ref[3]) }
      let kjv: VerseRef = base
      let na: VerseRef = base
      let other: { chapter: number; verse: number } | undefined
      for (const bracket of (ref[4] ?? "").matchAll(BRACKET)) {
        const at = { chapter: Number(bracket[2]), verse: Number(bracket[3]) }
        if (bracket[1] === "[") kjv = { book, ...at }
        else if (bracket[1] === "(") na = { book, ...at }
        else other = at
      }
      const greek = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(columns[1] ?? "")
      const lexical = columns[4] ?? ""
      const split = lexical.indexOf("=")
      const row: TagntRow = {
        book,
        kjv,
        na,
        word: Number(ref[5]),
        type: ref[6] ?? "",
        greek: cleanGreek(greek?.[1] ?? columns[1] ?? ""),
        transliteration: (greek?.[2] ?? "").trim(),
        tags: parseTags(columns[3] ?? ""),
        lemma: cleanGreek(split < 0 ? lexical : lexical.slice(0, split)),
        gloss: split < 0 ? "" : lexical.slice(split + 1).trim(),
        editions: parseEditions(columns[5] ?? ""),
        variants: parseVariants(columns[6] ?? ""),
        spellings: parseSpellings(columns[7] ?? ""),
      }
      return [other === undefined ? row : { ...row, other }]
    })

/** One word row of STEPBible's Translators Amalgamated Hebrew OT. */
export interface TahotRow {
  /** English (KJV) reference; verse 0 is a psalm title. */
  readonly english: { readonly book: BookId; readonly chapter: number; readonly verse: number }
  /** Reference in Hebrew Bibles. */
  readonly hebrew: VerseRef
  readonly word: number
  readonly type: string
  readonly text: string
  readonly transliteration: string
  /** STEPBible number of the root word, without prefixes or suffixes. */
  readonly root: string
  readonly grammar: string
  /** TAHOT's own dictionary form and gloss for the root, used when the lexicon has no entry for it. */
  readonly rootLemma: string
  readonly rootGloss: string
}

const TAHOT_REF = /^([1-3]?[A-Za-z]{2,3})\.(\d+)\.(\d+)(?:\((\d+)\.(\d+)\))?#(\d+)=(\S+)$/

/** Reads the word rows of TAHOT, skipping comments, interlinear lines and empty Qere placeholders. */
export const parseTahot = (text: string): ReadonlyArray<TahotRow> =>
  removeUnsafe(text)
    .split(/\r?\n/)
    .flatMap((line): ReadonlyArray<TahotRow> => {
      const columns = line.split("\t")
      const ref = TAHOT_REF.exec(columns[0] ?? "")
      const book = ref?.[1] === undefined ? undefined : stepBookToOsis(ref[1])
      const hebrewText = (columns[1] ?? "").replace(/[/\\]/g, "").trim()
      if (ref === null || book === undefined || hebrewText === "") return []
      const chapter = Number(ref[2])
      const verse = Number(ref[3])
      const tags = columns[4] ?? ""
      const root =
        /\{(H\d{4}[A-Za-z]?)\}/.exec(tags)?.[1] ??
        /^(H\d{4}[A-Za-z]?)/.exec(columns[8] ?? "")?.[1] ??
        /H\d{4}[A-Za-z]?/.exec(tags)?.[0] ??
        ""
      const expanded = new RegExp(`\\{${root}=([^=}]*)=([^}]*)\\}`).exec(columns[11] ?? "")
      return [
        {
          english: { book, chapter, verse },
          hebrew:
            ref[4] === undefined
              ? { book, chapter, verse }
              : { book, chapter: Number(ref[4]), verse: Number(ref[5]) },
          word: Number(ref[6]),
          type: ref[7] ?? "",
          text: hebrewText,
          transliteration: (columns[2] ?? "").replaceAll("/", "").trim(),
          root,
          grammar: (columns[5] ?? "").trim(),
          rootLemma: (expanded?.[1] ?? "").trim(),
          rootGloss: (expanded?.[2] ?? "").split("»")[0]?.replace(/^:\s*/, "").trim() ?? "",
        },
      ]
    })

const HEBREW_SOURCES: Readonly<Record<string, string>> = {
  L: "Leningrad",
  Q: "Qere",
  K: "Ketiv",
  R: "Restored",
  X: "LXX",
  A: "Aleppo",
  B: "BHS",
  C: "Cairensis",
  D: "Dead Sea",
  E: "Emendation",
  F: "Formatting",
  H: "Ben Chaim",
  P: "Punctuation",
  S: "Scribal",
  V: "Variant",
}

/** Sources that contain a Hebrew word, from the letters before any bracketed variants in its type. */
const hebrewEditions = (type: string): ReadonlyArray<string> =>
  [...(type.split("(")[0] ?? "")].flatMap((letter) => {
    const name = HEBREW_SOURCES[letter]
    return name === undefined ? [] : [name]
  })

interface Placed {
  readonly row: TahotRow
  readonly title: boolean
}

const sameVerse = (a: VerseRef, b: VerseRef): boolean => verseKey(a) === verseKey(b)

const describe = (ref: VerseRef): string => formatPassage({ start: ref, end: ref })

const NO_HEBREW = "No Hebrew text for this verse in the sources."

const wordRange = (from: number, to: number): string =>
  from === to ? `Word ${from} is` : `Words ${from}-${to} are`

const hebrewNotes = (kjv: VerseRef, placed: ReadonlyArray<Placed>): ReadonlyArray<string> => {
  const notes: Array<string> = []
  const titleCount = placed.filter((p) => p.title).length
  if (titleCount > 0) {
    const refs = placed.filter((p) => p.title).map((p) => p.row.hebrew)
    const start = refs[0] ?? kjv
    const end = refs.at(-1) ?? kjv
    notes.push(
      `${wordRange(1, titleCount)} the psalm title, ${formatPassage({ start, end })} in Hebrew Bibles.`,
    )
  }
  const distinct: Array<VerseRef> = []
  for (const { row, title } of placed) {
    if (!title && !distinct.some((r) => sameVerse(r, row.hebrew))) distinct.push(row.hebrew)
  }
  const [only] = distinct
  if (distinct.length === 1 && only !== undefined && !sameVerse(only, kjv)) {
    notes.push(`Hebrew Bibles number this verse ${describe(only)}.`)
  } else if (distinct.length > 1) {
    notes.push(`In Hebrew Bibles these words are ${distinct.map(describe).join(" and ")}.`)
  }
  return notes
}

const hebrewWord = (row: TahotRow, position: number, lexicon: Lexicon): OriginalWord => {
  const entry = lexicon.get(row.root)
  return {
    position,
    surface: row.text,
    transliteration: row.transliteration,
    lemma: entry?.lemma ?? row.rootLemma,
    strongs: row.root === "" ? "" : classicStrongs(row.root, lexicon),
    stepStrongs: row.root,
    morphology: row.grammar,
    gloss: entry?.gloss ?? row.rootGloss,
    editions: hebrewEditions(row.type),
  }
}

/** Does STEPBible's own English reference for a word agree with where TVTMS puts its Hebrew verse? */
const agrees = (row: TahotRow, table: TvtmsTable): boolean => {
  const target = mapHebrewVerse(table, row.hebrew)
  const english = row.english
  if (english.verse === 0) {
    if (target.kind === "title") return target.chapter === english.chapter
    const first = { book: english.book, chapter: english.chapter, verse: 1 }
    return target.kind === "verse"
      ? sameVerse(target.ref, first)
      : target.refs.some((r) => sameVerse(r, first))
  }
  if (target.kind === "title") return false
  if (target.kind === "divided") return target.refs.some((r) => sameVerse(r, english))
  if (sameVerse(target.ref, english)) return true
  const adjacent =
    target.ref.chapter === english.chapter && Math.abs(target.ref.verse - english.verse) === 1
  return (
    adjacent &&
    (table.dividedDifferently.has(verseKey(target.ref)) ||
      table.dividedDifferently.has(verseKey(english)))
  )
}

/**
 * Places TAHOT's Hebrew words on KJV verses. TVTMS maps each Hebrew verse to its KJV verse; where
 * English Bibles divide a Hebrew verse differently, STEPBible's word-level English reference decides,
 * and any word on which the two disagree is reported as a problem. Psalm titles open verse 1.
 */
export const buildHebrewChapters = (
  rows: ReadonlyArray<TahotRow>,
  table: TvtmsTable,
  lexicon: Lexicon,
): {
  readonly chapters: ReadonlyArray<OriginalChapter>
  readonly problems: ReadonlyArray<string>
} => {
  const problems: Array<string> = []
  const byChapter = new Map<string, Map<number, Array<Placed>>>()
  for (const row of rows) {
    if (!agrees(row, table)) {
      const target = mapHebrewVerse(table, row.hebrew)
      const tvtms =
        target.kind === "title"
          ? "the psalm title"
          : (target.kind === "verse" ? [target.ref] : target.refs).map(describe).join(" or ")
      const english = row.english.verse === 0 ? "the psalm title" : describe(row.english)
      problems.push(
        `Hebrew ${describe(row.hebrew)} word ${row.word}: STEPBible places it in ${english}, TVTMS in ${tvtms}`,
      )
    }
    const title = row.english.verse === 0
    const chapterKey = `${row.english.book}.${row.english.chapter}`
    const verses = byChapter.get(chapterKey) ?? new Map<number, Array<Placed>>()
    const verse = title ? 1 : row.english.verse
    const placed = verses.get(verse) ?? []
    placed.push({ row, title })
    verses.set(verse, placed)
    byChapter.set(chapterKey, verses)
  }

  const chapters: Array<OriginalChapter> = []
  for (const [chapterKey, verses] of byChapter) {
    const [bookText = "", chapterText = ""] = chapterKey.split(".")
    const book = bookText as BookId
    const chapter = Number(chapterText)
    const count = verseCount(book, chapter)
    for (const verse of verses.keys()) {
      if (verse > count) problems.push(`${book} ${chapter}:${verse} is outside KJV versification`)
    }
    const out: Array<OriginalChapter["verses"][number]> = []
    for (let verse = 1; verse <= count; verse++) {
      const placed = [...(verses.get(verse) ?? [])].sort(
        (a, b) => Number(b.title) - Number(a.title),
      )
      if (placed.length === 0) {
        out.push({ verse, words: [], notes: [NO_HEBREW] })
        continue
      }
      out.push({
        verse,
        words: placed.map((p, index) => hebrewWord(p.row, index + 1, lexicon)),
        notes: hebrewNotes({ book, chapter, verse }, placed),
      })
    }
    chapters.push({ resourceId: TAHOT_RESOURCE_ID, language: "hbo", book, chapter, verses: out })
  }
  return { chapters, problems }
}
