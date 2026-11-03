import {
  bookByOsis,
  formatPassage,
  verseCount,
  type BookId,
  type OriginalChapter,
  type OriginalWord,
  type VerseRef,
} from "@reformed-bible/core"
import { classicStrongs, removeUnsafe, type Lexicon } from "./stepbible-lexicon.ts"
import { hasEdition, type EditionMark, type Tag, type TagntRow } from "./stepbible-tagged.ts"

export const SBLGNT_RESOURCE_ID = "sblgnt"

export interface SblToken {
  readonly book: BookId
  readonly chapter: number
  readonly verse: number
  readonly surface: string
}

// The SBLGNT marks variation units with signs in this block; they are apparatus, not text.
const SIGLA = new RegExp(`[${String.fromCodePoint(0x2e00)}-${String.fromCodePoint(0x2e0f)}]`, "gu")
const LETTER = /\p{L}/u

export const parseSblgnt = (book: BookId, text: string): ReadonlyArray<SblToken> =>
  removeUnsafe(text)
    .split(/\r?\n/)
    .flatMap((line) => {
      const match = /^\S+ (\d+):(\d+)\t(.*)$/.exec(line)
      if (match === null) return []
      const chapter = Number(match[1])
      const verse = Number(match[2])
      return (match[3] ?? "")
        .replace(SIGLA, "")
        .split(/\s+/)
        .filter((surface) => LETTER.test(surface))
        .map((surface) => ({ book, chapter, verse, surface }))
    })

export const comparable = (word: string): string =>
  word
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replaceAll("ς", "σ")
    .replace(/[^α-ω]/g, "")

const editDistance = (a: string, b: string): number => {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const current = [i]
    for (let j = 1; j <= b.length; j++) {
      current.push(
        Math.min(
          (previous[j] ?? 0) + 1,
          (current[j - 1] ?? 0) + 1,
          (previous[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1),
        ),
      )
    }
    previous = current
  }
  return previous[b.length] ?? 0
}

const LETTERS: Readonly<Record<string, string>> = {
  α: "a",
  β: "b",
  γ: "g",
  δ: "d",
  ε: "e",
  ζ: "z",
  η: "ē",
  θ: "th",
  ι: "i",
  κ: "k",
  λ: "l",
  μ: "m",
  ν: "n",
  ξ: "x",
  ο: "o",
  π: "p",
  ρ: "r",
  σ: "s",
  ς: "s",
  τ: "t",
  υ: "u",
  φ: "ph",
  χ: "ch",
  ψ: "ps",
  ω: "ō",
}
const ROUGH = String.fromCodePoint(0x0314)

export const transliterateGreek = (word: string): string => {
  const letters =
    word
      .normalize("NFD")
      .match(/\P{M}\p{M}*/gu)
      ?.map((cluster) => {
        const base = cluster.charAt(0)
        const lower = base.toLowerCase()
        return { lower, upper: base !== lower, rough: cluster.includes(ROUGH) }
      })
      .filter((letter) => LETTERS[letter.lower] !== undefined) ?? []
  let out = ""
  let rough = false
  letters.forEach((letter, index) => {
    let latin = LETTERS[letter.lower] ?? ""
    const next = letters[index + 1]?.lower ?? ""
    if (letter.lower === "γ" && "γκξχ".includes(next) && next !== "") latin = "n"
    if (letter.lower === "ρ" && letter.rough) latin = "rh"
    else if (letter.rough) rough = true
    out += letter.upper ? latin.charAt(0).toUpperCase() + latin.slice(1) : latin
  })
  if (!rough) return out
  return /^[A-ZĒŌ]/.test(out) ? `H${out.charAt(0).toLowerCase()}${out.slice(1)}` : `h${out}`
}

interface Candidate {
  readonly row: TagntRow
  readonly greek: string
  readonly forms: ReadonlyArray<string>
  readonly transliteration: string
  readonly tags: ReadonlyArray<Tag>
  readonly lemma: string
  readonly gloss: string
  readonly editions: ReadonlyArray<string>
}

const codes = (editions: ReadonlyArray<EditionMark>): ReadonlyArray<string> =>
  editions.map((e) => e.code)

