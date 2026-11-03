import { Option, Schema } from "effect"

export interface ToolCall {
  readonly name: string
  readonly args: unknown
  readonly isError: boolean
  readonly text: string
  readonly structured: unknown
}

export interface Transcript {
  readonly question: string
  readonly answer: string
  readonly calls: ReadonlyArray<ToolCall>
}

const MARKDOWN_ESCAPE = /\\([!-/:-@[-`{-~])/g

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

const wordsOf = (text: string): string =>
  ` ${text
    .replace(MARKDOWN_ESCAPE, "$1")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()} `

export const MIN_QUOTE_WORDS = 3

const wordCount = (text: string): number => text.split(/\s+/).filter((word) => word !== "").length

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

const fragmentsOf = (span: string): ReadonlyArray<string> =>
  span
    .split(/\.{3}|…|\[[^\]]*\]/)
    .map((fragment) => normalize(fragment).replace(/^[\s"'(),;:.-]+|[\s"'(),;:.-]+$/g, ""))
    .filter((fragment) => fragment !== "")

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

export const missingCalls = (
  transcript: Transcript,
  tools: ReadonlyArray<string>,
): ReadonlyArray<string> =>
  tools.filter((tool) => !transcript.calls.some((call) => call.name === tool && !call.isError))

export const saysNotCovered = (answer: string): boolean =>
  /\bunavailable\b|\b(?:not|no|isn't|aren't|doesn't|don't|cannot|can't)\b[^.\n]{0,60}?\b(?:cover(?:s|ed|age)?|available|ingested|includ(?:e|es|ed)|catalogu?ed|offer(?:s|ed)?|provide[sd]?|ha(?:ve|s)|carr(?:y|ies)|part of|among)\b/i.test(
    answer.replace(/[‘’]/g, "'"),
  )
