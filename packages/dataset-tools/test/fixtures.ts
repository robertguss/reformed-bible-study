import type { DatasetFile } from "../src/validate/validate.ts"

/** A valid public-domain commentary record; tests override individual fields. */
export const commentaryRecord = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  id: "calvin-commentaries",
  kind: "commentary",
  title: "Commentary on the Epistle to the Romans",
  creator: "John Calvin",
  edition: "Calvin Translation Society, translated by John Owen, 1849",
  language: "en",
  scope: ["Rom"],
  source: {
    url: "https://www.crosswire.org/ftpmirror/pub/sword/packages/rawzip/CalvinCommentaries.zip",
    retrievedAt: "2026-11-03",
    files: [],
  },
  license: {
    spdx: "CC-PDM-1.0",
    evidence: [{ url: "https://www.ccel.org/ccel/calvin/calcom38.xml", quote: "Public Domain" }],
  },
  attribution: { text: "John Calvin, Commentary on Romans, tr. John Owen (1849). Public domain." },
  modifications: "Converted from OSIS to plain text runs.",
  surfaces: ["web", "api", "mcp", "dataset"],
  status: { state: "active" },
  ...overrides,
})

export const recordFile = (record: Record<string, unknown>): DatasetFile => ({
  path: `resources/${String(record["id"])}/resource.json`,
  text: JSON.stringify(record),
})

export const contentFile = (id: string, name: string, content: unknown): DatasetFile => ({
  path: `resources/${id}/${name}`,
  text: JSON.stringify(content),
})
