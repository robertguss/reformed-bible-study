import type {
  CommentaryBook,
  CommentarySection,
  TextRun,
  TranslationChapter,
  VerseRef,
} from "@reformed-bible/core"
import { compareVerse, parseOsis } from "@reformed-bible/core"
import { Result } from "effect"

export interface Correction {
  readonly resourceId: string
  readonly ref: string
  readonly find: string
  readonly replace: string
  readonly reason: string
}

const replaceInRuns = (
  runs: ReadonlyArray<TextRun>,
  find: string,
  replace: string,
): ReadonlyArray<TextRun> | undefined => {
  const index = runs.findIndex((run) => run.text.includes(find))
  if (index === -1) return undefined
  return runs.map((run, i) =>
    i === index ? { ...run, text: run.text.replace(find, replace) } : run,
  )
}

const describe = (c: Correction) =>
  `correction to ${c.resourceId} at ${c.ref}: "${c.find}" not present`

export const correctTranslations = (
  chapters: ReadonlyArray<TranslationChapter>,
  corrections: ReadonlyArray<Correction>,
): Result.Result<ReadonlyArray<TranslationChapter>, string> => {
  let current = [...chapters]
  for (const correction of corrections) {
    const ref = parseOsis(correction.ref)
    if (Result.isFailure(ref))
      return Result.fail(`correction reference ${correction.ref} is invalid`)
    const { book, chapter, verse } = ref.success.start
    const position = current.findIndex(
      (c) => c.resourceId === correction.resourceId && c.book === book && c.chapter === chapter,
    )
    const target = current[position]
    if (target === undefined) continue
    let applied = false
    const verses = target.verses.map((v) => {
      if (v.verse !== verse || !("text" in v)) return v
      const text = replaceInRuns(v.text, correction.find, correction.replace)
      if (text === undefined) return v
      applied = true
      return { ...v, text }
    })
    if (!applied) return Result.fail(describe(correction))
    current = current.map((c, i) => (i === position ? { ...target, verses } : c))
  }
  return Result.succeed(current)
}

const sectionHolds = (section: CommentarySection, start: VerseRef): boolean => {
  const passage = parseOsis(section.ref)
  return (
    Result.isSuccess(passage) &&
    compareVerse(passage.success.start, start) <= 0 &&
    compareVerse(start, passage.success.end) <= 0
  )
}

export const correctCommentaries = (
  books: ReadonlyArray<CommentaryBook>,
  corrections: ReadonlyArray<Correction>,
): Result.Result<ReadonlyArray<CommentaryBook>, string> => {
  let current = [...books]
  for (const correction of corrections) {
    const ref = parseOsis(correction.ref)
    if (Result.isFailure(ref))
      return Result.fail(`correction reference ${correction.ref} is invalid`)
    const start = ref.success.start
    const position = current.findIndex(
      (b) => b.resourceId === correction.resourceId && b.book === start.book,
    )
    const target = current[position]
    if (target === undefined) continue
    let applied = false
    const sections = target.sections.map((section) => {
      if (applied || !sectionHolds(section, start)) return section
      const paragraphs = section.paragraphs.map((runs) => {
        if (applied) return runs
        const replaced = replaceInRuns(runs, correction.find, correction.replace)
        if (replaced === undefined) return runs
        applied = true
        return replaced
      })
      return { ...section, paragraphs }
    })
    if (!applied) return Result.fail(describe(correction))
    current = current.map((b, i) => (i === position ? { ...target, sections } : b))
  }
  return Result.succeed(current)
}
