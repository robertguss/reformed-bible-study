import { describe, expect, it } from "@effect/vitest"
import { Result } from "effect"
import { overlaps, parseOsis, type Passage } from "../../src/reference/index.ts"

const passage = (osis: string): Passage => {
  const parsed = parseOsis(osis)
  if (Result.isFailure(parsed)) throw new Error(`bad fixture ${osis}`)
  return parsed.success
}

describe("overlaps", () => {
  const section = passage("Rom.8.28-Rom.8.30")

  it("matches a query inside the range", () => {
    expect(overlaps(section, passage("Rom.8.29"))).toBe(true)
  })

  it("does not match a query after the range", () => {
    expect(overlaps(section, passage("Rom.8.31"))).toBe(false)
  })

  it("matches a query range that crosses into the section from the previous chapter", () => {
    expect(overlaps(section, passage("Rom.7.25-Rom.8.28"))).toBe(true)
  })

  it("does not match the same chapter and verse in another book", () => {
    expect(overlaps(section, passage("Gal.4.29"))).toBe(false)
  })
})
