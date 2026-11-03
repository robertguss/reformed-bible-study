import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { describe, expect, it } from "@effect/vitest"
import { Confession } from "@reformed-bible/core"
import { Effect, Exit, Result, Schema } from "effect"
import { indexProofTexts, ingestConfessions } from "../../src/ingest/confession.ts"
import { readNormalized } from "../../src/normalized.ts"
import { validateDataset } from "../../src/validate/validate.ts"

const REPO_ROOT = resolve(import.meta.dirname, "../../../..")

const sample: Confession = {
  resourceId: "wsc",
  abbreviation: "WSC",
  title: "The Shorter Catechism",
  divisions: [
    {
      id: "questions",
      title: "Questions and Answers",
      articles: [
        {
          id: "Q1",
          label: "Question 1",
          question: [{ text: "What is the chief end of man?" }],
          paragraphs: [[{ text: "Man's chief end is to glorify God, and to enjoy him for ever." }]],
          proofs: [
            { label: "a", refs: ["1Cor.10.31", "Rom.11.36"] },
            { label: "b", refs: ["Ps.73.25-Ps.73.28"] },
          ],
        },
        {
          id: "Q2",
          label: "Question 2",
          question: [
            { text: "What rule hath God given to direct us how we may glorify and enjoy him?" },
          ],
          paragraphs: [[{ text: "The word of God..." }]],
          proofs: [{ refs: ["Ps.73.28-Ps.74.1"] }],
        },
      ],
    },
  ],
}

const fixtureRepo = (confessions: Readonly<Record<string, unknown>>): string => {
  const root = mkdtempSync(join(tmpdir(), "confessions-"))
  for (const [id, content] of Object.entries(confessions)) {
    mkdirSync(join(root, "dataset/confessions", id), { recursive: true })
    writeFileSync(join(root, "dataset/confessions", id, "confession.json"), JSON.stringify(content))
  }
  return root
}

const datasetConfession = (id: string): Confession =>
  Schema.decodeUnknownSync(Confession)(
    JSON.parse(readFileSync(join(REPO_ROOT, "dataset/confessions", id, "confession.json"), "utf8")),
  )

describe("ingestConfessions", () => {
  it.effect("writes each curated confession to normalized output unchanged", () =>
    Effect.gen(function* () {
      const root = fixtureRepo({ wsc: sample })
      const written = yield* ingestConfessions(root)
      expect(written).toEqual([{ resourceId: "wsc", articles: 2 }])
      const read = yield* readNormalized(root, "wsc", "confession.json", Confession)
      expect(read).toEqual(sample)
    }),
  )

  it.effect("refuses a confession filed under another resource's directory", () =>
    Effect.gen(function* () {
      const root = fixtureRepo({ wlc: sample })
      const exit = yield* Effect.exit(ingestConfessions(root))
      expect(Exit.isFailure(exit)).toBe(true)
    }),
  )
})

describe("indexProofTexts", () => {
  it("indexes a proof text recorded as a range under every verse it covers", () => {
    const index = Result.getOrThrow(indexProofTexts(sample))
    for (const verse of ["Ps.73.25", "Ps.73.26", "Ps.73.27"])
      expect(index.get(verse)).toEqual(["Q1"])
    expect(index.get("Ps.73.28")).toEqual(["Q1", "Q2"])
    expect(index.get("Ps.74.1")).toEqual(["Q2"])
    expect(index.get("Ps.73.24")).toBeUndefined()
    expect(index.get("Rom.11.36")).toEqual(["Q1"])
  })
})

describe("confession proof texts and the license gate", () => {
  it("fails the reference rule for a proof text citing a verse that does not exist", () => {
    const record = JSON.parse(
      readFileSync(join(REPO_ROOT, "dataset/resources/wsc/resource.json"), "utf8"),
    ) as unknown
    const bad = {
      ...sample,
      divisions: [
        {
          ...sample.divisions[0],
          articles: [{ ...sample.divisions[0]!.articles[0]!, proofs: [{ refs: ["Rom.8.40"] }] }],
        },
      ],
    }
    const violations = validateDataset({
      files: [
        { path: "resources/wsc/resource.json", text: JSON.stringify(record) },
        { path: "confessions/wsc/confession.json", text: JSON.stringify(bad) },
      ],
      existingPaths: new Set(),
    })
    expect(violations.map((v) => [v.resourceId, v.rule, v.path])).toEqual([
      ["wsc", "invalid-reference", "confessions/wsc/confession.json"],
    ])
  })
})

describe("the transcribed Westminster Standards", () => {
  it("outlines the Westminster Confession with all 33 chapter titles of the 1647 print", () => {
    const wcf = datasetConfession("wcf")
    expect(wcf.divisions.map((d) => d.title)).toEqual([
      "Of the Holy Scripture",
      "Of God, and of the Holy Trinity",
      "Of God's Eternal Decree",
      "Of Creation",
      "Of Providence",
      "Of the Fall of Man, of Sin, and of the Punishment thereof",
      "Of God's Covenant with Man",
      "Of Christ the Mediator",
      "Of Free-will",
      "Of Effectual Calling",
      "Of Justification",
      "Of Adoption",
      "Of Sanctification",
      "Of Saving Faith",
      "Of Repentance unto Life",
      "Of Good Works",
      "Of the Perseverance of the Saints",
      "Of the Assurance of Grace and Salvation",
      "Of the Law of God",
      "Of Christian Liberty, and Liberty of Conscience",
      "Of Religious Worship and the Sabbath-day",
      "Of Lawful Oaths and Vows",
      "Of the Civil Magistrate",
      "Of Marriage and Divorce",
      "Of the Church",
      "Of the Communion of Saints",
      "Of the Sacraments",
      "Of Baptism",
      "Of the Lord's Supper",
      "Of Church Censures",
      "Of Synods and Councils",
      "Of the State of Men after Death, and of the Resurrection of the Dead",
      "Of the Last Judgment",
    ])
    expect(wcf.divisions.flatMap((d) => d.articles).length).toBe(172)
  })

  it("numbers the Larger Catechism's 196 questions and the Shorter Catechism's 107", () => {
    const ids = (id: string) =>
      datasetConfession(id).divisions.flatMap((d) => d.articles.map((a) => a.id))
    expect(ids("wlc")).toEqual(Array.from({ length: 196 }, (_, i) => `Q${i + 1}`))
    expect(ids("wsc")).toEqual(Array.from({ length: 107 }, (_, i) => `Q${i + 1}`))
  })
})
