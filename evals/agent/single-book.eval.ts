import { beforeAll, describe, expect, it } from "vitest"
import { namedCommentaryProblems, type Transcript, ungroundedQuotes } from "./grade.ts"
import { ask, report } from "./harness.ts"

const QUESTION = "What does David Dickson say about Romans 8:28?"

let transcript: Transcript

beforeAll(async () => {
  transcript = await ask(QUESTION)
  report(transcript)
})

describe("Dickson, a commentator on a single book, on Romans 8:28", () => {
  it("asks for Dickson's commentary by name and gets only his comments", () => {
    expect(namedCommentaryProblems(transcript, "dickson")).toEqual([])
  })

  it("quotes only text found word for word in a tool result", () => {
    expect(ungroundedQuotes(transcript)).toEqual([])
  })
})
