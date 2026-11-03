import { describe, expect, it } from "@effect/vitest"
import { Result } from "effect"
import cases from "./cases.json" with { type: "json" }
import {
  bookByOsis,
  formatPassage,
  parseOsis,
  parseReference,
  toOsis,
} from "../../src/reference/index.ts"

describe("parseReference", () => {
  for (const { input, osis } of cases.parses) {
    it(`parses ${JSON.stringify(input)} to ${osis}`, () => {
      const result = parseReference(input)
      expect(Result.isSuccess(result)).toBe(true)
      if (Result.isSuccess(result)) expect(result.success.map(toOsis)).toEqual([osis])
    })
  }

  for (const failure of cases.failures) {
    it(`rejects ${JSON.stringify(failure.input)} as ${failure.reason}`, () => {
      const result = parseReference(failure.input)
      expect(Result.isFailure(result)).toBe(true)
      if (Result.isFailure(result)) {
        expect(result.failure.reason).toBe(failure.reason)
        const suggestion = result.failure.suggestion
        expect(suggestion === undefined ? undefined : toOsis(suggestion)).toBe(failure.suggestion)
      }
    })
  }

  it("returns every passage in a list of references", () => {
    const result = parseReference("Jn 3:16, 18")
    expect(Result.isSuccess(result) ? result.success.map(toOsis) : []).toEqual([
      "John.3.16",
      "John.3.18",
    ])
  })
})

describe("formatPassage and parseOsis", () => {
  for (const { osis, display } of cases.formats) {
    it(`formats ${osis} as ${display} and round-trips`, () => {
      const parsed = parseOsis(osis)
      expect(Result.isSuccess(parsed)).toBe(true)
      if (Result.isSuccess(parsed)) {
        expect(formatPassage(parsed.success)).toBe(display)
        expect(toOsis(parsed.success)).toBe(osis)
        const reparsed = parseReference(display)
        expect(Result.isSuccess(reparsed) ? reparsed.success.map(toOsis) : []).toEqual([osis])
      }
    })
  }

  it("rejects an OSIS reference beyond the end of a chapter", () => {
    const parsed = parseOsis("Rom.8.40")
    expect(Result.isFailure(parsed) && parsed.failure.reason).toBe("out_of_range")
  })

  it("takes a literal 999 in OSIS as a number, not as the end of the chapter or book", () => {
    for (const osis of ["Rom.8.1-Rom.8.999", "Rom.8.1-Rom.999.1"]) {
      const parsed = parseOsis(osis)
      expect(Result.isFailure(parsed) && parsed.failure.reason).toBe("out_of_range")
    }
  })

  it("rejects reversed ranges and ranges with more than two ends", () => {
    for (const osis of ["Rom.9.1-Rom.8.1", "Rom.8.28-Rom.8.30-Gen.1.1"]) {
      const parsed = parseOsis(osis)
      expect(Result.isFailure(parsed) && parsed.failure.reason).toBe("unrecognized")
    }
  })
})

describe("book table", () => {
  it("numbers Romans as the 45th book of the 66-book canon", () => {
    expect(bookByOsis("Rom")?.ordinal).toBe(45)
    expect(bookByOsis("Rev")?.ordinal).toBe(66)
  })
})
