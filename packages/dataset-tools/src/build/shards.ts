import {
  type BookId,
  type CommentaryBook,
  type CommentaryChapter,
  type Confession,
  type ConfessionCitation,
  type ConfessionIndexChapter,
  type CrossReferenceChapter,
  type LexiconEntry,
  type OriginalChapter,
  type Passage,
  type TranslationChapter,
  lexiconBucket,
  parseOsis,
  shardPaths,
  verseCount,
} from "@reformed-bible/core"
import { Result } from "effect"

export type Payloads = Map<string, unknown>

const passageOf = (ref: string): Passage | undefined => {
  const parsed = parseOsis(ref)
  return Result.isSuccess(parsed) ? parsed.success : undefined
}

/** Every chapter a passage touches, assuming it stays within one book. */
const chaptersOf = (passage: Passage): ReadonlyArray<number> => {
  const chapters: Array<number> = []
  for (let c = passage.start.chapter; c <= passage.end.chapter; c++) chapters.push(c)
  return chapters
}

export const translationPayloads = (
  chapters: ReadonlyArray<TranslationChapter>,
  into: Payloads,
): void => {
  for (const chapter of chapters)
    into.set(shardPaths.text(chapter.resourceId, chapter.book, chapter.chapter), chapter)
}

export const commentaryChapters = (
  books: ReadonlyArray<CommentaryBook>,
): ReadonlyArray<CommentaryChapter> => {
  const chapters: Array<CommentaryChapter> = []
  for (const book of books) {
    const byChapter = new Map<number, Array<CommentaryBook["sections"][number]>>()
    for (const section of book.sections) {
      const passage = passageOf(section.ref)
      if (passage === undefined) continue
      for (const chapter of chaptersOf(passage)) {
        const list = byChapter.get(chapter) ?? []
        list.push(section)
        byChapter.set(chapter, list)
      }
    }
    for (const [chapter, sections] of [...byChapter].sort(([a], [b]) => a - b)) {
      chapters.push({ resourceId: book.resourceId, book: book.book, chapter, sections })
    }
  }
  return chapters
}

export const commentaryPayloads = (
  chapters: ReadonlyArray<CommentaryChapter>,
  into: Payloads,
): void => {
  for (const chapter of chapters) {
    into.set(shardPaths.commentary(chapter.resourceId, chapter.book, chapter.chapter), chapter)
  }
}

export const crossReferencePayloads = (
  chapters: ReadonlyArray<CrossReferenceChapter>,
  into: Payloads,
): void => {
  for (const chapter of chapters)
    into.set(shardPaths.crossReferences(chapter.book, chapter.chapter), chapter)
}

export const wordPayloads = (chapters: ReadonlyArray<OriginalChapter>, into: Payloads): void => {
  for (const chapter of chapters) into.set(shardPaths.words(chapter.book, chapter.chapter), chapter)
}

export const lexiconPayloads = (entries: ReadonlyArray<LexiconEntry>, into: Payloads): void => {
  const buckets = new Map<string, Array<LexiconEntry>>()
  for (const entry of entries) {
    const bucket = lexiconBucket(entry.stepStrongs)
    const list = buckets.get(bucket) ?? []
    list.push(entry)
    buckets.set(bucket, list)
  }
  for (const [bucket, list] of buckets) into.set(shardPaths.lexicon(bucket), list)
}

export const confessionPayloads = (
  confessions: ReadonlyArray<Confession>,
  into: Payloads,
): void => {
  const index = new Map<string, Map<number, Array<ConfessionCitation>>>()
  for (const confession of confessions) {
    into.set(shardPaths.confession(confession.resourceId), confession)
    for (const division of confession.divisions) {
      for (const article of division.articles) {
        const citation = {
          resourceId: confession.resourceId,
          articleId: article.id,
          label: article.label,
        }
        const seen = new Set<string>()
        for (const proof of article.proofs) {
          for (const ref of proof.refs) {
            const passage = passageOf(ref)
            if (passage === undefined) continue
            for (const chapter of chaptersOf(passage)) {
              const first = chapter === passage.start.chapter ? passage.start.verse : 1
              const last =
                chapter === passage.end.chapter
                  ? passage.end.verse
                  : verseCount(passage.start.book, chapter)
              for (let verse = first; verse <= last; verse++) {
                const key = `${passage.start.book}.${chapter}.${verse}`
                if (seen.has(key)) continue
                seen.add(key)
                const chapterKey = `${passage.start.book}.${chapter}`
                const verses = index.get(chapterKey) ?? new Map<number, Array<ConfessionCitation>>()
                const list = verses.get(verse) ?? []
                list.push(citation)
                verses.set(verse, list)
                index.set(chapterKey, verses)
              }
            }
          }
        }
      }
    }
  }
  for (const [chapterKey, verses] of index) {
    const [book = "", chapter = ""] = chapterKey.split(".")
    const payload: ConfessionIndexChapter = {
      book: book as BookId,
      chapter: Number(chapter),
      verses: [...verses]
        .sort(([a], [b]) => a - b)
        .map(([verse, citations]) => ({ verse, citations })),
    }
    into.set(shardPaths.confessionIndex(payload.book, payload.chapter), payload)
  }
}
