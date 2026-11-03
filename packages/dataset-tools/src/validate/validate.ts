import {
  ALLOWED_LICENSES,
  ATTRIBUTION_REQUIRED,
  compareVerse,
  hasUnsafeCharacters,
  overlaps,
  parseOsis,
  ResourceRecord,
  toOsis,
  type Passage,
} from "@reformed-bible/core"
import { Result, Schema } from "effect"
import { Rules, type Rule } from "./rules.ts"

/** A file in the dataset, with its path relative to the dataset root. */
export interface DatasetFile {
  readonly path: string
  readonly text: string
}

export interface DatasetSnapshot {
  readonly files: ReadonlyArray<DatasetFile>
  readonly existingPaths: ReadonlySet<string>
  /** SHA-256 of each source download already in the local cache, keyed by URL. */
  readonly sourceHashes?: ReadonlyMap<string, string>
}

export interface Violation {
  readonly resourceId: string
  readonly rule: Rule
  readonly path: string
  readonly message: string
}

const CONTENT_ROOTS = new Set(["resources", "confessions"])
const RECORD_FILE = "resource.json"

const ownerOf = (path: string): string | undefined => {
  const [root, id] = path.split("/")
  return root !== undefined && CONTENT_ROOTS.has(root) && id !== undefined ? id : undefined
}

const recordPath = (id: string): string => `resources/${id}/${RECORD_FILE}`

const decodeRecord = Schema.decodeUnknownResult(ResourceRecord)

interface FoundRef {
  readonly key: "ref" | "refs"
  readonly value: string
}

// A ref that is not a string (or a refs list that is not all strings) is recorded as its JSON text,
// which parseOsis then rejects, so a malformed reference can never skip the check.
const collectRefs = (node: unknown, into: Array<FoundRef>): void => {
  if (Array.isArray(node)) {
    for (const child of node) collectRefs(child, into)
    return
  }
  if (node === null || typeof node !== "object") return
  for (const [key, value] of Object.entries(node)) {
    if (key === "ref")
      into.push({ key, value: typeof value === "string" ? value : JSON.stringify(value) })
    else if (key === "refs") {
      const refs: ReadonlyArray<unknown> = Array.isArray(value) ? value : [value]
      for (const ref of refs)
        into.push({ key, value: typeof ref === "string" ? ref : JSON.stringify(ref) })
    } else collectRefs(value, into)
  }
}

const hasUnsafeString = (node: unknown): boolean => {
  if (typeof node === "string") return hasUnsafeCharacters(node)
  if (Array.isArray(node)) return node.some(hasUnsafeString)
  if (node === null || typeof node !== "object") return false
  return Object.entries(node).some(
    ([key, value]) => hasUnsafeCharacters(key) || hasUnsafeString(value),
  )
}

const checkRecord = (
  id: string,
  file: DatasetFile,
  snapshot: DatasetSnapshot,
): {
  readonly violations: ReadonlyArray<Violation>
  readonly record: ResourceRecord | undefined
} => {
  const violations: Array<Violation> = []
  const add = (rule: Rule, message: string) =>
    violations.push({ resourceId: id, rule, path: file.path, message })
  let json: unknown
  try {
    json = JSON.parse(file.text)
  } catch {
    add("invalid-json", "resource.json is not valid JSON")
    return { violations, record: undefined }
  }
  const decoded = decodeRecord(json)
  if (Result.isFailure(decoded)) {
    add("record-schema", decoded.failure.message)
    return { violations, record: undefined }
  }
  const record = decoded.success
  if (record.id !== id)
    add("record-schema", `record id "${record.id}" does not match its directory "${id}"`)
  if (record.permission !== undefined && !snapshot.existingPaths.has(record.permission)) {
    add("permission-missing", `permission file ${record.permission} is not in the dataset`)
  }
  if (!ALLOWED_LICENSES.has(record.license.spdx) && record.permission === undefined) {
    add("license-not-allowed", `${record.license.spdx} needs a written permission record`)
  }
  if (ATTRIBUTION_REQUIRED.has(record.license.spdx) && record.attribution.text.trim() === "") {
    add("attribution-required", `${record.license.spdx} requires attribution text`)
  }
  for (const source of record.source.files) {
    const actual = snapshot.sourceHashes?.get(source.url)
    if (actual !== undefined && actual !== source.sha256) {
      add("source-hash-mismatch", `${source.url} hashes to ${actual}, pinned ${source.sha256}`)
    }
  }
  return { violations, record }
}

