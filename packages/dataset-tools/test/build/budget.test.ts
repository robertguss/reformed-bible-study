import { describe, expect, it } from "@effect/vitest"
import { DEFAULT_FILE_BUDGET, exceedsBudget } from "../../src/build/budget.ts"

describe("file budget", () => {
  it("allows a release larger than the free plan's 20,000 files", () => {
    expect(exceedsBudget(20_001, DEFAULT_FILE_BUDGET)).toBeUndefined()
  })

  it("leaves room under the paid plan's 100,000 files for the web build", () => {
    expect(DEFAULT_FILE_BUDGET).toBeLessThan(100_000)
    expect(exceedsBudget(DEFAULT_FILE_BUDGET + 1, DEFAULT_FILE_BUDGET)).toMatch(
      /files exceeds the budget/,
    )
  })
})
