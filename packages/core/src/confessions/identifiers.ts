import { Result, Schema } from "effect"

/** Confessions the identifier grammar knows, by resource id. */
export const ConfessionIds = ["wcf", "wlc", "wsc", "hc", "bc", "cd"] as const
export type ConfessionId = (typeof ConfessionIds)[number]

/** `lords-day-question` is a question that may also be cited by the Lord's Day it opens. */
type Numbering = "section" | "question" | "lords-day-question" | "article" | "head"

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
  hc: {
    abbreviation: "HC",
    numbering: "lords-day-question",
    names: ["heidelberg catechism", "heidelberg"],
  },
  bc: { abbreviation: "BC", numbering: "article", names: ["belgic confession", "belgic"] },
  cd: { abbreviation: "CD", numbering: "head", names: ["canons of dort", "canons of dordt"] },
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
 * `3.5` for a chapter and section, `Q30` for a question, `Art16` for an article, `I.7`
 * or `III-IV.4` for a head of doctrine and article, and `Conclusion` for the Canons of
 * Dort's closing statement.
 */
export interface ArticleIdentifier {
  readonly confession: ConfessionId
  readonly article: string
}

/** The Canons of Dort's heads of doctrine, by typed head number; the third and fourth form one head. */
const HEADS: Readonly<Record<string, string>> = {
  "1": "I",
  "2": "II",
  "3": "III-IV",
  "4": "III-IV",
  "3/4": "III-IV",
  "5": "V",
}

const ROMAN_NUMERALS: Readonly<Record<string, string>> = {
  i: "1",
  ii: "2",
  iii: "3",
  iv: "4",
  v: "5",
}

/**
 * The first question of each of the Heidelberg Catechism's fifty-two Lord's Days. The
 * catechism's division into Lord's Days is fixed, so "HC LD 32" always means Q86.
 */
const LORDS_DAY_FIRST_QUESTIONS: ReadonlyArray<number> = [
  1, 3, 6, 9, 12, 16, 20, 24, 26, 27, 29, 31, 33, 35, 37, 40, 45, 46, 50, 53, 54, 57, 59, 62, 65,
  69, 72, 75, 78, 80, 83, 86, 88, 92, 96, 99, 101, 103, 104, 105, 108, 110, 112, 113, 116, 120, 122,
  123, 124, 125, 126, 127,
]

const NAMES: ReadonlyArray<readonly [string, ConfessionId]> = ConfessionIds.flatMap((id) =>
  [FORMS[id].abbreviation.toLowerCase(), ...FORMS[id].names].map((name) => [name, id] as const),
).sort((a, b) => b[0].length - a[0].length)

const positive = (text: string): number | undefined => {
  const n = Number(text)
  return Number.isInteger(n) && n >= 1 ? n : undefined
}

const SECTION = /^(\d+)\s*[.:]\s*(\d+)$/
const QUESTION = /^(?:q(?:uestion)?\.?\s*)?(\d+)$/
const LORDS_DAY = /^(?:ld|lord['’]?s day)\.?\s*(\d+)$/
const ARTICLE = /^(?:art(?:icle)?\.?\s*)?(\d+)$/
/** A head of doctrine as typed: "i", "5", or a joined pair such as "iii/iv" or "3-4". */
const HEAD_NAME = String.raw`((?:[iv]+|\d+)(?:\s*[/-]\s*(?:[iv]+|\d+))?)`
const HEAD = new RegExp(String.raw`^${HEAD_NAME}(?:\s*[.:]\s*|\s+)(\d+)$`)
const HEAD_ONLY = new RegExp(`^${HEAD_NAME}$`)

/** Canonical head id for a typed head such as "iii/iv", "3-4" or "5". */
const headOf = (typed: string): string | undefined => {
  const numbers = typed.split(/\s*[/-]\s*/).map((part) => ROMAN_NUMERALS[part] ?? part)
  return HEADS[numbers.join("/")]
}

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
    case "lords-day-question": {
      const lordsDay = LORDS_DAY.exec(rest)
      if (lordsDay === null) return articleOf("question", rest)
      const n = LORDS_DAY_FIRST_QUESTIONS[Number(lordsDay[1]) - 1]
      return n === undefined ? Result.fail("malformed") : Result.succeed(`Q${n}`)
    }
    case "article": {
      const n = positive(ARTICLE.exec(rest)?.[1] ?? "")
      return n === undefined ? Result.fail("malformed") : Result.succeed(`Art${n}`)
    }
    case "head": {
      if (rest === "conclusion") return Result.succeed("Conclusion")
      const match = HEAD.exec(rest)
      if (match === null) return Result.fail(HEAD_ONLY.test(rest) ? "missing_section" : "malformed")
      const head = headOf(match[1] ?? "")
      const article = positive(match[2] ?? "")
      return head === undefined || article === undefined
        ? Result.fail("malformed")
        : Result.succeed(`${head}.${article}`)
    }
  }
}

/**
 * Parses a citation such as "WCF 3.5", "Westminster Confession 3.5", "WSC 30", "WLC Q1",
 * "HC Q1", "HC LD 32", "BC Art. 16", "CD I.7", "CD III/IV 4" or "CD Conclusion" into a
 * confession and canonical article id. A Lord's Day resolves to its first question.
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