const readingsOf = (
  row: TagntRow,
  lexicon: Lexicon,
): ReadonlyArray<Candidate & { sbl: boolean }> => {
  const main = {
    row,
    greek: row.greek,
    forms: [
      row.greek,
      ...row.spellings.filter((s) => s.editions.includes("SBL")).map((s) => s.form),
    ].map(comparable),
    transliteration: row.transliteration,
    tags: row.tags,
    lemma: row.lemma,
    gloss: row.gloss,
    editions: codes(row.editions),
    sbl: hasEdition(row.editions, "SBL"),
  }
  const variants = row.variants.flatMap((variant) => {
    const words = variant.greek.split(/\s+/).filter((w) => w !== "")
    const translits = variant.transliteration.split(/\s+/)
    return words.map((greek, index) => {
      const tag = variant.tags[Math.min(index, variant.tags.length - 1)]
      const tags = tag === undefined ? [] : [tag]
      const entry = tag === undefined ? undefined : lexicon.get(tag.dStrong)
      return {
        row,
        greek,
        forms: [comparable(greek)],
        transliteration:
          words.length === translits.length ? (translits[index] ?? "") : variant.transliteration,
        tags,
        lemma: entry?.lemma ?? "",
        gloss: entry?.gloss ?? variant.gloss,
        editions: codes(variant.editions),
        sbl: hasEdition(variant.editions, "SBL"),
      }
    })
  })
  return [main, ...variants]
}

const similarity = (token: string, candidate: Candidate): number => {
  if (candidate.forms.includes(token)) return 2
  const form = candidate.forms[0] ?? ""
  return editDistance(token, form) <=
    Math.max(1, Math.floor(Math.min(token.length, form.length) / 3))
    ? 1
    : 0
}

const alignInOrder = (
  tokens: ReadonlyArray<string>,
  candidates: ReadonlyArray<Candidate>,
): Array<number | undefined> => {
  const n = tokens.length
  const m = candidates.length
  const score = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  const at = (i: number, j: number) => score[i]?.[j] ?? 0
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const s = similarity(tokens[i - 1] ?? "", candidates[j - 1] as Candidate)
      const row = score[i] as Array<number>
      row[j] = Math.max(at(i - 1, j), at(i, j - 1), s > 0 ? at(i - 1, j - 1) + s : 0)
    }
  }
  const result: Array<number | undefined> = new Array(n).fill(undefined)
  let i = n
  let j = m
  while (i > 0 && j > 0) {
    const s = similarity(tokens[i - 1] ?? "", candidates[j - 1] as Candidate)
    if (s > 0 && at(i, j) === at(i - 1, j - 1) + s) {
      result[i - 1] = j - 1
      i--
      j--
    } else if (at(i, j) === at(i - 1, j)) i--
    else j--
  }
  return result
}

const verseOf = (ref: { chapter: number; verse: number }) => `${ref.chapter}.${ref.verse}`

const NOT_IN_SBL =
  "This verse is not in the SBL Greek New Testament. The words shown come from other Greek editions, as listed on each word."
const NO_GREEK = "No Greek edition in the sources has words for this verse."

const EDITION_NAMES: Readonly<Record<string, string>> = {
  Byz: "the Byzantine text",
  TR: "the Textus Receptus",
  NA28: "Nestle-Aland 28",
  NA27: "Nestle-Aland 27",
  SBL: "the SBL Greek New Testament",
  WH: "Westcott and Hort",
  Treg: "Tregelles",
  Tyn: "the Tyndale House Greek New Testament",
}

const bare = (word: string): string => word.replace(/[.,·;:—¶]/g, "").trim()

interface Placed {
  readonly surface: string
  readonly candidate: Candidate | undefined
  readonly addedSbl: boolean
}

const greekWord = (placed: Placed, position: number, lexicon: Lexicon): OriginalWord => {
  const { surface, candidate } = placed
  const tags = candidate?.tags ?? []
  const translit =
    candidate !== undefined && comparable(surface) === comparable(candidate.greek)
      ? candidate.transliteration
      : transliterateGreek(surface)
  const editions = candidate === undefined ? ["SBL"] : candidate.editions
  return {
    position,
    surface,
    transliteration: translit,
    lemma: candidate?.lemma ?? "",
    strongs: tags.map((t) => classicStrongs(t.dStrong, lexicon)).join("+"),
    stepStrongs: tags.map((t) => t.dStrong).join("+"),
    morphology: tags.map((t) => t.grammar).join("+"),
    gloss: candidate?.gloss ?? "",
    editions: placed.addedSbl ? [...editions, "SBL"] : editions,
  }
}

