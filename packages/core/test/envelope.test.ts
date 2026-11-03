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

  const renderOne = (
    source: string,
    extra: { readonly versificationNotes?: ReadonlyArray<string> } = {},
  ): string => {
    const decodedOne = decode({
      ...envelope,
      ...extra,
      items: [{ ...envelope.items[0], value: { ref: "Rom.8.28", text: [{ text: source }] } }],
    })
    return Result.isSuccess(decodedOne)
      ? renderText(decodedOne.success, (item) => render(item.text))
      : ""
  }

  const quotedLines = (rendered: string): ReadonlyArray<string> =>
    rendered.split("\n").filter((line) => line.startsWith(">"))

  it("breaks bare URLs in source text so Markdown renderers cannot autolink them", () => {
    const quoted = quotedLines(
      renderOne("Visit https://evil.example/path and www.evil.example now"),
    )
    for (const line of quoted) {
      expect(line).not.toMatch(/https?:\/\//)
      expect(line).not.toMatch(/\bwww\./)
    }
    expect(quoted.join("\n")).toContain("evil")
  })

  it("keeps every source line inside the quote, including lines split by a lone carriage return", () => {
    const rendered = renderOne("Grace\r\r# Heading\r---\r- item\r1. first")
    const quoted = quotedLines(rendered)
    expect(quoted.join("\n")).toContain("Heading")
    expect(rendered).not.toContain("\r")
    expect(rendered).not.toMatch(/^(?:#|---|- |1\. )/m)
    for (const line of quoted) expect(line).not.toMatch(/^> (?:#|-|=|\+|\d+[.)])/)
  })

  it("starts the credit line as its own paragraph after the quote", () => {
    expect(renderOne("Grace")).toMatch(/^> Grace\n\n— John Calvin/m)
  })

  it("wraps the source URL in angle brackets", () => {
    expect(renderOne("Grace")).toContain("Source: <https://www.ccel.org/ccel/calvin/calcom38.xml>")
  })

  it("includes versification notes", () => {
    expect(
      renderOne("Grace", {
        versificationNotes: ["Romans 16:25-27 follows 14:23 in some editions."],
      }),
    ).toContain("Versification note: Romans 16:25-27 follows 14:23 in some editions.")
  })
})

describe("Attribution", () => {
  it("rejects a source URL that carries Markdown", () => {
    const decodeAttribution = Schema.decodeUnknownResult(Attribution)
    expect(Result.isSuccess(decodeAttribution(calvin))).toBe(true)
    expect(
      Result.isFailure(
        decodeAttribution({
          ...calvin,
          sourceUrl: "https://example.org/ [Click](https://evil.example)",
        }),
      ),
    ).toBe(true)
  })
})
