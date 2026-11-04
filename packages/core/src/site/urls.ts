import { type Passage, verseCount } from "../reference/index.ts"
import { BOOK_SLUGS } from "./slugs.ts"

/**
 * Web path of a passage: `/{book}/{chapter}` for a whole chapter, `/{book}/{chapter}/{verse}` for
 * one verse, and `/{book}/{chapter}/{first}-{last}` for a range within a chapter. A range that
 * crosses a chapter opens at its first verse.
 */
export const passagePath = ({ start, end }: Passage): string => {
  const chapter = `/${BOOK_SLUGS[start.book]}/${start.chapter}`
  const sameChapter = start.book === end.book && start.chapter === end.chapter
  if (!sameChapter) return `${chapter}/${start.verse}`
  if (start.verse === 1 && end.verse === verseCount(end.book, end.chapter)) return chapter
  if (start.verse === end.verse) return `${chapter}/${start.verse}`
  return `${chapter}/${start.verse}-${end.verse}`
}

export const confessionPath = (confession: string): string => `/confessions/${confession}`

/**
 * Web path of one article: `/confessions/wcf/3/5` for a chapter and section, `/confessions/wsc/30`
 * for a question, `/confessions/bc/16` for an article, `/confessions/cd/III-IV/4` for a head and
 * article, and `/confessions/cd/conclusion` for the Canons of Dort's Conclusion.
 */
export const confessionArticlePath = (confession: string, article: string): string => {
  if (article === "Conclusion") return `${confessionPath(confession)}/conclusion`
  const numbered = /^(?:Q|Art)(\d+)$/.exec(article)
  const parts = numbered === null ? article.split(".") : [numbered[1] ?? article]
  return `${confessionPath(confession)}/${parts.join("/")}`
}
