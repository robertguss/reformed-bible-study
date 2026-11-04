import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import { validateDataset } from "../../../dataset-tools/src/validate/validate.ts"
import { ContentNotFound } from "../../src/content-store/index.ts"
import {
  findConfessionArticles,
  getConfessionArticle,
  getConfessionOutline,
} from "../../src/capabilities/index.ts"
import type { Confession } from "../../src/index.ts"
import { call, FILES, fetchStore, ORIGIN, UNINGESTED_CONFESSION } from "./fixture.ts"

const repoRoot = join(import.meta.dirname, "../../../..")
const readJson = (path: string): unknown => JSON.parse(readFileSync(join(repoRoot, path), "utf8"))

describe("find_confession_articles", () => {
  it.effect("returns the Westminster articles citing Romans 8:28 with attribution", () =>
    Effect.gen(function* () {
      const result = yield* call(findConfessionArticles, { ref: "Romans 8:28" })
      const westminster = result.items.filter((item) =>
        ["wcf", "wlc", "wsc"].includes(item.value.confession),
      )
      expect(westminster.map((item) => item.value.citation)).toEqual([
        "WCF 3.6",
        "WCF 5.7",
        "WCF 20.1",
        "WLC Q45",
      ])
      const wcf = westminster[0]
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
      expect(westminster[3]?.attribution.resourceId).toBe("wlc")
    }),
  )

  it.effect("returns Heidelberg Question 1 among the articles citing Romans 8:28", () =>
    Effect.gen(function* () {
      const result = yield* call(findConfessionArticles, { ref: "Romans 8:28" })
      const heidelberg = result.items.filter((item) => item.value.confession === "hc")
      expect(heidelberg.map((item) => item.value.citation)).toEqual(["HC Q1", "HC Q26"])
      expect(heidelberg[0]?.value).toMatchObject({
        articleId: "Q1",
        division: "Lord's Day 1",
        citedVerses: ["Rom.8.28"],
        url: `${ORIGIN}/confessions/hc/1`,
      })
    }),
  )

  it.effect(
    "reports coverage per confession, with a catalogued but uningested one not_ingested",
    () =>
      Effect.gen(function* () {
        const result = yield* call(findConfessionArticles, { ref: "Romans 8:28" })
        const coverage = new Map(result.resources.map((r) => [r.resourceId, r.coverage]))
        expect(
          ["wcf", "wlc", "wsc", "hc", UNINGESTED_CONFESSION].map((id) => coverage.get(id)),
        ).toEqual(["covered", "covered", "no_entry", "covered", "not_ingested"])
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

  it.effect(
    "returns Heidelberg Question 1 with an attribution naming Schaff's 1877 text and the 1879 proofs",
    () =>
      Effect.gen(function* () {
        const result = yield* call(getConfessionArticle, { id: "hc", article: "1" })
        const item = result.items[0]
        expect(item?.value).toMatchObject({ articleId: "Q1", citation: "HC Q1" })
        expect(item?.value.proofs.flatMap((proof) => proof.refs.map((ref) => ref.osis))).toContain(
          "Rom.8.28",
        )
        expect(item?.attribution.license).toBe("CC-PDM-1.0")
        for (const edition of ["Schaff", "1877", "1879"])
          expect(item?.attribution.attributionText).toContain(edition)
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

  it.effect("lists the Heidelberg Catechism's 52 Lord's Days and 129 questions", () =>
    Effect.gen(function* () {
      const result = yield* call(getConfessionOutline, { id: "hc" })
      const divisions = result.items[0]?.value.divisions ?? []
      expect(divisions.map((division) => division.title)).toEqual(
        Array.from({ length: 52 }, (_, i) => `Lord's Day ${i + 1}`),
      )
      expect(
        divisions.flatMap((division) => division.articles.map((article) => article.id)),
      ).toEqual(Array.from({ length: 129 }, (_, i) => `Q${i + 1}`))
      expect(divisions[31]?.articles[0]).toMatchObject({ id: "Q86", citation: "HC Q86" })
    }),
  )
})

describe("the Heidelberg Catechism's proof texts and the license gate", () => {
  it("fails the reference rule for a proof text outside KJV versification", () => {
    const hc = readJson("dataset/confessions/hc/confession.json") as Confession
    const [first, ...rest] = hc.divisions
    // Malachi 3:19 exists in Hebrew numbering but not in the KJV, whose Malachi 3 ends at verse 18.
    const firstQuestion = { ...first!.articles[0]!, proofs: [{ refs: ["Mal.3.19"] }] }
    const bad = {
      ...hc,
      divisions: [{ ...first!, articles: [firstQuestion, ...first!.articles.slice(1)] }, ...rest],
    }
    const violations = validateDataset({
      files: [
        {
          path: "resources/hc/resource.json",
          text: JSON.stringify(readJson("dataset/resources/hc/resource.json")),
        },
        { path: "confessions/hc/confession.json", text: JSON.stringify(bad) },
      ],
      existingPaths: new Set(),
    })
    expect(violations.map((v) => [v.resourceId, v.rule, v.path, v.message])).toEqual([
      ["hc", "invalid-reference", "confessions/hc/confession.json", "Mal.3.19 (out_of_range)"],
    ])
  })
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
