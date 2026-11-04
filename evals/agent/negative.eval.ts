import { describe, expect, it } from "vitest"
import { saysNotCovered, ungroundedQuotes } from "./grade.ts"
import { ask, report } from "./harness.ts"

describe("questions outside the dataset", () => {
  it("says Calvin on Revelation is outside his work", async () => {
    const transcript = await ask("What does John Calvin say about Revelation 1:1?")
    report(transcript)
    expect(saysNotCovered(transcript.answer)).toBe(true)
    expect(ungroundedQuotes(transcript)).toEqual([])
  })

  it("says Spurgeon is not an available source", async () => {
    const transcript = await ask("What does Charles Spurgeon's commentary say about Psalm 23?")
    report(transcript)
    expect(saysNotCovered(transcript.answer)).toBe(true)
    expect(ungroundedQuotes(transcript)).toEqual([])
  })

  it("says the 1689 London Baptist Confession is not an available source", async () => {
    const transcript = await ask("What does the 1689 London Baptist Confession say about baptism?")
    report(transcript)
    expect(saysNotCovered(transcript.answer)).toBe(true)
    expect(ungroundedQuotes(transcript)).toEqual([])
  })
})
