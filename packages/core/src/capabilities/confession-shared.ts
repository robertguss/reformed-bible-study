import { Schema } from "effect"
import { ConfessionIds, type ConfessionId, formatArticleIdentifier } from "../confessions/index.ts"
import type { Confession, ConfessionArticle } from "../content/index.ts"
import { TextRuns } from "../envelope/index.ts"

export const ArticleFields = {
  confession: Schema.String,
  abbreviation: Schema.String,
  /** Canonical article id, such as `3.6` or `Q45`. */
  articleId: Schema.String,
  /** How readers cite the article, such as "WCF 3.6" or "WLC Q45". */
  citation: Schema.String,
  label: Schema.String,
  /** Title of the chapter the article belongs to, when the confession has chapters. */
  division: Schema.String,
  url: Schema.String,
  question: Schema.optionalKey(TextRuns),
  paragraphs: Schema.Array(TextRuns),
}

const isConfessionId = (id: string): id is ConfessionId =>
  (ConfessionIds as ReadonlyArray<string>).includes(id)

export const citationOf = (confession: Confession, articleId: string): string =>
  isConfessionId(confession.resourceId)
    ? formatArticleIdentifier({ confession: confession.resourceId, article: articleId })
    : `${confession.abbreviation} ${articleId}`

export interface LocatedArticle {
  readonly article: ConfessionArticle
  readonly division: string
}

export const articlesById = (confession: Confession): ReadonlyMap<string, LocatedArticle> =>
  new Map(
    confession.divisions.flatMap((division) =>
      division.articles.map(
        (article) => [article.id, { article, division: division.title }] as const,
      ),
    ),
  )
