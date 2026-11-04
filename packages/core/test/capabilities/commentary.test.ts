import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import { COMMENTARY_CHARACTER_CAP, getCommentary } from "../../src/capabilities/index.ts"
import type { CatalogResource } from "../../src/shards/index.ts"
import {
  CALVIN_ROMANS_8,
  call,
  FILES,
  fetchStore,
  filesWithChapter,
  RELEASE,
  WITHDRAWN_REASON,
} from "./fixture.ts"

const CALVIN = "calvin-commentaries"
const POOLE = "poole-annotations"
const HENRY = "matthew-henry"
const JFB = "jamieson-fausset-brown"
const OWEN = "owen-hebrews"
const BURROUGHS = "burroughs"
const DICKSON = "dickson"
const DIODATI = "diodati-annotations"
const DURHAM = "durham"
const FERGUSSON = "fergusson"
const HUTCHESON = "hutcheson"
const JACKSON = "jackson-annotations"
const LEIGHTON = "leighton"
const MANTON = "manton"
const NISBET = "nisbet"
const SIBBES = "sibbes"
const THOMAS_HALL = "thomas-hall"
const WESTMINSTER = "westminster-annotations"

interface CatalogFile {
  readonly release: string
  readonly payload: { readonly resources: ReadonlyArray<CatalogResource> }
}

const catalogFile = (): CatalogFile =>
  JSON.parse(FILES.get("catalog.json") ?? "null") as CatalogFile

const withChapter = (
  book: string,
  chapter: number,
  sections: Readonly<Record<string, ReadonlyArray<unknown>>>,
) => fetchStore(filesWithChapter(book, chapter, sections))

