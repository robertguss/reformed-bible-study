import { type CatalogResource, type ContentStore, Site } from "@reformed-bible/core"
import { layerFetch } from "@reformed-bible/core/content-store/fetch"
import { Effect, Layer } from "effect"

/**
 * A small published release, written by hand so expected text never comes from the code under
 * test, and served the way the static host serves `/data/<release>/<path>`.
 */
export const RELEASE = "2026-11-03-fixture"
export const ORIGIN = "https://reader.example"

const resource = (
  fields: Pick<CatalogResource, "id" | "kind" | "title" | "creator" | "ingested"> &
    Partial<CatalogResource>,
): CatalogResource => ({
  edition: "Fixture edition",
  language: "en",
  license: { spdx: "CC-PDM-1.0", url: "https://creativecommons.org/publicdomain/mark/1.0/" },
  attribution: { text: `${fields.title}, public domain.` },
  sourceUrl: `https://example.org/${fields.id}`,
  surfaces: ["web", "api", "mcp", "dataset"],
  status: { state: "active" },
  available: true,
  ...fields,
})

export const CALVIN_ATTRIBUTION = "John Calvin, Commentary on Romans, translated by John Owen."
export const XREF_ATTRIBUTION = "Cross references from OpenBible.info, CC BY 4.0."
export const SBLGNT_ATTRIBUTION = "SBL Greek New Testament, CC BY 4.0."
export const WCF_ATTRIBUTION = "The Westminster Confession of Faith (1647), public domain."
export const BSB_ATTRIBUTION = "The Berean Standard Bible, dedicated to the public domain."

export const CATALOG: ReadonlyArray<CatalogResource> = [
  resource({
    id: "bsb",
    kind: "translation",
    title: "Berean Standard Bible",
    creator: "Berean Bible Translation Committee",
    attribution: { text: BSB_ATTRIBUTION },
    ingested: [
      { book: "Gen", chapters: [1] },
      { book: "Rom", chapters: [1, 8, 16] },
      { book: "Rev", chapters: [1] },
    ],
  }),
  resource({
    id: "kjv",
    kind: "translation",
    title: "King James Version",
    creator: "Church of England",
    ingested: [{ book: "Rom", chapters: [8] }],
  }),
  resource({
    id: "calvin-commentaries",
    kind: "commentary",
    title: "Calvin's Commentaries",
    creator: "John Calvin",
    attribution: { text: CALVIN_ATTRIBUTION },
    scope: ["Gen", "Rom"],
    ingested: [{ book: "Rom", chapters: [8] }],
  }),
  resource({
    id: "openbible-xrefs",
    kind: "cross-references",
    title: "OpenBible.info Cross References",
    creator: "OpenBible.info",
    license: { spdx: "CC-BY-4.0", url: "https://creativecommons.org/licenses/by/4.0/" },
    attribution: { text: XREF_ATTRIBUTION },
    ingested: [{ book: "Rom", chapters: [8] }],
  }),
  resource({
    id: "sblgnt",
    kind: "original-language",
    title: "SBL Greek New Testament",
    creator: "Society of Biblical Literature",
    language: "grc",
    license: { spdx: "CC-BY-4.0", url: "https://creativecommons.org/licenses/by/4.0/" },
    attribution: { text: SBLGNT_ATTRIBUTION },
    scope: ["Rom", "Rev"],
    ingested: [{ book: "Rom", chapters: [8] }],
  }),
  resource({
    id: "wcf",
    kind: "confession",
    title: "The Westminster Confession of Faith",
    creator: "Westminster Assembly",
    attribution: { text: WCF_ATTRIBUTION },
    ingested: [],
  }),
  resource({
    id: "hc",
    kind: "confession",
    title: "The Heidelberg Catechism",
    creator: "Zacharias Ursinus",
    available: false,
    ingested: [],
  }),
]

const verse = (n: number, text: string) => ({ verse: n, text: [{ text }] })

export const ROMANS_8_28_BSB =
  "And we know that God works all things together for the good of those who love Him."
export const ROMANS_8_28_KJV =
  "And we know that all things work together for good to them that love God."
export const CALVIN_ON_8_28 = "So far are afflictions from hindering our salvation."
export const CALVIN_ON_8_31 = "What then shall we say to these things? Paul now concludes."
export const SCRIPT_IN_COMMENTARY = '<script>alert("not markup")</script>'
export const WCF_3_6_TEXT =
  "As God hath appointed the elect unto glory, so hath he foreordained all the means thereunto."

