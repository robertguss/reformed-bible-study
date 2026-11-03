import { Result, Schema } from "effect"

/** Confessions the identifier grammar knows, by resource id. */
export const ConfessionIds = ["wcf", "wlc", "wsc", "hc", "bc", "cd", "lbcf"] as const
export type ConfessionId = (typeof ConfessionIds)[number]

/** How a confession numbers its articles. */
type Numbering = "section" | "question" | "article" | "head"

interface ConfessionForm {
  readonly abbreviation: string
  readonly numbering: Numbering
  /** Lowercase names a reader may type, besides the abbreviation. */
  readonly names: ReadonlyArray<string>
}

const FORMS: Readonly<Record<ConfessionId, ConfessionForm>> = {
  wcf: {
    abbreviation: "WCF",
    numbering: "section",
    names: ["westminster confession", "westminster confession of faith"],
  },
  wlc: {
    abbreviation: "WLC",
    numbering: "question",
    names: ["westminster larger catechism", "larger catechism"],
  },
  wsc: {
    abbreviation: "WSC",
    numbering: "question",
    names: ["westminster shorter catechism", "shorter catechism"],
  },
  hc: { abbreviation: "HC", numbering: "question", names: ["heidelberg catechism", "heidelberg"] },
  bc: { abbreviation: "BC", numbering: "article", names: ["belgic confession", "belgic"] },
  cd: { abbreviation: "CD", numbering: "head", names: ["canons of dort", "canons of dordt"] },
  lbcf: {
    abbreviation: "LBCF",
    numbering: "section",
    names: ["london baptist confession", "1689 london baptist confession", "1689 confession"],
  },
}

export const InvalidArticleReasons = ["unknown_confession", "missing_section", "malformed"] as const

export class InvalidArticleIdentifier extends Schema.TaggedError<
  InvalidArticleIdentifier,
  { readonly brand: unique symbol }
>()("InvalidArticleIdentifier", {
  input: Schema.String,
  reason: Schema.Literals(InvalidArticleReasons),
}) {}

/**
 * One article of one confession. `article` is the canonical id stored in the dataset:
 * `3.5` for a chapter and section, `Q30` for a question, `Art16` for an article and `I.7`
 * for a head of doctrine and article.
 */
export interface ArticleIdentifier {
  readonly confession: ConfessionId
  readonly article: string
}

const ROMAN_HEADS = ["I", "II", "III", "IV", "V"] as const

const NAMES: ReadonlyArray<readonly [string, ConfessionId]> = ConfessionIds.flatMap((id) =>
  [FORMS[id].abbreviation.toLowerCase(), ...FORMS[id].names].map((name) => [name, id] as const),
).sort((a, b) => b[0].length - a[0].length)

const positive = (text: string): number | undefined => {
  const n = Number(text)
  return Number.isInteger(n) && n >= 1 ? n : undefined
}

const SECTION = /^(\d+)\s*[.:]\s*(\d+)$/
const QUESTION = /^(?:q(?:uestion)?\.?\s*)?(\d+)$/
const ARTICLE = /^(?:art(?:icle)?\.?\s*)?(\d+)$/
const HEAD = /^([ivx]+|\d+)\s*[.:]\s*(\d+)$/

const articleOf = (
  numbering: Numbering,
  rest: string,
): Result.Result<string, "missing_section" | "malformed"> => {
  switch (numbering) {
    case "section": {
      const match = SECTION.exec(rest)
      if (match === null) return Result.fail(/^\d+$/.test(rest) ? "missing_section" : "malformed")
      const chapter = positive(match[1] ?? "")
      const section = positive(match[2] ?? "")
      return chapter === undefined || section === undefined
        ? Result.fail("malformed")
        : Result.succeed(`${chapter}.${section}`)
    }
    case "question": {
      const n = positive(QUESTION.exec(rest)?.[1] ?? "")
      return n === undefined ? Result.fail("malformed") : Result.succeed(`Q${n}`)
    }
    case "article": {
      const n = positive(ARTICLE.exec(rest)?.[1] ?? "")
      return n === undefined ? Result.fail("malformed") : Result.succeed(`Art${n}`)
    }
    case "head": {
      const match = HEAD.exec(rest)
      if (match === null)
        return Result.fail(/^([ivx]+|\d+)$/.test(rest) ? "missing_section" : "malformed")
      const headText = (match[1] ?? "").toUpperCase()
      const head = /^\d+$/.test(headText)
        ? ROMAN_HEADS[Number(headText) - 1]
        : ROMAN_HEADS.find((h) => h === headText)
      const article = positive(match[2] ?? "")
      return head === undefined || article === undefined
        ? Result.fail("malformed")
        : Result.succeed(`${head}.${article}`)
    }
  }
}

/**
 * Parses a citation such as "WCF 3.5", "Westminster Confession 3.5", "WSC 30", "WLC Q1",
 * "HC Q1", "BC Art. 16", "CD I.7" or "LBCF 10.1" into a confession and canonical article id.
 * The grammar checks form only; whether the article exists is a question for the dataset.
 */
export const parseArticleIdentifier = (
  input: string,
): Result.Result<ArticleIdentifier, InvalidArticleIdentifier> => {
  const text = input.trim().replace(/\s+/g, " ").toLowerCase()
  const named = NAMES.find(([name]) => text === name || text.startsWith(`${name} `))
  if (named === undefined) {
    return Result.fail(new InvalidArticleIdentifier({ input, reason: "unknown_confession" }))
  }
  const [name, confession] = named
  const article = articleOf(FORMS[confession].numbering, text.slice(name.length).trim())
  return Result.isFailure(article)
    ? Result.fail(new InvalidArticleIdentifier({ input, reason: article.failure }))
    : Result.succeed({ confession, article: article.success })
}

/** Writes an article identifier the way readers cite it, such as "WCF 3.5", "WSC Q30" or "BC Art. 16". */
export const formatArticleIdentifier = ({ confession, article }: ArticleIdentifier): string => {
  const { abbreviation } = FORMS[confession]
  return article.startsWith("Art")
    ? `${abbreviation} Art. ${article.slice(3)}`
    : `${abbreviation} ${article}`
}
