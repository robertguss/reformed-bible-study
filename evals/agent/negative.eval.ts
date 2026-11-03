/**
 * Questions the dataset cannot answer. The agent should say so instead of filling the gap from
 * memory, and quote nothing the tools did not return.
 */
import { describe, expect, it } from "vitest"
import { saysNotCovered, ungroundedQuotes } from "./grade.ts"
import { ask, report } from "./harness.ts"

describe("questions outside the dataset", () => {
  it("says Calvin on Genesis 1:1 is not covered", async () => {
    const transcript = await ask("What does John Calvin say about Genesis 1:1?")
    report(transcript)
    expect(saysNotCovered(transcript.answer)).toBe(true)
    expect(ungroundedQuotes(transcript)).toEqual([])
  })

  it("says Matthew Henry is not an available source", async () => {
    const transcript = await ask("What does Matthew Henry's commentary say about Romans 8:28?")
    report(transcript)
    expect(saysNotCovered(transcript.answer)).toBe(true)
    expect(ungroundedQuotes(transcript)).toEqual([])
  })
})
