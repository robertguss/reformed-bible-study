import { Option, Result, Schema } from "effect"
import {
  formatArticleIdentifier,
  parseArticleIdentifier,
} from "../../packages/core/src/confessions/index.ts"

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

/** Reads a citation in the confession grammar's typed form, keeping it as written when the grammar rejects it. */
const canonical = (typed: string): string =>
  Result.match(parseArticleIdentifier(typed), {
    onSuccess: formatArticleIdentifier,
    onFailure: () => typed,
  })

/** A confession's year after its name, such as "(1563)" or "1619,", which is not an article. */
const YEAR = String.raw`(?:\(?1[56]\d\d\)?[,\s]*)?`
const HEIDELBERG = String.raw`(?:Heidelberg(?: Catechism)?[,\s]*|HC\s*)${YEAR}`
const BELGIC = String.raw`(?:Belgic(?: Confession)?[,\s]*|(?<!\d\s)BC\s*)${YEAR}`
const DORT = String.raw`(?:Canons of Dor(?:dt|t)[,\s]*|CD\s*)${YEAR}`
const NUMBER = String.raw`(\d{1,3})(?!\d)`
const DORT_HEAD = String.raw`((?:[IV]+|[1-5])(?:\s*[/\-–]\s*(?:[IV]+|[1-5]))?)(?!\d)`
const DORT_HEAD_WORDS = String.raw`(First|Second|Third(?:\s+(?:and|&)\s+Fourth)?|Fourth|Fifth)\s+Heads?(?:\s+of\s+Doctrine)?`
const HEAD_OF_ORDINAL: Readonly<Record<string, string>> = {
  first: "I",
  second: "II",
  third: "III",
  fourth: "IV",
  fifth: "V",
}

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
  for (const [, number = ""] of text.matchAll(
    new RegExp(
      String.raw`\b${HEIDELBERG}(?:Q(?:uestion)?\s*(?:&\s*A)?\.?\s*|No\.\s*)?${NUMBER}`,
      "gi",
    ),
  ))
    found.add(canonical(`HC Q${number}`))
  for (const [, day = "", question] of text.matchAll(
    new RegExp(
      String.raw`\b${HEIDELBERG}(?:LD|Lord['’]?s Day)\.?\s*${NUMBER}(?:[,\s]*Q(?:uestion)?\s*(?:&\s*A)?\.?\s*${NUMBER})?`,
      "gi",
    ),
  ))
    found.add(canonical(question === undefined ? `HC LD ${day}` : `HC Q${question}`))
  for (const [, number = ""] of text.matchAll(
    new RegExp(String.raw`\b${BELGIC}(?:Art(?:icle)?\.?\s*)?${NUMBER}`, "gi"),
  ))
    found.add(canonical(`BC ${number}`))
  for (const [, head = "", number = ""] of text.matchAll(
    new RegExp(
      String.raw`\b${DORT}(?:Head(?: of Doctrine)?\s*)?${DORT_HEAD}(?:[,\s]*Art(?:icle)?\.?\s*|\s*[.:,–-]\s*|\s+)${NUMBER}`,
      "gi",
    ),
  ))
    found.add(canonical(`CD ${head.replace(/\s*[/\-–]\s*/, "-")} ${number}`))
  for (const [, words = "", number = ""] of text.matchAll(
    new RegExp(
      String.raw`\b${DORT}(?:the\s+)?${DORT_HEAD_WORDS}[,\s]*Art(?:icle)?\.?\s*${NUMBER}`,
      "gi",
    ),
  ))
    found.add(canonical(`CD ${HEAD_OF_ORDINAL[words.split(/\s/)[0]!.toLowerCase()]} ${number}`))
  if (new RegExp(String.raw`\b${DORT}(?:the\s+)?Conclusion\b`, "i").test(text))
    found.add("CD Conclusion")
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

const NEGATION = String.raw`\b(?:not|never|isn't|aren't|doesn't|don't|cannot|can't)`
const LINKING_WORDS = String.raw`(?:\s+(?:yet|currently|be|been|any|in|of|one|part|among|the|this|these|its|our))*`
const COVERAGE = String.raw`\s+(?:cover(?:s|ed)?|comment(?:s|ed)?|librar(?:y|ies)|available|ingested|includ(?:e|es|ed)|catalogu?ed|offer(?:s|ed)?|provide[sd]?|ha(?:ve|s)|carr(?:y|ies)|wr(?:ite|ites|ote|itten)|dataset|catalog|collection|resources|tools)\b`
const NOT_COVERED = new RegExp(
  String.raw`\bunavailable\b|\bno\s+comment(?:ary)?\b|\b(?:falls?|lies?|is|are)\s+outside\b|${NEGATION}${LINKING_WORDS}${COVERAGE}`,
  "i",
)

export const saysNotCovered = (answer: string): boolean =>
  NOT_COVERED.test(answer.replace(/[‘’]/g, "'"))
