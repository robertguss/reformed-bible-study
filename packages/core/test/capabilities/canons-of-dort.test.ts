import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "@effect/vitest"
import { Effect, Schema } from "effect"
import { buildRelease } from "../../../dataset-tools/src/build/release.ts"
import {
  findConfessionArticles,
  getConfessionArticle,
  getConfessionOutline,
} from "../../src/capabilities/index.ts"
import { Confession, ResourceRecord } from "../../src/index.ts"
import { call, fetchStore, ORIGIN } from "./fixture.ts"

const repoRoot = join(import.meta.dirname, "../../../..")
const readJson = (path: string): unknown => JSON.parse(readFileSync(join(repoRoot, path), "utf8"))

/** A release of the real records and every transcribed confession, the Canons of Dort among them. */
const built = await Effect.runPromise(
  buildRelease(
    {
      records: readdirSync(join(repoRoot, "dataset/resources")).map((id) =>
        Schema.decodeUnknownSync(ResourceRecord)(readJson(`dataset/resources/${id}/resource.json`)),
      ),
      translations: [],
      commentaries: [],
      crossReferences: [],
      originals: [],
      lexicon: [],
      confessions: readdirSync(join(repoRoot, "dataset/confessions")).map((id) =>
        Schema.decodeUnknownSync(Confession)(readJson(`dataset/confessions/${id}/confession.json`)),
      ),
      corrections: [],
    },
    { date: "2026-11-04" },
  ),
)
const store = fetchStore(
  new Map([...built.files].map(([path, value]) => [path, JSON.stringify(value)])),
  built.release,
)

describe("the Canons of Dort", () => {
  it.effect("reads III-IV.1 back as the first article of the combined third and fourth head", () =>
    Effect.gen(function* () {
      const result = yield* call(getConfessionArticle, { id: "cd", article: "III-IV.1" }, store)
      const article = result.items[0]?.value
      expect(article).toMatchObject({
        confession: "cd",
        articleId: "III-IV.1",
        citation: "CD III-IV.1",
        label: "Article 1",
        division:
          "Third and Fourth Heads of Doctrine: Of the Corruption of Man, his Conversion to God, and the Manner thereof",
        url: `${ORIGIN}/confessions/cd/III-IV/1`,
      })
      expect(article?.paragraphs[0]?.[0]?.text).toMatch(
        /^Man was originally formed after the image of God\./,
      )
      expect(result.items[0]?.attribution).toMatchObject({
        resourceId: "cd",
        author: "Synod of Dort",
        license: "CC-PDM-1.0",
      })
    }),
  )

  it.effect("answers a Romans 3:19 lookup with the article that cites it", () =>
    Effect.gen(function* () {
      const result = yield* call(findConfessionArticles, { ref: "Romans 3:19" }, store)
      const dort = result.items.filter((item) => item.value.confession === "cd")
      expect(dort.map((item) => [item.value.citation, item.value.citedVerses])).toEqual([
        ["CD I.1", ["Rom.3.19"]],
      ])
      expect(result.resources.find((r) => r.resourceId === "cd")?.coverage).toBe("covered")
    }),
  )

  it.effect("reaches the Conclusion by its id and lists it last in the outline", () =>
    Effect.gen(function* () {
      const article = yield* call(getConfessionArticle, { id: "cd", article: "Conclusion" }, store)
      expect(article.items[0]?.value).toMatchObject({
        articleId: "Conclusion",
        citation: "CD Conclusion",
        url: `${ORIGIN}/confessions/cd/conclusion`,
      })
      const outline = (yield* call(getConfessionOutline, { id: "cd" }, store)).items[0]?.value
      expect(outline?.divisions.map((d) => [d.id, d.articles.length])).toEqual([
        ["I", 18],
        ["II", 9],
        ["III-IV", 17],
        ["V", 15],
        ["Conclusion", 1],
      ])
      expect(outline?.divisions.at(-1)?.articles[0]).toMatchObject({
        id: "Conclusion",
        citation: "CD Conclusion",
      })
    }),
  )
})
