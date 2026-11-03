import { describe, expect, it } from "@effect/vitest"
import { Result, Schema } from "effect"
import {
  Attribution,
  makeEnvelope,
  renderText,
  TextRuns,
  type TextRun,
} from "../src/envelope/index.ts"

const CommentaryItem = Schema.Struct({ ref: Schema.String, text: TextRuns })
const CommentaryEnvelope = makeEnvelope(CommentaryItem)

const calvin: Attribution = {
  resourceId: "calvin-commentaries",
  author: "John Calvin",
  work: "Commentary on the Epistle to the Romans",
  edition: "Calvin Translation Society, tr. John Owen, 1849",
  license: "CC-PDM-1.0",
  licenseUrl: "https://creativecommons.org/publicdomain/mark/1.0/",
  attributionText: "John Calvin, Commentary on Romans, tr. John Owen (1849). Public domain.",
  sourceUrl: "https://www.ccel.org/ccel/calvin/calcom38.xml",
}

const envelope = {
  items: [
    {
      value: {
        ref: "Rom.8.28-Rom.8.30",
        text: [{ text: "So far are afflictions from " }, { text: "hindering", emphasis: true }],
      },
      attribution: calvin,
    },
    {
      value: {
        ref: "Rom.8.31",
        text: [{ text: "See [a link](https://evil.example) and <b>bold</b>." }],
      },
      attribution: { ...calvin, edition: "Second edition" },
    },
  ],
  resources: [
    { resourceId: "calvin-commentaries", coverage: "covered", status: { state: "active" } },
  ],
  datasetRelease: "2026.11.03-1",
  canonicalUrl: "https://example.org/romans/8/28",
  versificationNotes: [],
}

const decode = Schema.decodeUnknownResult(CommentaryEnvelope)

describe("result envelope", () => {
  it("decodes a commentary result", () => {
    expect(Result.isSuccess(decode(envelope))).toBe(true)
  })

  it("rejects an item without attribution", () => {
    const missing = { ...envelope, items: [{ value: envelope.items[0]?.value }] }
    expect(Result.isFailure(decode(missing))).toBe(true)
  })

  it("carries withdrawn status with its reason", () => {
    const withdrawn = {
      ...envelope,
      resources: [
        {
          resourceId: "calvin-commentaries",
          coverage: "covered",
          status: { state: "withdrawn", reason: "License evidence retracted" },
        },
      ],
    }
    expect(Result.isSuccess(decode(withdrawn))).toBe(true)
    const noReason = {
      ...envelope,
      resources: [
        { resourceId: "calvin-commentaries", coverage: "covered", status: { state: "withdrawn" } },
      ],
    }
    expect(Result.isFailure(decode(noReason))).toBe(true)
  })

  it("rejects a coverage state outside the known set", () => {
    const unknown = {
      ...envelope,
      resources: [
        { resourceId: "calvin-commentaries", coverage: "maybe", status: { state: "active" } },
      ],
    }
    expect(Result.isFailure(decode(unknown))).toBe(true)
  })
})

describe("renderText", () => {
  const render = (runs: ReadonlyArray<TextRun>) => runs.map((r) => r.text).join("")
  const decoded = decode(envelope)
  const text = Result.isSuccess(decoded)
    ? renderText(decoded.success, (item) => render(item.text))
    : ""

  it("names author, work, edition and license for every item", () => {
    for (const item of envelope.items) {
      expect(text).toContain(item.attribution.author)
      expect(text).toContain(item.attribution.work)
      expect(text).toContain(item.attribution.edition)
      expect(text).toContain(item.attribution.license)
    }
  })

  it("renders source text as quoted text with no active link or markup", () => {
    expect(text).not.toContain("](https://evil.example)")
    expect(text).not.toContain("<b>")
    expect(text).toMatch(/^> /m)
  })
})
