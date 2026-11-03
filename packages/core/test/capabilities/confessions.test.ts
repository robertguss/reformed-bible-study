import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import { ContentNotFound } from "../../src/content-store/index.ts"
import {
  findConfessionArticles,
  getConfessionArticle,
  getConfessionOutline,
} from "../../src/capabilities/index.ts"
import { call, FILES, fetchStore, ORIGIN } from "./fixture.ts"

describe("find_confession_articles", () => {
  it.effect("returns the Westminster articles citing Romans 8:28 with attribution", () =>
    Effect.gen(function* () {
      const result = yield* call(findConfessionArticles, { ref: "Romans 8:28" })
      expect(result.items.map((item) => item.value.citation)).toEqual([
        "WCF 3.6",
        "WCF 5.7",
        "WCF 20.1",
        "WLC Q45",
      ])
      const wcf = result.items[0]
      expect(wcf?.value).toMatchObject({
        confession: "wcf",
        articleId: "3.6",
        citedVerses: ["Rom.8.28"],
        url: `${ORIGIN}/confessions/wcf/3/6`,
      })
      expect(wcf?.value.paragraphs.length).toBeGreaterThan(0)
      expect(wcf?.attribution).toMatchObject({
        resourceId: "wcf",
        author: "Westminster Assembly of Divines",
        work: "The Westminster Confession of Faith",
        license: "CC-PDM-1.0",
      })
      expect(result.items[3]?.attribution.resourceId).toBe("wlc")
    }),
  )

  it.effect(
    "reports coverage per confession, with a catalogued but uningested one not_ingested",
    () =>
      Effect.gen(function* () {
        const result = yield* call(findConfessionArticles, { ref: "Romans 8:28" })
        expect(result.resources.map((r) => [r.resourceId, r.coverage])).toEqual([
          ["wcf", "covered"],
          ["wlc", "covered"],
          ["wsc", "no_entry"],
          ["hc", "not_ingested"],
        ])
      }),
  )
})

describe("get_confession_article", () => {
  it.effect("returns WCF 3.6 with its proof texts", () =>
    Effect.gen(function* () {
      const result = yield* call(getConfessionArticle, { id: "wcf", article: "3.6" })
      const article = result.items[0]?.value
      expect(article).toMatchObject({ confession: "wcf", articleId: "3.6", citation: "WCF 3.6" })
      expect(article?.proofs.flatMap((proof) => proof.refs.map((ref) => ref.osis))).toContain(
        "Rom.8.30",
      )
      expect(result.canonicalUrl).toBe(`${ORIGIN}/confessions/wcf/3/6`)
    }),
  )

  it.effect("fails with a typed not-found error for an article the confession lacks", () =>
    Effect.gen(function* () {
      const error = yield* call(getConfessionArticle, { id: "wcf", article: "3.99" }).pipe(
        Effect.flip,
      )
      expect(error).toMatchObject({ _tag: "EntryNotFound", resourceId: "wcf", entry: "WCF 3.99" })
    }),
  )
})

describe("get_confession_outline", () => {
  it.effect("lists all 33 chapter titles of the Westminster Confession", () =>
    Effect.gen(function* () {
      const result = yield* call(getConfessionOutline, { id: "wcf" })
      const outline = result.items[0]?.value
      expect(outline?.divisions).toHaveLength(33)
      expect(outline?.divisions[2]?.title).toBe("Of God's Eternal Decree")
      expect(outline?.divisions[2]?.articles[5]).toMatchObject({ id: "3.6", citation: "WCF 3.6" })
    }),
  )
})

describe("a confession file missing from a deploy", () => {
  const withoutWcf = new Map([...FILES].filter(([path]) => path !== "confessions/wcf.json"))

  it.effect(
    "is a content error, not a coverage state, when the catalog says the confession is available",
    () =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(
          call(findConfessionArticles, { ref: "Romans 8:28" }, fetchStore(withoutWcf)),
        )
        expect(error).toBeInstanceOf(ContentNotFound)
      }),
  )
})
