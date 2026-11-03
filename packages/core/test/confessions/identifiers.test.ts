import { describe, expect, it } from "@effect/vitest"
import { Result } from "effect"
import {
  formatArticleIdentifier,
  InvalidArticleIdentifier,
  parseArticleIdentifier,
} from "../../src/confessions/identifiers.ts"

const parses: ReadonlyArray<readonly [string, string, string]> = [
  ["WCF 3.5", "wcf", "3.5"],
  ["Westminster Confession 3.5", "wcf", "3.5"],
  ["westminster confession of faith 21:1", "wcf", "21.1"],
  ["WSC 30", "wsc", "Q30"],
  ["WSC Q30", "wsc", "Q30"],
  ["Shorter Catechism Q. 1", "wsc", "Q1"],
  ["WLC Q1", "wlc", "Q1"],
  ["Westminster Larger Catechism question 196", "wlc", "Q196"],
  ["HC Q1", "hc", "Q1"],
  ["BC Art. 16", "bc", "Art16"],
  ["Belgic Confession article 2", "bc", "Art2"],
  ["CD I.7", "cd", "I.7"],
  ["Canons of Dort 5.3", "cd", "V.3"],
  ["LBCF 10.1", "lbcf", "10.1"],
]

describe("parseArticleIdentifier", () => {
  for (const [input, confession, article] of parses) {
    it(`parses ${JSON.stringify(input)} to ${confession} ${article}`, () => {
      const result = parseArticleIdentifier(input)
      expect(Result.isSuccess(result) ? result.success : result.failure).toEqual({
        confession,
        article,
      })
    })
  }

  it("rejects a confession chapter given without a section", () => {
    const result = parseArticleIdentifier("WCF 3")
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect(result.failure).toBeInstanceOf(InvalidArticleIdentifier)
      expect(result.failure.reason).toBe("missing_section")
    }
  })

  it("rejects an unknown confession", () => {
    const result = parseArticleIdentifier("Augsburg 4")
    expect(Result.isFailure(result) && result.failure.reason).toBe("unknown_confession")
  })

  it("rejects a question number of zero", () => {
    const result = parseArticleIdentifier("WSC Q0")
    expect(Result.isFailure(result) && result.failure.reason).toBe("malformed")
  })
})

describe("formatArticleIdentifier", () => {
  it("writes the citation form readers use", () => {
    expect(formatArticleIdentifier({ confession: "wcf", article: "3.5" })).toBe("WCF 3.5")
    expect(formatArticleIdentifier({ confession: "wsc", article: "Q30" })).toBe("WSC Q30")
    expect(formatArticleIdentifier({ confession: "bc", article: "Art16" })).toBe("BC Art. 16")
    expect(formatArticleIdentifier({ confession: "cd", article: "I.7" })).toBe("CD I.7")
  })
})