const locationNotes = (book: BookId, rows: ReadonlyArray<TagntRow>): ReadonlyArray<string> => {
  const notes: Array<string> = []
  const add = (note: string) => {
    if (!notes.includes(note)) notes.push(note)
  }
  for (const row of rows) {
    if (row.other === undefined) continue
    const moved = row.editions.filter((e) => e.movedTo !== undefined)
    for (const edition of moved) {
      if (edition.movedTo === undefined) continue
      const ref = { book, chapter: edition.movedTo.chapter, verse: edition.movedTo.verse }
      const name = EDITION_NAMES[edition.code] ?? edition.code
      add(`In ${name} these words stand at ${formatPassage({ start: ref, end: ref })}.`)
    }
    if (moved.length === 0) {
      add(
        `Some editions number these words ${bookByOsis(book)?.chapterName ?? book} ${row.other.chapter}:${row.other.verse}.`,
      )
    }
  }
  return notes
}

const textusReceptusNote = (
  words: ReadonlyArray<OriginalWord>,
  rows: ReadonlyArray<TagntRow>,
): ReadonlyArray<string> => {
  const notInTr = words.filter((w) => !w.editions.includes("TR")).map((w) => bare(w.surface))
  const onlyInTr: Array<string> = []
  for (const row of rows) {
    if (hasEdition(row.editions, "TR") && !hasEdition(row.editions, "SBL")) {
      onlyInTr.push(bare(row.spellings.find((s) => s.editions.includes("TR"))?.form ?? row.greek))
    }
    for (const variant of row.variants) {
      if (hasEdition(variant.editions, "TR") && !hasEdition(variant.editions, "SBL"))
        onlyInTr.push(bare(variant.greek))
    }
  }
  if (notInTr.length === 0 && onlyInTr.length === 0) return []
  return [
    "The Textus Receptus behind the KJV differs here." +
      (notInTr.length > 0 ? ` Not in it: ${notInTr.join(" ")}.` : "") +
      (onlyInTr.length > 0 ? ` Only in it: ${onlyInTr.join(" ")}.` : ""),
  ]
}

export interface GreekBuild {
  readonly chapters: ReadonlyArray<OriginalChapter>
  readonly untagged: ReadonlyArray<SblToken>
  /** SBLGNT words matched to a TAGNT reading that does not list SBL among its editions. */
  readonly sblAdded: number
  readonly problems: ReadonlyArray<string>
}

