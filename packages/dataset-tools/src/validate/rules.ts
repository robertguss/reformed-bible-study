export const Rules = {
  "missing-record": "Content exists for a resource that has no resource.json record.",
  "record-schema": "The resource record does not match the required shape or text rules.",
  "license-not-allowed":
    "The license is outside the allowlist and no written permission is recorded.",
  "permission-missing": "The record names a permission file that does not exist in the dataset.",
  "attribution-required":
    "The license requires attribution but the record has no attribution text.",
  "invalid-json": "A content file is not valid JSON.",
  "invalid-reference": "A reference does not exist under KJV versification.",
  "overlapping-ranges": "Two sections of one commentary cover the same verse.",
  "unsafe-text": "Content contains invisible or bidirectional control characters.",
  "source-hash-mismatch": "A downloaded source file does not match its pinned SHA-256 hash.",
} as const

export type Rule = keyof typeof Rules