const files: Record<string, unknown> = {
  "catalog.json": { resources: CATALOG },
  "text/bsb/Rom.1.json": {
    resourceId: "bsb",
    book: "Rom",
    chapter: 1,
    headings: [],
    verses: [verse(1, "Paul, a servant of Christ Jesus.")],
  },
  "text/bsb/Rom.8.json": {
    resourceId: "bsb",
    book: "Rom",
    chapter: 8,
    headings: [{ beforeVerse: 28, text: "God Works in All Things" }],
    verses: [
      verse(1, "Therefore, there is now no condemnation for those who are in Christ Jesus."),
      verse(28, ROMANS_8_28_BSB),
      verse(31, "What then shall we say in response to these things?"),
    ],
  },
  "text/kjv/Rom.8.json": {
    resourceId: "kjv",
    book: "Rom",
    chapter: 8,
    headings: [],
    verses: [verse(28, ROMANS_8_28_KJV), verse(31, "What shall we then say to these things?")],
  },
  "text/bsb/Rom.16.json": {
    resourceId: "bsb",
    book: "Rom",
    chapter: 16,
    headings: [],
    verses: [
      verse(23, "Gaius, who has hosted me and all the church, sends you greetings."),
      { verse: 24, absent: true, note: "Not in this translation." },
      verse(25, "Now to Him who is able to strengthen you by my gospel."),
    ],
  },
  "text/bsb/Gen.1.json": {
    resourceId: "bsb",
    book: "Gen",
    chapter: 1,
    headings: [],
    verses: [verse(1, "In the beginning God created the heavens and the earth.")],
  },
  "text/bsb/Rev.1.json": {
    resourceId: "bsb",
    book: "Rev",
    chapter: 1,
    headings: [],
    verses: [verse(1, "This is the revelation of Jesus Christ.")],
  },
  "commentary/calvin-commentaries/Rom.8.json": {
    resourceId: "calvin-commentaries",
    book: "Rom",
    chapter: 8,
    sections: [
      {
        ref: "Rom.8.1",
        paragraphs: [[{ text: "There is therefore now no condemnation." }]],
        notes: [],
      },
      {
        ref: "Rom.8.28-Rom.8.30",
        paragraphs: [
          [{ text: "And we know", emphasis: true }, { text: `. ${CALVIN_ON_8_28}` }],
          [{ text: SCRIPT_IN_COMMENTARY }],
        ],
        notes: [],
      },
      { ref: "Rom.8.31-Rom.8.39", paragraphs: [[{ text: CALVIN_ON_8_31 }]], notes: [] },
    ],
  },
  "xrefs/Rom.8.json": {
    resourceId: "openbible-xrefs",
    book: "Rom",
    chapter: 8,
    verses: [
      {
        verse: 28,
        // Thirty targets, so the first page of twenty-five carries a cursor.
        targets: Array.from({ length: 30 }, (_, i) => ({
          target: `Ps.${i + 1}.1`,
          votes: 300 - i,
        })),
      },
      { verse: 31, targets: [{ target: "Ps.118.6", votes: 80 }] },
    ],
  },
  "words/Rom.8.json": {
    resourceId: "sblgnt",
    language: "grc",
    book: "Rom",
    chapter: 8,
    verses: [
      {
        verse: 28,
        words: [
          {
            position: 1,
            surface: "Οἴδαμεν",
            transliteration: "Oidamen",
            lemma: "οἶδα",
            strongs: "G1492",
            stepStrongs: "G1492",
            morphology: "V-RAI-1P",
            gloss: "to know",
            editions: ["SBL", "TR"],
          },
        ],
        notes: ["The Textus Receptus behind the KJV differs here."],
      },
    ],
  },
  "confession-index/Rom.8.json": {
    book: "Rom",
    chapter: 8,
    verses: [{ verse: 28, citations: [{ resourceId: "wcf", articleId: "3.6", label: "WCF 3.6" }] }],
  },
  "confessions/wcf.json": {
    resourceId: "wcf",
    abbreviation: "WCF",
    title: "The Westminster Confession of Faith",
    divisions: [
      {
        id: "3",
        title: "Of God's Eternal Decree",
        articles: [
          {
            id: "3.6",
            label: "Chapter 3, Section 6",
            paragraphs: [[{ text: WCF_3_6_TEXT }]],
            proofs: [{ label: "a", refs: ["Rom.8.28", "Eph.1.4-Eph.1.5"] }],
          },
        ],
      },
    ],
  },
}

/** Published files as served, keyed by path within the release. */
export const FILES: ReadonlyMap<string, string> = new Map(
  Object.entries(files).map(([path, payload]) => [
    path,
    JSON.stringify({ release: RELEASE, payload }),
  ]),
)

const APP_PAGE = '<!doctype html><html><body><div id="root"></div></body></html>'

/**
 * A static host for the fixture. Paths in `servesAppPage` answer with the app's HTML page, as a
 * single-page-app fallback does for a file a newer deploy removed; `unavailable` paths answer 503.
 */
export const staticHost =
  (options: { servesAppPage?: ReadonlyArray<string>; unavailable?: ReadonlyArray<string> } = {}) =>
  (request: Request): Promise<Response> => {
    const prefix = `/data/${RELEASE}/`
    const { pathname } = new URL(request.url)
    const path = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : ""
    if (options.servesAppPage?.includes(path) === true)
      return Promise.resolve(new Response(APP_PAGE, { headers: { "content-type": "text/html" } }))
    if (options.unavailable?.includes(path) === true)
      return Promise.resolve(new Response("busy", { status: 503 }))
    const body = FILES.get(path)
    return Promise.resolve(
      body === undefined ? new Response(APP_PAGE, { status: 404 }) : new Response(body),
    )
  }

export const contentLayer = (host = staticHost()) =>
  Layer.merge(layerFetch({ baseUrl: ORIGIN, release: RELEASE, fetch: host }), Site.layer(ORIGIN))

/** Runs a Command's Effect against the fixture release and returns the Message it produces. */
export const runCommand = <A>(
  command: { readonly effect: Effect.Effect<A, never, ContentStore | Site> },
  host = staticHost(),
): Promise<A> => Effect.runPromise(Effect.provide(command.effect, contentLayer(host)))
