import { findConfessionArticles } from "./confession-articles-for-passage.ts"
import { getConfessionArticle } from "./confession-article.ts"
import { getConfessionOutline } from "./confession-outline.ts"
import { getCommentary } from "./commentary.ts"
import { getCrossReferences } from "./cross-references.ts"
import { getLexiconEntry } from "./lexicon-entry.ts"
import { listResources } from "./list-resources.ts"
import { getPassage } from "./passage-text.ts"
import { resolveReference } from "./resolve-reference.ts"
import { getVerseWords } from "./verse-words.ts"

/**
 * Every capability, in a stable order. The web app runs these handlers directly; the public API and
 * MCP project them, so this module must never import the projections.
 */
export const capabilities = [
  listResources,
  resolveReference,
  getPassage,
  getCommentary,
  findConfessionArticles,
  getConfessionArticle,
  getConfessionOutline,
  getCrossReferences,
  getVerseWords,
  getLexiconEntry,
] as const
