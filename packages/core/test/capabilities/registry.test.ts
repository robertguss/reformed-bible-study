import { describe, expect, it } from "@effect/vitest"
import { capabilities } from "../../src/capabilities/index.ts"

describe("capability registry", () => {
  it("lists all ten capabilities in a stable order", () => {
    expect(capabilities.map((c) => c.contract.name)).toEqual([
      "list_resources",
      "resolve_reference",
      "get_passage",
      "get_commentary",
      "find_confession_articles",
      "get_confession_article",
      "get_confession_outline",
      "get_cross_references",
      "get_verse_words",
      "get_lexicon_entry",
    ])
  })

  it("marks every capability read-only and idempotent, served by GET under /v1", () => {
    for (const { contract } of capabilities) {
      expect(contract.annotations).toMatchObject({
        readOnly: true,
        idempotent: true,
        destructive: false,
      })
      expect(contract.http?.method).toBe("GET")
      expect(contract.http?.path.startsWith("/v1/")).toBe(true)
    }
  })
})
