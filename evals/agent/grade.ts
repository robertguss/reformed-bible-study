/**
 * Deterministic grading of an agent's answer against the tool results it was given. Pure functions
 * over a transcript, so they are unit-tested with canned transcripts and need no model.
 */
import { Option, Schema } from "effect"

export interface ToolCall {
  readonly name: string
  readonly args: unknown
  readonly isError: boolean
  /** The text content of the result, as the model read it. */
  readonly text: string
  readonly structured: unknown
}

export interface Transcript {
  readonly question: string
  readonly answer: string
  readonly calls: ReadonlyArray<ToolCall>
}

/** Markdown backslash escapes, which the server's text form puts before punctuation. */
const MARKDOWN_ESCAPE = /\\([!-/:-@[-`{-~])/g

/**
 * Text compared word for word: Markdown escapes, blockquote markers and emphasis stars removed,
 * typographic quotes and dashes made plain, whitespace collapsed and case folded.
 */
export const normalize = (text: string): string =>
  text
    .replace(MARKDOWN_ESCAPE, "$1")
    .replace(/^[ \t]*>[ \t]?/gm, "")
    .replace(/\*+/g, "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()

/** Letters and digits only, for matching credits whatever punctuation surrounds them. */
const wordsOf = (text: string): string =>
  ` ${text
    .replace(MARKDOWN_ESCAPE, "$1")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()} `

/** Quotations shorter than this are taken as names or terms, not quoted text. */
export const MIN_QUOTE_WORDS = 3

const wordCount = (text: string): number => text.split(/\s+/).filter((word) => word !== "").length

/**
 * Every quoted span in an answer: text inside straight or curly double quotes on one line, and each
 * blockquote line. A blockquote line that starts with a dash is the answer's own attribution line,
 * not a quotation, and is skipped.
 */
export const quotedSpans = (answer: string): ReadonlyArray<string> => {
  const spans: Array<string> = []
  for (const line of answer.split("\n")) {
    const blockquote = /^[ \t]*>[ \t]?(.*)$/.exec(line)
    if (blockquote !== null) {
      const body = (blockquote[1] ?? "").trim()
      if (body !== "" && !/^[-–—]/.test(body)) spans.push(body)
      continue
    }
    for (const match of line.matchAll(/"([^"]+)"|“([^”]+)”/g))
      spans.push(match[1] ?? match[2] ?? "")
  }
  return spans.filter((span) => wordCount(span) >= MIN_QUOTE_WORDS)
}

/** The parts of a quotation between ellipses and bracketed insertions, trimmed of edge punctuation. */
const fragmentsOf = (span: string): ReadonlyArray<string> =>
  span
    .split(/\.{3}|…|\[[^\]]*\]/)
    .map((fragment) => normalize(fragment).replace(/^[\s"'(),;:.-]+|[\s"'(),;:.-]+$/g, ""))
    .filter((fragment) => fragment !== "")

/** Quoted spans of the answer that do not appear word for word in any tool result text. */
export const ungroundedQuotes = (transcript: Transcript): ReadonlyArray<string> => {
  const sources = normalize(transcript.calls.map((call) => call.text).join("\n"))
  return quotedSpans(transcript.answer).filter((span) =>
    fragmentsOf(span).some((fragment) => !sources.includes(fragment)),
  )
}

const citation = (abbreviation: string, number: string): string => {
  const upper = abbreviation.toUpperCase()
  return upper === "WCF" ? `WCF ${number}` : `${upper} Q${number}`
}

const CATECHISM = { larger: "WLC", shorter: "WSC" } as const

/**
 * The Westminster articles an answer names, as the tools cite them ("WCF 3.6", "WLC Q45"). Reads
 * the abbreviations and the common long forms: "Westminster Confession of Faith 5.7", "chapter 5,
 * section 7", "Larger Catechism Q. 45", "Shorter Catechism question 7".
 */
export const namedArticles = (answer: string): ReadonlySet<string> => {
  const text = answer.replace(MARKDOWN_ESCAPE, "$1")
  const found = new Set<string>()
  for (const [, abbreviation = "", number = ""] of text.matchAll(
    /\b(WCF|WLC|WSC)\s*(?:Q(?:uestion)?\.?\s*)?(\d+(?:\.\d+)?)/gi,
  ))
    found.add(citation(abbreviation, number))
  for (const [, chapter, section, dotted] of text.matchAll(
    /(?:Westminster Confession(?: of Faith)?|WCF)[,\s]*(?:(?:chapter|ch\.)\s*(\d+)[,\s]*(?:section|sec\.|§)\s*(\d+)|(\d+\.\d+))/gi,
  ))
    found.add(citation("WCF", dotted ?? `${chapter}.${section}`))
  for (const [, kind = "", number = ""] of text.matchAll(
    /(Larger|Shorter) Catechism[,\s]*(?:Q(?:uestion)?\.?\s*|No\.\s*)?(\d+)/gi,
  ))
    found.add(
      citation(kind.toLowerCase() === "larger" ? CATECHISM.larger : CATECHISM.shorter, number),
    )
  return found
}

const Attribution = Schema.Struct({
  author: Schema.String,
  work: Schema.String,
  edition: Schema.String,
  license: Schema.String,
})
type Attribution = typeof Attribution.Type

const ArticleEnvelope = Schema.Struct({
  items: Schema.Array(
    Schema.Struct({ value: Schema.Struct({ citation: Schema.String }), attribution: Attribution }),
  ),
})

const decodeArticles = Schema.decodeUnknownOption(ArticleEnvelope)

const ARTICLE_TOOLS: ReadonlySet<string> = new Set([
  "find_confession_articles",
  "get_confession_article",
])

/** Every confession article a tool returned, by citation, with its attribution. */
export const returnedArticles = (transcript: Transcript): ReadonlyMap<string, Attribution> => {
  const returned = new Map<string, Attribution>()
  for (const call of transcript.calls) {
    if (call.isError || !ARTICLE_TOOLS.has(call.name)) continue
    for (const item of Option.getOrElse(decodeArticles(call.structured), () => ({ items: [] }))
      .items)
      returned.set(item.value.citation, item.attribution)
  }
  return returned
}

/**
 * Problems with the confession articles an answer names: none named, one no tool returned, or one
 * named without the author, work, edition and license its result carried.
 */
export const articleProblems = (transcript: Transcript): ReadonlyArray<string> => {
  const named = namedArticles(transcript.answer)
  if (named.size === 0) return ["The answer names no confession article."]
  const returned = returnedArticles(transcript)
  const answer = wordsOf(transcript.answer)
  const problems: Array<string> = []
  for (const article of named) {
    const attribution = returned.get(article)
    if (attribution === undefined) {
      problems.push(`${article} is named but no tool returned it.`)
      continue
    }
    for (const field of ["author", "work", "edition", "license"] as const)
      if (!answer.includes(wordsOf(attribution[field])))
        problems.push(`${article} is not credited with its ${field}: ${attribution[field]}`)
  }
  return problems
}

/** Tools the agent was expected to call that it never called successfully. */
export const missingCalls = (
  transcript: Transcript,
  tools: ReadonlyArray<string>,
): ReadonlyArray<string> =>
  tools.filter((tool) => !transcript.calls.some((call) => call.name === tool && !call.isError))

/**
 * The answer says the source or passage is not there: a negation followed closely by a word for
 * coverage or availability ("is not yet covered", "doesn't include", "isn't available").
 */
export const saysNotCovered = (answer: string): boolean =>
  /\bunavailable\b|\b(?:not|no|isn't|aren't|doesn't|don't|cannot|can't)\b[^.\n]{0,60}?\b(?:cover(?:s|ed|age)?|available|ingested|includ(?:e|es|ed)|catalogu?ed|offer(?:s|ed)?|provide[sd]?|ha(?:ve|s)|carr(?:y|ies)|part of|among)\b/i.test(
    answer.replace(/[‘’]/g, "'"),
  )
