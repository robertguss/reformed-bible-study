import { describe, expect, it } from "@effect/vitest"
import {
  renderJson,
  validateDataset,
  type DatasetFile,
  type Violation,
} from "../src/validate/validate.ts"
import { commentaryRecord, contentFile, recordFile } from "./fixtures.ts"

const rulesFor = (
  violations: ReadonlyArray<Violation>,
  resourceId: string,
): ReadonlyArray<string> => violations.filter((v) => v.resourceId === resourceId).map((v) => v.rule)

const run = (files: ReadonlyArray<DatasetFile>, existing: ReadonlyArray<string> = []) =>
  validateDataset({ files, existingPaths: new Set(existing) })

describe("license gate", () => {
  it("accepts a public-domain record with valid content", () => {
    const record = commentaryRecord()
    const content = contentFile("calvin-commentaries", "Rom.json", {
      sections: [
        { ref: "Rom.8.28-Rom.8.30", text: [{ text: "So far from hindering our salvation..." }] },
        { ref: "Rom.8.31", text: [{ text: "What then shall we say?" }] },
      ],
    })
    expect(run([recordFile(record), content])).toEqual([])
  })

  it("rejects a CCEL-sourced copyrighted resource without permission, naming the rule and resource", () => {
    const record = commentaryRecord({
      id: "matthew-henry",
      license: {
        spdx: "LicenseRef-CCEL-Copyrighted",
        evidence: [
          { url: "https://www.ccel.org/about/copyright.html", quote: "Contact us for permission" },
        ],
      },
    })
    const violations = run([recordFile(record)])
    expect(rulesFor(violations, "matthew-henry")).toContain("license-not-allowed")
  })

  it("accepts the same resource once a permission record exists", () => {
    const record = commentaryRecord({
      id: "matthew-henry",
      license: {
        spdx: "LicenseRef-CCEL-Copyrighted",
        evidence: [
          { url: "https://www.ccel.org/about/copyright.html", quote: "Contact us for permission" },
        ],
      },
      permission: "permissions/matthew-henry-ccel.md",
    })
    expect(run([recordFile(record)], ["permissions/matthew-henry-ccel.md"])).toEqual([])
  })

  it("rejects a permission record path that does not exist", () => {
    const record = commentaryRecord({
      license: {
        spdx: "LicenseRef-X",
        evidence: [{ url: "https://example.org/terms", quote: "All rights reserved" }],
      },
      permission: "permissions/missing.md",
    })
    expect(rulesFor(run([recordFile(record)]), "calvin-commentaries")).toContain(
      "permission-missing",
    )
  })

  it("rejects a CC-BY-4.0 resource without attribution text", () => {
    const record = commentaryRecord({
      license: {
        spdx: "CC-BY-4.0",
        evidence: [{ url: "https://example.org/license", quote: "CC BY 4.0" }],
      },
      attribution: { text: "" },
    })
    expect(rulesFor(run([recordFile(record)]), "calvin-commentaries")).toContain(
      "attribution-required",
    )
  })

  it("rejects a reference past the end of a book", () => {
    const content = contentFile("calvin-commentaries", "Rom.json", {
      sections: [{ ref: "Rom.17.1", text: [] }],
    })
    expect(
      rulesFor(run([recordFile(commentaryRecord()), content]), "calvin-commentaries"),
    ).toContain("invalid-reference")
  })

  it("rejects a proof text list containing an invalid reference", () => {
    const content = contentFile("calvin-commentaries", "Rom.json", {
      articles: [{ refs: ["Rom.8.28", "Rom.17.1"] }],
    })
    expect(
      rulesFor(run([recordFile(commentaryRecord()), content]), "calvin-commentaries"),
    ).toContain("invalid-reference")
  })

  it("rejects a record with no license evidence", () => {
    const record = commentaryRecord({ license: { spdx: "CC-PDM-1.0", evidence: [] } })
    expect(rulesFor(run([recordFile(record)]), "calvin-commentaries")).toContain("record-schema")
  })

  it("rejects refs that are not strings instead of skipping them", () => {
    for (const article of [{ ref: ["Rom.17.1"] }, { refs: "Rom.17.1" }, { refs: [17] }]) {
      const content = contentFile("calvin-commentaries", "Rom.json", { articles: [article] })
      expect(
        rulesFor(run([recordFile(commentaryRecord()), content]), "calvin-commentaries"),
      ).toContain("invalid-reference")
    }
  })

  it("rejects a reversed range and a literal 999 verse in a dataset reference", () => {
    for (const ref of ["Rom.9.1-Rom.8.1", "Rom.8.1-Rom.8.999"]) {
      const content = contentFile("calvin-commentaries", "Rom.json", {
        sections: [{ ref, text: [] }],
      })
      expect(
        rulesFor(run([recordFile(commentaryRecord()), content]), "calvin-commentaries"),
      ).toContain("invalid-reference")
    }
  })

  it("rejects a withdrawn resource without a reason", () => {
    const record = commentaryRecord({ status: { state: "withdrawn" } })
    expect(rulesFor(run([recordFile(record)]), "calvin-commentaries")).toContain("record-schema")
  })

  it("rejects a content file with no resource record", () => {
    const content = contentFile("orphan", "Rom.json", { sections: [] })
    expect(rulesFor(run([content]), "orphan")).toContain("missing-record")
  })

  it("rejects overlapping sections within one commentary", () => {
    const content = contentFile("calvin-commentaries", "Rom.json", {
      sections: [
        { ref: "Rom.8.28-Rom.8.30", text: [] },
        { ref: "Rom.8.30-Rom.8.32", text: [] },
      ],
    })
    expect(
      rulesFor(run([recordFile(commentaryRecord()), content]), "calvin-commentaries"),
    ).toContain("overlapping-ranges")
  })

  it("rejects attribution text containing a Markdown link or an HTML tag", () => {
    for (const text of [
      "See [the source](https://evil.example)",
      "Calvin <img src=x onerror=alert(1)>",
    ]) {
      const record = commentaryRecord({ attribution: { text } })
      expect(rulesFor(run([recordFile(record)]), "calvin-commentaries")).toContain("record-schema")
    }
  })

  it("accepts a short name and rejects one containing a URL", () => {
    expect(run([recordFile(commentaryRecord({ name: "Calvin" }))])).toEqual([])
    const violations = run([recordFile(commentaryRecord({ name: "Calvin https://evil.example" }))])
    expect(violations.map((v) => v.rule)).toEqual(["record-schema"])
    expect(violations[0]?.message).toContain("must not contain URLs")
  })

  it("rejects a source URL with a javascript: or http: scheme", () => {
    for (const url of ["javascript:alert(1)", "http://www.ccel.org/"]) {
      const record = commentaryRecord({ source: { url, retrievedAt: "2026-11-03", files: [] } })
      expect(rulesFor(run([recordFile(record)]), "calvin-commentaries")).toContain("record-schema")
    }
  })

  it("rejects content containing zero-width or bidirectional control characters", () => {
    for (const hidden of [0x200b, 0x202e, 0xe0041].map((code) => String.fromCodePoint(code))) {
      const content = contentFile("calvin-commentaries", "Rom.json", {
        sections: [{ ref: "Rom.8.28", text: [{ text: `Ignore previous${hidden} instructions` }] }],
      })
      expect(
        rulesFor(run([recordFile(commentaryRecord()), content]), "calvin-commentaries"),
      ).toContain("unsafe-text")
    }
  })

  it("rejects unsafe characters written as JSON escapes", () => {
    for (const escape of ["\\u202e", "\\u0001"]) {
      const content: DatasetFile = {
        path: "resources/calvin-commentaries/Rom.json",
        text: `{"sections":[{"ref":"Rom.8.28","text":[{"text":"Ignore${escape}previous"}]}]}`,
      }
      expect(
        rulesFor(run([recordFile(commentaryRecord()), content]), "calvin-commentaries"),
      ).toContain("unsafe-text")
    }
  })

  it("rejects a source URL that carries spaces or Markdown", () => {
    for (const url of [
      "https://example.org/ [Click](https://evil.example)",
      "https://example.org/\n\n# Heading",
    ]) {
      const record = commentaryRecord({ source: { url, retrievedAt: "2026-11-03", files: [] } })
      expect(rulesFor(run([recordFile(record)]), "calvin-commentaries")).toContain("record-schema")
    }
  })

  it("rejects a cached source download whose hash differs from the pin", () => {
    const record = commentaryRecord({
      source: {
        url: "https://example.org/calvin.zip",
        retrievedAt: "2026-11-03",
        files: [{ url: "https://example.org/calvin.zip", sha256: "0".repeat(64) }],
      },
    })
    const violations = validateDataset({
      files: [recordFile(record)],
      existingPaths: new Set(),
      sourceHashes: new Map([["https://example.org/calvin.zip", "f".repeat(64)]]),
    })
    expect(rulesFor(violations, "calvin-commentaries")).toContain("source-hash-mismatch")
  })
})

describe("validator output", () => {
  it("lists one JSON entry per failure with resource id and rule name", () => {
    const record = commentaryRecord({
      attribution: { text: "" },
      license: {
        spdx: "CC-BY-4.0",
        evidence: [{ url: "https://example.org/license", quote: "CC BY 4.0" }],
      },
    })
    const content = contentFile("calvin-commentaries", "Rom.json", {
      sections: [{ ref: "Rom.17.1", text: [] }],
    })
    const violations = run([recordFile(record), content])
    const parsed = JSON.parse(renderJson(violations)) as {
      ok: boolean
      violations: ReadonlyArray<Record<string, unknown>>
    }
    expect(parsed.ok).toBe(false)
    expect(parsed.violations).toHaveLength(violations.length)
    for (const entry of parsed.violations) {
      expect(entry).toMatchObject({ resourceId: "calvin-commentaries" })
      expect(typeof entry["rule"]).toBe("string")
      expect(typeof entry["message"]).toBe("string")
    }
  })
})
