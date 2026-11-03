import { BOOK_IDS, type BookId, type VerseRef } from "@reformed-bible/core"

/** STEPBible's book abbreviations, used across TAGNT, TAHOT and TVTMS, in canon order. */
const STEP_BOOKS = [
  "Gen",
  "Exo",
  "Lev",
  "Num",
  "Deu",
  "Jos",
  "Jdg",
  "Rut",
  "1Sa",
  "2Sa",
  "1Ki",
  "2Ki",
  "1Ch",
  "2Ch",
  "Ezr",
  "Neh",
  "Est",
  "Job",
  "Psa",
  "Pro",
  "Ecc",
  "Sng",
  "Isa",
  "Jer",
  "Lam",
  "Ezk",
  "Dan",
  "Hos",
  "Jol",
  "Amo",
  "Oba",
  "Jon",
  "Mic",
  "Nam",
  "Hab",
  "Zep",
  "Hag",
  "Zec",
  "Mal",
  "Mat",
  "Mrk",
  "Luk",
  "Jhn",
  "Act",
  "Rom",
  "1Co",
  "2Co",
  "Gal",
  "Eph",
  "Php",
  "Col",
  "1Th",
  "2Th",
  "1Ti",
  "2Ti",
  "Tit",
  "Phm",
  "Heb",
  "Jas",
  "1Pe",
  "2Pe",
  "1Jn",
  "2Jn",
  "3Jn",
  "Jud",
  "Rev",
] as const

const stepToOsis = new Map<string, BookId>(
  STEP_BOOKS.flatMap((step, index) => {
    const osis = BOOK_IDS[index]
    return osis === undefined ? [] : [[step, osis] as const]
  }),
)

/** The canonical book id for a STEPBible book abbreviation such as `Psa` or `1Jn`. */
export const stepBookToOsis = (abbreviation: string): BookId | undefined =>
  stepToOsis.get(abbreviation)

/** Where TVTMS puts a Hebrew verse in KJV numbering. */
export type HebrewTarget =
  | { readonly kind: "verse"; readonly ref: VerseRef }
  | { readonly kind: "title"; readonly book: BookId; readonly chapter: number }
  /** The English Bible divides this Hebrew verse between several verses, so each word needs its own reference. */
  | { readonly kind: "divided"; readonly refs: ReadonlyArray<VerseRef> }

export interface TvtmsTable {
  readonly hebrew: ReadonlyMap<string, HebrewTarget>
  /**
   * Verses whose words English and Hebrew Bibles divide differently: English starts the verse on a
   * different word, or Hebrew Bibles leave the verse empty and its text sits in a neighbouring verse.
   */
  readonly dividedDifferently: ReadonlySet<string>
}

export const verseKey = (ref: VerseRef): string => `${ref.book}.${ref.chapter}.${ref.verse}`

const SINGLE_SOURCE = /^([1-3]?[A-Za-z]{2,3})\.(\d+):(\d+)$/

/** Parses a TVTMS standard reference such as `Mal.4:1`, `Num.26:1!a`, `Psa.13:5-6`, `Isa.63:19; 64:1` or `Psa.51:Title`. */
const parseTargets = (text: string): HebrewTarget | undefined => {
  const head = /^([1-3]?[A-Za-z]{2,3})\.(.*)$/.exec(text.trim())
  const book = head?.[1] === undefined ? undefined : stepBookToOsis(head[1])
  if (book === undefined || head?.[2] === undefined) return undefined
  const title = /^(\d+):Title$/.exec(head[2])
  if (title?.[1] !== undefined) return { kind: "title", book, chapter: Number(title[1]) }
  const refs: Array<VerseRef> = []
  for (const segment of head[2].split(";")) {
    const m = /^(\d+):(\d+)(?:![a-z])?(?:-(?:(\d+):)?(\d+))?$/.exec(segment.trim())
    if (m === null) return undefined
    const chapter = Number(m[1])
    const verse = Number(m[2])
    refs.push({ book, chapter, verse })
    if (m[4] !== undefined) {
      const endChapter = m[3] === undefined ? chapter : Number(m[3])
      const endVerse = Number(m[4])
      if (endChapter === chapter) {
        for (let v = verse + 1; v <= endVerse; v++) refs.push({ book, chapter, verse: v })
      } else refs.push({ book, chapter: endChapter, verse: endVerse })
    }
  }
  const [first] = refs
  if (first === undefined) return undefined
  return refs.length === 1 ? { kind: "verse", ref: first } : { kind: "divided", refs }
}

const refsOf = (target: HebrewTarget): ReadonlyArray<VerseRef> =>
  target.kind === "verse" ? [target.ref] : target.kind === "divided" ? target.refs : []

const merge = (a: HebrewTarget, b: HebrewTarget): HebrewTarget => {
  if (a.kind === "title" || b.kind === "title") return a.kind === "title" ? a : b
  const refs = [...refsOf(a)]
  for (const ref of refsOf(b)) {
    if (!refs.some((r) => verseKey(r) === verseKey(ref))) refs.push(ref)
  }
  const [only] = refs
  return refs.length === 1 && only !== undefined
    ? { kind: "verse", ref: only }
    : { kind: "divided", refs }
}

/**
 * Reads the expanded section of STEPBible's TVTMS table: every Hebrew-tradition verse that English
 * Bibles number differently, and the verses English Bibles start on a different word.
 */
export const parseTvtms = (text: string): TvtmsTable => {
  const hebrew = new Map<string, HebrewTarget>()
  const dividedDifferently = new Set<string>()
  let inExpanded = false
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith("#DataStart(Expanded)")) inExpanded = true
    else if (line.startsWith("#DataEnd(Expanded)")) inExpanded = false
    if (!inExpanded) continue
    const [type = "", source = "", standard = "", action = "", , note = ""] = line.split("\t")
    const sourceMatch = SINGLE_SOURCE.exec(source.trim())
    const book = sourceMatch?.[1] === undefined ? undefined : stepBookToOsis(sourceMatch[1])
    if (sourceMatch === null || book === undefined) continue
    const key = verseKey({ book, chapter: Number(sourceMatch[2]), verse: Number(sourceMatch[3]) })
    if (type.trim() === "AllBibles" && note.includes("starts on a different word")) {
      dividedDifferently.add(key)
      continue
    }
    if (!type.split("+").some((part) => part.trim() === "Hebrew")) continue
    if (action.startsWith("IfEmpty")) {
      dividedDifferently.add(key)
      continue
    }
    const target = parseTargets(standard)
    if (target === undefined) continue
    const existing = hebrew.get(key)
    hebrew.set(key, existing === undefined ? target : merge(existing, target))
  }
  return { hebrew, dividedDifferently }
}

/** The KJV place of a verse in Hebrew numbering; a verse the table does not mention keeps its number. */
export const mapHebrewVerse = (table: TvtmsTable, ref: VerseRef): HebrewTarget =>
  table.hebrew.get(verseKey(ref)) ?? { kind: "verse", ref }
