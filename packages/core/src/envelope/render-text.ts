import type { ResourceCoverage } from "./coverage.ts"
import type { Attribution, Envelope } from "./envelope.ts"

const MARKDOWN_SPECIALS = /[\\`*_{}[\]()<>#!|~]/g

/** Escapes text so a Markdown renderer shows it literally: no links, images, markup or headings. */
export const escapeMarkdown = (text: string): string =>
  text.replace(MARKDOWN_SPECIALS, (c) => `\\${c}`)

const quote = (text: string): string =>
  text
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n")

const credit = (a: Attribution): string =>
  [
    `— ${escapeMarkdown(a.author)}, ${escapeMarkdown(a.work)} (${escapeMarkdown(a.edition)}).`,
    `License: ${a.license}.`,
    a.attributionText === "" ? "" : escapeMarkdown(a.attributionText),
    `Source: ${a.sourceUrl}`,
  ]
    .filter((part) => part !== "")
    .join(" ")

const COVERAGE_TEXT: Readonly<Record<ResourceCoverage["coverage"], string>> = {
  covered: "",
  not_ingested: "this passage is not yet covered",
  outside_work: "this work does not cover this passage",
  no_entry: "this work has no entry for this passage",
}

const coverageLine = (r: ResourceCoverage): string => {
  if (r.status.state === "withdrawn")
    return `${r.resourceId}: withdrawn (${escapeMarkdown(r.status.reason)})`
  const text = COVERAGE_TEXT[r.coverage]
  return text === "" ? "" : `${r.resourceId}: ${text}`
}

/**
 * Markdown form of a result for clients that pass only text to a model. Source text is quoted and
 * escaped so it cannot render as links or markup, and every item carries its full credit line.
 */
export const renderText = <A>(envelope: Envelope<A>, renderItem: (value: A) => string): string => {
  const blocks = envelope.items.map(
    ({ value, attribution }) =>
      `${quote(escapeMarkdown(renderItem(value)))}\n${credit(attribution)}`,
  )
  const notes = envelope.resources.map(coverageLine).filter((line) => line !== "")
  if (notes.length > 0) blocks.push(notes.join("\n"))
  if (envelope.cursor !== undefined)
    blocks.push(`More results are available with cursor ${envelope.cursor}.`)
  blocks.push(`Dataset release ${envelope.datasetRelease}. Read online: ${envelope.canonicalUrl}`)
  return blocks.join("\n\n")
}
