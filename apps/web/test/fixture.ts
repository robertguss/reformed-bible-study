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
export const HENRY_ATTRIBUTION = "Matthew Henry, Commentary on the Whole Bible, public domain."
export const POOLE_ATTRIBUTION = "Matthew Poole, Annotations upon the Holy Bible, public domain."
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
      { book: "Prov", chapters: [3] },
      { book: "Isa", chapters: [53] },
      { book: "Mark", chapters: [4] },
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
    scope: ["Gen", "Isa", "Matt", "Mark", "Rom"],
    ingested: [
      { book: "Gen", chapters: [1] },
      { book: "Mark", chapters: [4] },
      { book: "Rom", chapters: [8] },
    ],
  }),
  resource({
    id: "matthew-henry",
    kind: "commentary",
    title: "Matthew Henry's Commentary",
    creator: "Matthew Henry",
    attribution: { text: HENRY_ATTRIBUTION },
    ingested: [
      { book: "Gen", chapters: [1] },
      { book: "Prov", chapters: [3] },
      { book: "Isa", chapters: [53] },
    ],
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

/** The Belgic Confession, listed only by a host made with `withBelgic`, for proofs of a whole article. */
export const BELGIC: CatalogResource = resource({
  id: "bc",
  kind: "confession",
  title: "The Belgic Confession",
  creator: "Guido de Brès",
  ingested: [],
})

/** Poole, listed only by a host made with `withPoole`, for the fallback order's first step after Calvin. */
export const POOLE: CatalogResource = resource({
  id: "poole-annotations",
  kind: "commentary",
  title: "Annotations upon the Holy Bible",
  creator: "Matthew Poole",
  attribution: { text: POOLE_ATTRIBUTION },
  ingested: [{ book: "Prov", chapters: [3] }],
})

const verse = (n: number, text: string) => ({ verse: n, text: [{ text }] })

export const ROMANS_8_28_BSB =
  "And we know that God works all things together for the good of those who love Him."
export const ROMANS_8_28_KJV =
  "And we know that all things work together for good to them that love God."
export const CALVIN_ON_8_28 = "So far are afflictions from hindering our salvation."
export const CALVIN_ON_8_31 = "What then shall we say to these things? Paul now concludes."
export const CALVIN_ON_GEN_1_1 =
  "In the beginning. To take the word beginning as Christ is too weak."
export const HENRY_ON_GEN_1_1 = "The first verse of the Bible gives us a surprising account."
export const HENRY_ON_PROV_3_1 = "My son, forget not my law. Solomon here speaks as a father."
export const HENRY_ON_PROV_3_5 = "Trust in the Lord with all thine heart. We must depend upon him."
export const HENRY_ON_PROV_3_9 = "Honour the Lord with thy substance. Here is a precept of piety."
export const POOLE_ON_PROV_3_5 = "Trust in the Lord; rely upon his promises and providence."
export const HENRY_ON_ISA_53_5 = "He was wounded for our transgressions; it was for our sakes."
export const SCRIPT_IN_COMMENTARY = '<script>alert("not markup")</script>'
export const CALVIN_ON_THE_SOWER = "It is not without good reason that the Evangelists begin."
export const BELGIC_ART_1_TEXT =
  "We all believe with the heart, and confess with the mouth, that there is one only God."
export const HC_Q1_QUESTION = "What is thy only comfort in life and in death?"
export const HC_Q1_ANSWER =
  "That I, with body and soul, both in life and in death, am not my own, but belong to my faithful Saviour Jesus Christ."
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
  "text/bsb/Prov.3.json": {
    resourceId: "bsb",
    book: "Prov",
    chapter: 3,
    headings: [],
    verses: [
      verse(1, "My son, do not forget my teaching."),
      verse(5, "Trust in the LORD with all your heart."),
      verse(9, "Honor the LORD with your possessions."),
    ],
  },
  "text/bsb/Isa.53.json": {
    resourceId: "bsb",
    book: "Isa",
    chapter: 53,
    headings: [],
    verses: [
      verse(1, "Who has believed our message?"),
      verse(5, "But He was pierced for our transgressions."),
    ],
  },
  "text/bsb/Rev.1.json": {
    resourceId: "bsb",
    book: "Rev",
    chapter: 1,
    headings: [],
    verses: [verse(1, "This is the revelation of Jesus Christ.")],
  },
  "text/bsb/Mark.4.json": {
    resourceId: "bsb",
    book: "Mark",
    chapter: 4,
    headings: [],
    verses: [verse(3, "Listen! A farmer went out to sow his seed.")],
  },
  // Calvin's Harmony of the Gospels keys the sower to Matthew; Mark 4 holds it as a parallel.
  "commentary/calvin-commentaries/Mark.4.json": {
    resourceId: "calvin-commentaries",
    book: "Mark",
    chapter: 4,
    sections: [
      {
        ref: "Matt.13.2-Matt.13.8",
        parallels: ["Mark.4.1-Mark.4.12", "Luke.8.1-Luke.8.10"],
        paragraphs: [[{ text: CALVIN_ON_THE_SOWER }]],
        notes: [],
      },
    ],
  },
  "commentary/calvin-commentaries/Gen.1.json": {
    resourceId: "calvin-commentaries",
    book: "Gen",
    chapter: 1,
    sections: [{ ref: "Gen.1.1", paragraphs: [[{ text: CALVIN_ON_GEN_1_1 }]], notes: [] }],
  },
  "commentary/matthew-henry/Gen.1.json": {
    resourceId: "matthew-henry",
    book: "Gen",
    chapter: 1,
    sections: [{ ref: "Gen.1.1-Gen.1.2", paragraphs: [[{ text: HENRY_ON_GEN_1_1 }]], notes: [] }],
  },
  "commentary/matthew-henry/Prov.3.json": {
    resourceId: "matthew-henry",
    book: "Prov",
    chapter: 3,
    // Four sections, so a request for verses 1-12 fills one page of three and leaves one more.
    sections: [
      { ref: "Prov.3.1-Prov.3.4", paragraphs: [[{ text: HENRY_ON_PROV_3_1 }]], notes: [] },
      { ref: "Prov.3.5-Prov.3.6", paragraphs: [[{ text: HENRY_ON_PROV_3_5 }]], notes: [] },
      {
        ref: "Prov.3.7-Prov.3.8",
        paragraphs: [[{ text: "Be not wise in thine own eyes." }]],
        notes: [],
      },
      { ref: "Prov.3.9-Prov.3.12", paragraphs: [[{ text: HENRY_ON_PROV_3_9 }]], notes: [] },
    ],
  },
  "commentary/matthew-henry/Isa.53.json": {
    resourceId: "matthew-henry",
    book: "Isa",
    chapter: 53,
    sections: [
      { ref: "Isa.53.4-Isa.53.6", paragraphs: [[{ text: HENRY_ON_ISA_53_5 }]], notes: [] },
    ],
  },
  "commentary/poole-annotations/Prov.3.json": {
    resourceId: "poole-annotations",
    book: "Prov",
    chapter: 3,
    sections: [{ ref: "Prov.3.5", paragraphs: [[{ text: POOLE_ON_PROV_3_5 }]], notes: [] }],
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
    verses: [
      {
        verse: 28,
        citations: [
          { resourceId: "wcf", articleId: "3.6", label: "WCF 3.6" },
          { resourceId: "hc", articleId: "Q1", label: "HC Q1" },
        ],
      },
    ],
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
  "confessions/hc.json": {
    resourceId: "hc",
    abbreviation: "HC",
    title: "The Heidelberg Catechism",
    divisions: [
      {
        id: "1",
        title: "Lord's Day 1",
        articles: [
          {
            id: "Q1",
            label: "Question 1",
            question: [{ text: HC_Q1_QUESTION }],
            paragraphs: [[{ text: HC_Q1_ANSWER }]],
            proofs: [{ refs: ["Rom.8.28"] }],
          },
        ],
      },
    ],
  },
  "confessions/bc.json": {
    resourceId: "bc",
    abbreviation: "BC",
    title: "The Belgic Confession",
    divisions: [
      {
        id: "1",
        title: "There Is One Only God",
        articles: [
          {
            id: "Art1",
            label: "Article 1",
            paragraphs: [[{ text: BELGIC_ART_1_TEXT }]],
            proofs: [{ wholeArticle: true, refs: ["Eph.4.5", "Deut.6.4"] }],
          },
        ],
      },
    ],
  },
}

const published = (payload: unknown) => JSON.stringify({ release: RELEASE, payload })

/** Published files as served, keyed by path within the release. */
export const FILES: ReadonlyMap<string, string> = new Map(
  Object.entries(files).map(([path, payload]) => [path, published(payload)]),
)

const APP_PAGE = '<!doctype html><html><body><div id="root"></div></body></html>'

/**
 * A static host for the fixture. Paths in `servesAppPage` answer with the app's HTML page, as a
 * single-page-app fallback does for a file a newer deploy removed; `unavailable` paths answer 503.
 * `withPoole` serves a catalog that also lists Poole, `withBelgic` one that also lists the Belgic
 * Confession, and `withHeidelberg` one where the Heidelberg Catechism is available.
 */
export const staticHost =
  (
    options: {
      servesAppPage?: ReadonlyArray<string>
      unavailable?: ReadonlyArray<string>
      withPoole?: boolean
      withBelgic?: boolean
      withHeidelberg?: boolean
    } = {},
  ) =>
  (request: Request): Promise<Response> => {
    const prefix = `/data/${RELEASE}/`
    const { pathname } = new URL(request.url)
    const path = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : ""
    if (options.servesAppPage?.includes(path) === true)
      return Promise.resolve(new Response(APP_PAGE, { headers: { "content-type": "text/html" } }))
    if (options.unavailable?.includes(path) === true)
      return Promise.resolve(new Response("busy", { status: 503 }))
    const body =
      path === "catalog.json"
        ? published({
            resources: [
              ...CATALOG.map((entry) =>
                entry.id === "hc" && options.withHeidelberg === true
                  ? { ...entry, available: true }
                  : entry,
              ),
              ...(options.withPoole === true ? [POOLE] : []),
              ...(options.withBelgic === true ? [BELGIC] : []),
            ],
          })
        : FILES.get(path)
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