const comment = (ref: string, text: string) => ({ ref, paragraphs: [[{ text }]], notes: [] })

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

  it.effect(
    "reports Genesis 1 as outside Hutcheson's work on Job, the Minor Prophets and John",
    () =>
      Effect.gen(function* () {
        const result = yield* call(getCommentary, { ref: "Genesis 1", work: HUTCHESON })
        expect(result.items).toEqual([])
        expect(result.resources.map((r) => r.coverage)).toEqual(["outside_work"])
      }),
  )

  it.effect(
    "pages a request over the cap, splitting only a section longer than a page between paragraphs",
    () =>
      Effect.gen(function* () {
        const pages: Array<ReadonlyArray<string>> = []
        const characters: Array<number> = []
        const joined = new Map<
          string,
          { ref: string; paragraphs: Array<unknown>; notes: Array<unknown> }
        >()
        let cursor: string | undefined
        do {
          const result = yield* call(
            getCommentary,
            cursor === undefined
              ? { ref: "Romans 8", work: CALVIN }
              : { ref: "Romans 8", work: CALVIN, cursor },
          )
          pages.push(
            result.items.map(({ value }) =>
              value.part === undefined
                ? value.ref
                : `${value.ref} part ${value.part.index} of ${value.part.of}`,
            ),
          )
          characters.push(
            result.items
              .flatMap(({ value }) => [...value.paragraphs, ...value.notes].flat())
              .reduce((total, run) => total + run.text.length, 0),
          )
          for (const { value } of result.items) {
            const section = joined.get(value.ref) ?? { ref: value.ref, paragraphs: [], notes: [] }
            section.paragraphs.push(...value.paragraphs)
            section.notes.push(...value.notes)
            joined.set(value.ref, section)
          }
          cursor = result.cursor
        } while (cursor !== undefined && pages.length < 10)
        expect(pages).toEqual([
          ["Rom.7.24-Rom.8.1", "Rom.8.2-Rom.8.4", "Rom.8.5-Rom.8.11"],
          ["Rom.8.12-Rom.8.17 part 1 of 3"],
          ["Rom.8.12-Rom.8.17 part 2 of 3"],
          ["Rom.8.12-Rom.8.17 part 3 of 3"],
          ["Rom.8.18-Rom.8.27", "Rom.8.28-Rom.8.30", "Rom.8.31-Rom.8.39"],
        ])
        expect(characters.every((n) => n <= COMMENTARY_CHARACTER_CAP)).toBe(true)
        expect([...joined.values()]).toEqual(CALVIN_ROMANS_8)
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
        [HENRY, "not_ingested", "active"],
        [JFB, "not_ingested", "active"],
        [BURROUGHS, "outside_work", "active"],
        [DICKSON, "covered", "active"],
        [DIODATI, "not_ingested", "active"],
        [DURHAM, "outside_work", "active"],
        [FERGUSSON, "outside_work", "active"],
        [HUTCHESON, "outside_work", "active"],
        [JACKSON, "outside_work", "active"],
        [LEIGHTON, "outside_work", "active"],
        [MANTON, "outside_work", "active"],
        [NISBET, "outside_work", "active"],
        [OWEN, "outside_work", "active"],
        [SIBBES, "outside_work", "active"],
        [THOMAS_HALL, "outside_work", "active"],
        [WESTMINSTER, "not_ingested", "active"],
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
        // The catalog lists works by id, unlike the default order; this one sorts before them all.
        const unread = (id: string): CatalogResource => ({ ...calvin!, id, ingested: [] })
        const resources = [unread("aaa-commentary"), ...catalog.payload.resources]
        const files = new Map(FILES).set(
          "catalog.json",
          JSON.stringify({ ...catalog, payload: { resources } }),
        )
        const result = yield* call(getCommentary, { ref: "Rom 8:29" }, fetchStore(files))
        expect(result.resources.map((r) => r.resourceId)).toEqual([
          CALVIN,
          POOLE,
          HENRY,
          JFB,
          "aaa-commentary",
          BURROUGHS,
          DICKSON,
          DIODATI,
          DURHAM,
          FERGUSSON,
          HUTCHESON,
          JACKSON,
          LEIGHTON,
          MANTON,
          NISBET,
          OWEN,
          SIBBES,
          THOMAS_HALL,
          WESTMINSTER,
          "withdrawn-commentary",
        ])
        expect(result.items.map((item) => item.attribution.resourceId)).toEqual([CALVIN, DICKSON])
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
          [HENRY, "not_ingested"],
          [JFB, "not_ingested"],
          [BURROUGHS, "outside_work"],
          [DICKSON, "outside_work"],
          [DIODATI, "not_ingested"],
          [DURHAM, "outside_work"],
          [FERGUSSON, "outside_work"],
          [HUTCHESON, "outside_work"],
          [JACKSON, "not_ingested"],
          [LEIGHTON, "outside_work"],
          [MANTON, "outside_work"],
          [NISBET, "outside_work"],
          [OWEN, "outside_work"],
          [SIBBES, "outside_work"],
          [THOMAS_HALL, "outside_work"],
          [WESTMINSTER, "not_ingested"],
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

  it.effect("returns Henry's and Jamieson-Fausset-Brown's sections on Proverbs 3:5", () =>
    Effect.gen(function* () {
      const store = withChapter("Prov", 3, {
        [HENRY]: [
          comment("Prov.3.1-Prov.3.6", "We are here taught to live a life of communion with God."),
          comment("Prov.3.7-Prov.3.12", "Be not wise in thine own eyes."),
        ],
        [JFB]: [
          comment("Prov.3.4", '4. favour and good understanding--or, "success."'),
          comment(
            "Prov.3.5",
            "5. Trust ... heart--This is the center and marrow of true wisdom (Pr 22:19; 28:25).",
          ),
        ],
      })
      const result = yield* call(getCommentary, { ref: "Proverbs 3:5" }, store)
      expect(result.items.map((item) => [item.attribution.resourceId, item.value.ref])).toEqual([
        [HENRY, "Prov.3.1-Prov.3.6"],
        [JFB, "Prov.3.5"],
      ])
      expect(result.items.map((item) => item.attribution)).toMatchObject([
        {
          author:
            "Matthew Henry and the ministers who completed his exposition of the Epistles and Revelation after his death",
          work: "Matthew Henry's Complete Commentary on the Whole Bible",
          edition: expect.stringContaining("CrossWire SWORD module MHC version 2.2"),
          license: "CC-PDM-1.0",
        },
        {
          author: "Robert Jamieson, A. R. Fausset and David Brown",
          work: "Commentary Critical and Explanatory on the Whole Bible",
          edition: expect.stringContaining("CrossWire SWORD module JFB version 3.0"),
          license: "CC-PDM-1.0",
        },
      ])
    }),
  )

  it.effect("lists Calvin, Henry and Jamieson-Fausset-Brown as covering Ephesians 1:1", () =>
    Effect.gen(function* () {
      const store = withChapter("Eph", 1, {
        [CALVIN]: [comment("Eph.1.1-Eph.1.2", "Paul, an apostle.")],
        [HENRY]: [comment("Eph.1.1-Eph.1.2", "We have here the preface to the whole epistle.")],
        [JFB]: [comment("Eph.1.1", '1. by--rather, "through the will of God."')],
      })
      const result = yield* call(getCommentary, { ref: "Ephesians 1:1" }, store)
      expect(result.resources.map((r) => [r.resourceId, r.coverage])).toEqual([
        [CALVIN, "covered"],
        [POOLE, "not_ingested"],
        [HENRY, "covered"],
        [JFB, "covered"],
        [BURROUGHS, "outside_work"],
        [DICKSON, "outside_work"],
        [DIODATI, "not_ingested"],
        [DURHAM, "outside_work"],
        [FERGUSSON, "not_ingested"],
        [HUTCHESON, "outside_work"],
        [JACKSON, "outside_work"],
        [LEIGHTON, "outside_work"],
        [MANTON, "outside_work"],
        [NISBET, "outside_work"],
        [OWEN, "outside_work"],
        [SIBBES, "outside_work"],
        [THOMAS_HALL, "outside_work"],
        [WESTMINSTER, "not_ingested"],
        ["withdrawn-commentary", "not_ingested"],
      ])
      // Hodge has no source that declares a license, so no record ships for him.
      expect(JSON.stringify(result)).not.toMatch(/hodge/i)
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