const checkContent = (
  id: string,
  file: DatasetFile,
): {
  readonly violations: ReadonlyArray<Violation>
  readonly sections: ReadonlyArray<Passage>
} => {
  const violations: Array<Violation> = []
  const sections: Array<Passage> = []
  const add = (rule: Rule, message: string) =>
    violations.push({ resourceId: id, rule, path: file.path, message })
  const unsafeRaw = hasUnsafeCharacters(file.text)
  if (unsafeRaw) add("unsafe-text", Rules["unsafe-text"])
  if (!file.path.endsWith(".json")) return { violations, sections }
  let json: unknown
  try {
    json = JSON.parse(file.text)
  } catch {
    add("invalid-json", `${file.path} is not valid JSON`)
    return { violations, sections }
  }
  // JSON escapes such as \u202e hide unsafe characters from the raw-text check.
  if (!unsafeRaw && hasUnsafeString(json)) add("unsafe-text", Rules["unsafe-text"])
  const refs: Array<FoundRef> = []
  collectRefs(json, refs)
  for (const ref of refs) {
    const parsed = parseOsis(ref.value)
    if (Result.isFailure(parsed))
      add("invalid-reference", `${ref.value} (${parsed.failure.reason})`)
    else if (ref.key === "ref") sections.push(parsed.success)
  }
  return { violations, sections }
}

const findOverlaps = (
  id: string,
  path: string,
  sections: ReadonlyArray<Passage>,
): ReadonlyArray<Violation> => {
  const sorted = sections.toSorted((a, b) => compareVerse(a.start, b.start))
  const violations: Array<Violation> = []
  for (let i = 1; i < sorted.length; i++) {
    const previous = sorted[i - 1]
    const current = sorted[i]
    if (previous !== undefined && current !== undefined && overlaps(previous, current)) {
      violations.push({
        resourceId: id,
        rule: "overlapping-ranges",
        path,
        message: `${toOsis(previous)} overlaps ${toOsis(current)}`,
      })
    }
  }
  return violations
}

export const validateDataset = (snapshot: DatasetSnapshot): ReadonlyArray<Violation> => {
  const violations: Array<Violation> = []
  const records = new Map<string, ResourceRecord | undefined>()
  const sectionsByResource = new Map<string, Array<Passage>>()

  for (const file of snapshot.files) {
    const id = ownerOf(file.path)
    if (id === undefined || file.path !== recordPath(id)) continue
    const checked = checkRecord(id, file, snapshot)
    violations.push(...checked.violations)
    records.set(id, checked.record)
  }

  for (const file of snapshot.files) {
    const id = ownerOf(file.path)
    if (id === undefined || file.path === recordPath(id)) continue
    if (!records.has(id)) {
      violations.push({
        resourceId: id,
        rule: "missing-record",
        path: file.path,
        message: `no ${recordPath(id)}`,
      })
      continue
    }
    const checked = checkContent(id, file)
    violations.push(...checked.violations)
    const sections = sectionsByResource.get(id) ?? []
    sections.push(...checked.sections)
    sectionsByResource.set(id, sections)
  }

  for (const [id, sections] of sectionsByResource) {
    if (records.get(id)?.kind === "commentary")
      violations.push(...findOverlaps(id, recordPath(id), sections))
  }
  return violations
}

export const renderJson = (violations: ReadonlyArray<Violation>): string =>
  JSON.stringify({ ok: violations.length === 0, violations }, null, 2)

export const renderReport = (violations: ReadonlyArray<Violation>): string =>
  violations.length === 0
    ? "Dataset passes the license gate."
    : [
        `Dataset fails the license gate with ${violations.length} problem(s):`,
        ...violations.map((v) => `- ${v.resourceId} [${v.rule}] ${v.path}: ${v.message}`),
      ].join("\n")