export const buildGreekChapters = (
  tokens: ReadonlyArray<SblToken>,
  rows: ReadonlyArray<TagntRow>,
  lexicon: Lexicon,
): GreekBuild => {
  const problems: Array<string> = []
  const untagged: Array<SblToken> = []
  let sblAdded = 0
  const books = [...new Set([...tokens.map((t) => t.book), ...rows.map((r) => r.book)])]
  const chapters: Array<OriginalChapter> = []

  for (const book of books) {
    const bookRows = rows.filter((r) => r.book === book)
    const bookTokens = tokens.filter((t) => t.book === book)
    // Readings the SBL text may follow, and all others for fallback, grouped by Nestle-Aland verse.
    const sblByVerse = new Map<string, Array<Candidate>>()
    const otherByVerse = new Map<string, Array<Candidate>>()
    const verseOrder: Array<string> = []
    const verseIndex = new Map<string, number>()
    for (const row of bookRows) {
      const key = verseOf(row.na)
      if (!verseIndex.has(key)) verseIndex.set(key, verseOrder.push(key) - 1)
      for (const reading of readingsOf(row, lexicon)) {
        const target = reading.sbl ? sblByVerse : otherByVerse
        const list = target.get(key) ?? []
        list.push(reading)
        target.set(key, list)
      }
    }
    const tokensByVerse = new Map<string, Array<SblToken>>()
    for (const token of bookTokens) {
      const key = verseOf(token)
      const list = tokensByVerse.get(key) ?? []
      list.push(token)
      tokensByVerse.set(key, list)
    }

    const matched = new Map<SblToken, Placed>()
    const used = new Set<Candidate>()
    for (const [key, verseTokens] of tokensByVerse) {
      const candidates = sblByVerse.get(key) ?? []
      const alignment = alignInOrder(
        verseTokens.map((t) => comparable(t.surface)),
        candidates,
      )
      alignment.forEach((index, t) => {
        const candidate = index === undefined ? undefined : candidates[index]
        const token = verseTokens[t]
        if (candidate === undefined || token === undefined) return
        matched.set(token, { surface: token.surface, candidate, addedSbl: false })
        used.add(candidate)
      })
    }
    // Words displaced or numbered differently: look in the same verse, then the neighbouring ones.
    const neighbours = (key: string) => {
      const index = verseIndex.get(key) ?? -1
      return [key, verseOrder[index - 1], verseOrder[index + 1]].filter(
        (k): k is string => k !== undefined,
      )
    }
    const bestFor = (token: SblToken, pools: ReadonlyArray<Candidate>) => {
      const form = comparable(token.surface)
      let best: Candidate | undefined
      let bestScore = 0
      for (const candidate of pools) {
        if (used.has(candidate)) continue
        const s = similarity(form, candidate)
        if (s > bestScore) {
          best = candidate
          bestScore = s
        }
      }
      return best
    }
    for (const token of bookTokens) {
      if (matched.has(token)) continue
      const keys = neighbours(verseOf(token))
      const sbl = bestFor(
        token,
        keys.flatMap((k) => sblByVerse.get(k) ?? []),
      )
      const other =
        sbl === undefined
          ? bestFor(
              token,
              keys.flatMap((k) => otherByVerse.get(k) ?? []),
            )
          : undefined
      const candidate = sbl ?? other
      if (candidate === undefined) continue
      used.add(candidate)
      if (other !== undefined && !other.editions.includes("SBL")) sblAdded++
      matched.set(token, {
        surface: token.surface,
        candidate,
        addedSbl: other !== undefined && !other.editions.includes("SBL"),
      })
    }

    // Place every SBL word on its reading's KJV verse, in SBLGNT order.
    const placedByVerse = new Map<string, Array<Placed>>()
    let lastKjv: VerseRef | undefined
    let lastSbl = ""
    for (const token of bookTokens) {
      const placed = matched.get(token)
      if (verseOf(token) !== lastSbl) lastKjv = undefined
      lastSbl = verseOf(token)
      let kjv = placed?.candidate?.row.kjv
      if (placed === undefined) {
        untagged.push(token)
        kjv =
          lastKjv ??
          bookTokens
            .slice(bookTokens.indexOf(token))
            .map((t) => matched.get(t)?.candidate?.row.kjv)
            .find((ref) => ref !== undefined) ??
          token
      }
      if (kjv === undefined) continue
      lastKjv = kjv
      const key = verseOf(kjv)
      const list = placedByVerse.get(key) ?? []
      list.push(placed ?? { surface: token.surface, candidate: undefined, addedSbl: false })
      placedByVerse.set(key, list)
    }
    const rowsByKjv = new Map<string, Array<TagntRow>>()
    for (const row of bookRows) {
      const key = verseOf(row.kjv)
      const list = rowsByKjv.get(key) ?? []
      list.push(row)
      rowsByKjv.set(key, list)
    }

    const chapterNumbers = [
      ...new Set(
        [...placedByVerse.keys(), ...rowsByKjv.keys()].map((key) => Number(key.split(".")[0])),
      ),
    ].sort((a, b) => a - b)
    for (const chapter of chapterNumbers) {
      const count = verseCount(book, chapter)
      for (const key of [...placedByVerse.keys(), ...rowsByKjv.keys()]) {
        const [c, v] = key.split(".").map(Number)
        if (c === chapter && (v ?? 0) > count)
          problems.push(`${book} ${chapter}:${v} is outside KJV versification`)
      }
      const verses: Array<OriginalChapter["verses"][number]> = []
      for (let verse = 1; verse <= count; verse++) {
        const key = `${chapter}.${verse}`
        const placed = placedByVerse.get(key) ?? []
        const verseRows = rowsByKjv.get(key) ?? []
        const location = locationNotes(book, verseRows)
        if (placed.length > 0) {
          const words = placed.map((p, index) => greekWord(p, index + 1, lexicon))
          verses.push({
            verse,
            words,
            notes: [...location, ...textusReceptusNote(words, verseRows)],
          })
        } else if (verseRows.length > 0) {
          const words = verseRows.map((row, index) =>
            greekWord(
              {
                surface: row.greek,
                candidate: readingsOf(row, lexicon)[0],
                addedSbl: false,
              },
              index + 1,
              lexicon,
            ),
          )
          verses.push({ verse, words, notes: [NOT_IN_SBL, ...location] })
        } else {
          verses.push({ verse, words: [], notes: [NO_GREEK] })
        }
      }
      chapters.push({ resourceId: SBLGNT_RESOURCE_ID, language: "grc", book, chapter, verses })
    }
  }
  return { chapters, untagged, sblAdded, problems }
}
