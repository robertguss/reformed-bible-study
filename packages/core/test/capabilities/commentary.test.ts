import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import { getCommentary } from "../../src/capabilities/index.ts"
import type { CatalogResource } from "../../src/shards/index.ts"
import { CALVIN_ROMANS_8, call, FILES, fetchStore, RELEASE, WITHDRAWN_REASON } from "./fixture.ts"

const CALVIN = "calvin-commentaries"
const POOLE = "poole-annotations"
const OWEN = "owen-hebrews"

interface CatalogFile {
  readonly release: string
  readonly payload: { readonly resources: ReadonlyArray<CatalogResource> }
}

const catalogFile = (): CatalogFile =>
  JSON.parse(FILES.get("catalog.json") ?? "null") as CatalogFile

describe("get_commentary", () => {
  it.effect("returns the 8:28-30 section with its range for Calvin on Romans 8:29", () =>
    Effect.gen(function* () {
      const result = yield* call(getCommentary, { ref: "Rom 8:29", work: CALVIN })
      expect(result.items.map((item) => [item.value.ref, item.value.display])).toEqual([
        ["Rom.8.28-Rom.8.30", "Romans 8:28-30"],
      ])
      expect(result.items[0]?.attribution).toMatchObject({
        resourceId: CALVIN,
        author: "John Calvin",
        license: "CC-PDM-1.0",
      })
      expect(result.resources).toEqual([
        { resourceId: CALVIN, coverage: "covered", status: { state: "active" } },
      ])
    }),
  )

  it.effect("reports Genesis 1 as not yet ingested for Calvin", () =>
    Effect.gen(function* () {
      const result = yield* call(getCommentary, { ref: "Genesis 1", work: CALVIN })
      expect(result.items).toEqual([])
      expect(result.resources.map((r) => r.coverage)).toEqual(["not_ingested"])
    }),
  )

  it.effect("reports Revelation 1 as outside Calvin's work", () =>
    Effect.gen(function* () {
      const result = yield* call(getCommentary, { ref: "Revelation 1", work: CALVIN })
      expect(result.items).toEqual([])
      expect(result.resources.map((r) => r.coverage)).toEqual(["outside_work"])
    }),
  )

  it.effect("pages a request over the cap in whole sections, never cutting one", () =>
    Effect.gen(function* () {
      const pages: Array<ReadonlyArray<string>> = []
      const sections: Array<unknown> = []
      let cursor: string | undefined
      do {
        const result = yield* call(
          getCommentary,
          cursor === undefined
            ? { ref: "Romans 8", work: CALVIN }
            : { ref: "Romans 8", work: CALVIN, cursor },
        )
        pages.push(result.items.map((item) => item.value.ref))
        for (const item of result.items)
          sections.push({
            ref: item.value.ref,
            paragraphs: item.value.paragraphs,
            notes: item.value.notes,
          })
        cursor = result.cursor
      } while (cursor !== undefined && pages.length < 10)
      // Three sections, then one long section alone (two would pass 12,000 characters), then the rest.
      expect(pages).toEqual([
        ["Rom.7.24-Rom.8.1", "Rom.8.2-Rom.8.4", "Rom.8.5-Rom.8.11"],
        ["Rom.8.12-Rom.8.17"],
        ["Rom.8.18-Rom.8.27", "Rom.8.28-Rom.8.30", "Rom.8.31-Rom.8.39"],
      ])
      expect(sections).toEqual(CALVIN_ROMANS_8)
    }),
  )

  it.effect("returns a withdrawn work's status and reason with no content", () =>
    Effect.gen(function* () {
      const result = yield* call(getCommentary, { ref: "Rom 8:28", work: "withdrawn-commentary" })
      expect(result.items).toEqual([])
      expect(result.resources[0]?.status).toEqual({ state: "withdrawn", reason: WITHDRAWN_REASON })
    }),
  )

  it.effect("covers every catalogued commentary when no work is named", () =>
    Effect.gen(function* () {
      const result = yield* call(getCommentary, { ref: "Rom 8:29" })
      expect(result.resources.map((r) => [r.resourceId, r.coverage, r.status.state])).toEqual([
        [CALVIN, "covered", "active"],
        [POOLE, "not_ingested", "active"],
        [OWEN, "outside_work", "active"],
        ["withdrawn-commentary", "not_ingested", "withdrawn"],
      ])
    }),
  )

  it.effect(
    "lists works in the default commentary order when no work is named, then the rest by id",
    () =>
      Effect.gen(function* () {
        const catalog = catalogFile()
        const calvin = catalog.payload.resources.find(({ id }) => id === CALVIN)
        // Fallback commentators with nothing ingested, listed in an order unlike the default one.
        const unread = (id: string): CatalogResource => ({ ...calvin!, id, ingested: [] })
        const resources = [
          unread("aaa-commentary"),
          unread("jamieson-fausset-brown"),
          unread("matthew-henry"),
          ...catalog.payload.resources,
        ]
        const files = new Map(FILES).set(
          "catalog.json",
          JSON.stringify({ ...catalog, payload: { resources } }),
        )
        const result = yield* call(getCommentary, { ref: "Rom 8:29" }, fetchStore(files))
        expect(result.resources.map((r) => r.resourceId)).toEqual([
          CALVIN,
          POOLE,
          "matthew-henry",
          "jamieson-fausset-brown",
          "aaa-commentary",
          OWEN,
          "withdrawn-commentary",
        ])
        expect(result.items.map((item) => item.attribution.resourceId)).toEqual([CALVIN])
      }),
  )

  it.effect(
    "lists Poole first and shows his comment on Proverbs 3:5, a book Calvin did not write on",
    () =>
      Effect.gen(function* () {
        const catalog = catalogFile()
        const resources = catalog.payload.resources.map((resource) =>
          resource.id === POOLE
            ? { ...resource, ingested: [{ book: "Prov", chapters: [3] }] }
            : resource,
        )
        const section = {
          ref: "Prov.3.5",
          paragraphs: [
            [
              {
                text: "5. Trust in the LORD (k) with all thine heart, and lean not unto thine own understanding (l).",
              },
            ],
            [
              {
                text: "(k) Wholly and securely rely upon God's Promises and Providence for help and relief in all thine affairs and dangers.",
              },
            ],
          ],
          notes: [],
        }
        const files = new Map(FILES)
          .set("catalog.json", JSON.stringify({ ...catalog, payload: { resources } }))
          .set(
            "commentary/poole-annotations/Prov.3.json",
            JSON.stringify({
              release: RELEASE,
              payload: { resourceId: POOLE, book: "Prov", chapter: 3, sections: [section] },
            }),
          )
        const result = yield* call(getCommentary, { ref: "Proverbs 3:5" }, fetchStore(files))
        expect(result.resources.map((r) => [r.resourceId, r.coverage])).toEqual([
          [CALVIN, "outside_work"],
          [POOLE, "covered"],
          [OWEN, "outside_work"],
          ["withdrawn-commentary", "not_ingested"],
        ])
        expect(result.items.map((item) => [item.value.ref, item.value.paragraphs])).toEqual([
          ["Prov.3.5", section.paragraphs],
        ])
        expect(result.items[0]?.attribution).toMatchObject({
          resourceId: POOLE,
          author: "Matthew Poole and the divines who continued his work after Isaiah 58",
          license: "CC0-1.0",
        })
      }),
  )

  describe("Owen on Hebrews 6 to 10", () => {
    const section = {
      ref: "Heb.6.4-Heb.6.6",
      paragraphs: [
        [{ text: "Verse", emphasis: true }, { text: " 4, 5, 6." }],
        [{ text: "〈 in non-Latin alphabet 〉. " }, { text: "Impossibile enim,", emphasis: true }],
      ],
      notes: [],
    }
    // Owen's real record, with the chapters his volume covers ingested.
    const owenStore = () => {
      const catalog = catalogFile()
      const resources = catalog.payload.resources.map((resource) =>
        resource.id === OWEN
          ? { ...resource, ingested: [{ book: "Heb", chapters: [6, 7, 8, 9, 10] }] }
          : resource,
      )
      return fetchStore(
        new Map(FILES)
          .set("catalog.json", JSON.stringify({ ...catalog, payload: { resources } }))
          .set(
            "commentary/owen-hebrews/Heb.6.json",
            JSON.stringify({
              release: RELEASE,
              payload: { resourceId: OWEN, book: "Heb", chapter: 6, sections: [section] },
            }),
          ),
      )
    }

    it.effect("returns Owen's section on verses 4 to 6 for Hebrews 6:4", () =>
      Effect.gen(function* () {
        const result = yield* call(getCommentary, { ref: "Heb 6:4", work: OWEN }, owenStore())
        expect(result.items.map((item) => [item.value.ref, item.value.display])).toEqual([
          ["Heb.6.4-Heb.6.6", "Hebrews 6:4-6"],
        ])
        expect(result.items[0]?.value.paragraphs).toEqual(section.paragraphs)
        expect(result.items[0]?.attribution).toMatchObject({
          resourceId: OWEN,
          author: "John Owen",
          license: "CC0-1.0",
        })
        expect(result.resources.map((r) => r.coverage)).toEqual(["covered"])
      }),
    )

    it.effect("reports Hebrews 1:1 as not yet covered and Romans 1:1 as outside his work", () =>
      Effect.gen(function* () {
        const store = owenStore()
        const hebrews = yield* call(getCommentary, { ref: "Heb 1:1", work: OWEN }, store)
        const romans = yield* call(getCommentary, { ref: "Rom 1:1", work: OWEN }, store)
        expect([hebrews.items, romans.items]).toEqual([[], []])
        expect([hebrews, romans].map((result) => result.resources.map((r) => r.coverage))).toEqual([
          ["not_ingested"],
          ["outside_work"],
        ])
      }),
    )
  })
})
