import { beforeAll, describe, expect, it } from "vitest"
import { articleProblems, missingCalls, type Transcript, ungroundedQuotes } from "./grade.ts"
import { ask, report } from "./harness.ts"

const QUESTION =
  "What does John Calvin say about Romans 8:28, and which confession articles cite that verse?"

let transcript: Transcript

beforeAll(async () => {
  transcript = await ask(QUESTION)
  report(transcript)
})

describe("Calvin and the confessions on Romans 8:28", () => {
  it("calls the commentary and confession-article tools", () => {
    expect(missingCalls(transcript, ["get_commentary", "find_confession_articles"])).toEqual([])
  })

  it("quotes only text found word for word in a tool result", () => {
    expect(ungroundedQuotes(transcript)).toEqual([])
  })

  it("names only Westminster articles the tools returned, each with author, work, edition and license", () => {
    expect(articleProblems(transcript)).toEqual([])
  })
})
