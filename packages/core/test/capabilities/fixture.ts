import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import type { AnyContract, Capability } from "@reformed-bible/capability"
import { Effect, Layer, Schema } from "effect"
import { buildRelease } from "../../../dataset-tools/src/build/release.ts"
import { layerFs } from "../../../dataset-tools/src/content-store-fs.ts"
import {
  type CommentaryBook,
  Confession,
  type ContentStore,
  type CrossReferenceChapter,
  type LexiconEntry,
  type OriginalChapter,
  ResourceRecord,
  type TranslationChapter,
} from "../../src/index.ts"
import { layerFetch } from "../../src/content-store/fetch.ts"
import { Site } from "../../src/site/index.ts"

const repoRoot = join(import.meta.dirname, "../../../..")

const readJson = (path: string): unknown => JSON.parse(readFileSync(join(repoRoot, path), "utf8"))

/** The project's real resource records, so listings name the resources that actually ship. */
const realRecords = readdirSync(join(repoRoot, "dataset/resources"))
  .sort()
  .map((id) =>
    Schema.decodeUnknownSync(ResourceRecord)(readJson(`dataset/resources/${id}/resource.json`)),
  )

const fixtureRecord = (
  overrides: Partial<ResourceRecord> & Pick<ResourceRecord, "id" | "kind">,
): ResourceRecord => ({
  title: `Title of ${overrides.id}`,
  creator: "Creator",
  edition: "Edition",
  language: "en",
  source: { url: "https://example.org/source", retrievedAt: "2026-11-03", files: [] },
  license: {
    spdx: "CC-PDM-1.0",
    evidence: [{ url: "https://example.org/license", quote: "Public Domain" }],
  },
  attribution: { text: "Credit line." },
  modifications: "None.",
  surfaces: ["web", "api", "mcp", "dataset"],
  status: { state: "active" },
  ...overrides,
})

export const WITHDRAWN_REASON = "License evidence was retracted by the publisher."

/** A confession the catalog lists before its transcription is ingested. */
export const UNINGESTED_CONFESSION = "uningested-confession"

const records = [
  ...realRecords,
  fixtureRecord({ id: UNINGESTED_CONFESSION, kind: "confession" }),
  fixtureRecord({
    id: "withdrawn-commentary",
    kind: "commentary",
    status: { state: "withdrawn", reason: WITHDRAWN_REASON },
  }),
]

const verseText = (verse: number, text: string) => ({ verse, text: [{ text }] })

export const BSB_ROMANS_8_28 =
  "And we know that God works all things together for the good of those who love Him, who are called according to His purpose."

const bsb: ReadonlyArray<TranslationChapter> = [
  {
    resourceId: "bsb",
    book: "Rom",
    chapter: 8,
    headings: [{ beforeVerse: 28, text: "God Works in All Things" }],
    verses: [
      verseText(27, "And He who searches our hearts knows the mind of the Spirit."),
      verseText(28, BSB_ROMANS_8_28),
      verseText(29, "For those God foreknew, He also predestined."),
    ],
  },
  {
    resourceId: "bsb",
    book: "Rom",
    chapter: 16,
    headings: [],
    verses: [
      verseText(23, "Gaius, who has hosted me and all the church, sends you greetings."),
      { verse: 24, absent: true, note: "Not in this translation." },
      verseText(25, "Now to Him who is able to strengthen you by my gospel."),
    ],
  },
]

const prose = (words: string, length: number) =>
  `${words} `.repeat(Math.ceil(length / (words.length + 1))).slice(0, length)

const section = (ref: string, text: string) => ({ ref, paragraphs: [[{ text }]], notes: [] })

/** Calvin on Romans 7 and 8: seven sections, two of them long enough to meet the character cap. */
export const CALVIN_ROMANS_8 = [
  section("Rom.7.24-Rom.8.1", "Wretched man that I am! He closes with an exclamation."),
  section("Rom.8.2-Rom.8.4", "For the law of the Spirit of life. This is a confirmation."),
  section("Rom.8.5-Rom.8.11", "For they who are according to the flesh."),
  section("Rom.8.12-Rom.8.17", prose("We are debtors, not to the flesh.", 9000)),
  section(
    "Rom.8.18-Rom.8.27",
    prose("For I reckon that the sufferings of this present time.", 5000),
  ),
  section(
    "Rom.8.28-Rom.8.30",
    "And we know that to them who love God. So far are afflictions from hindering our salvation.",
  ),
  section("Rom.8.31-Rom.8.39", "What then shall we say to these things?"),
]

const calvin: CommentaryBook = {
  resourceId: "calvin-commentaries",
  book: "Rom",
  sections: [section("Rom.7.1", "Know ye not, brethren."), ...CALVIN_ROMANS_8],
}

const parallel = (ref: string, parallels: ReadonlyArray<string>, text: string) => ({
  ...section(ref, text),
  parallels,
})

export const CALVIN_ON_THE_SOWER = "It is not without good reason that the Evangelists begin."

/**
 * Calvin's Harmony of the Gospels and of the Law, as ingested: each comment is keyed to the book it
 * heads and names its pericope's passages in the other books. Luke and Deuteronomy hold no comment
 * of their own here.
 */
const calvinHarmonies: ReadonlyArray<CommentaryBook> = [
  {
    resourceId: "calvin-commentaries",
    book: "Exod",
    sections: [parallel("Exod.20.3", ["Deut.5.7"], "Thou shalt have no other gods before me.")],
  },
  {
    resourceId: "calvin-commentaries",
    book: "Matt",
    sections: [
      parallel(
        "Matt.8.28-Matt.8.34",
        ["Mark.5.1-Mark.5.20", "Luke.8.26-Luke.8.39"],
        "And when he was come to the other side into the country of the Gergesenes.",
      ),
      parallel(
        "Matt.13.2-Matt.13.8",
        ["Mark.4.1-Mark.4.12", "Luke.8.1-Luke.8.10"],
        CALVIN_ON_THE_SOWER,
      ),
      parallel(
        "Matt.13.9-Matt.13.17",
        ["Mark.4.1-Mark.4.12", "Luke.8.1-Luke.8.10"],
        "He that hath ears to hear, let him hear.",
      ),
      parallel(
        "Matt.13.31-Matt.13.32",
        ["Mark.4.30-Mark.4.32", "Luke.13.18-Luke.13.19"],
        "The kingdom of heaven is like a grain of mustard seed.",
      ),
    ],
  },
  {
    resourceId: "calvin-commentaries",
    book: "Mark",
    sections: [
      parallel(
        "Mark.4.12",
        ["Matt.13.1-Matt.13.17", "Luke.8.1-Luke.8.10"],
        "That seeing they may see, and not perceive.",
      ),
      section("Mark.5.1-Mark.5.20", "And they came over unto the other side of the sea."),
    ],
  },
]

/** Thirty cross-references from Romans 8:28, strongest first, so they fill more than one page. */
export const XREF_TARGETS = Array.from({ length: 30 }, (_, i) => ({
  target: `Ps.${i + 1}.1`,
  votes: 300 - i,
}))

const xrefs: CrossReferenceChapter = {
  resourceId: "openbible-xrefs",
  book: "Rom",
  chapter: 8,
  verses: [
    { verse: 28, targets: XREF_TARGETS },
    { verse: 29, targets: [{ target: "Eph.1.5", votes: 90 }] },
  ],
}

const word = (position: number, surface: string, strongs: string, stepStrongs: string) => ({
  position,
  surface,
  transliteration: surface,
  lemma: surface,
  strongs,
  stepStrongs,
  morphology: "V-RAI-1P",
  gloss: "we know",
  editions: ["SBL", "NA28"],
})

const greek: OriginalChapter = {
  resourceId: "sblgnt",
  language: "grc",
  book: "Rom",
  chapter: 8,
  verses: [
    {
      verse: 28,
      words: [word(1, "Οἴδαμεν", "G1492", "G6063"), word(2, "δὲ", "G1161", "G1161")],
      notes: [],
    },
  ],
}

const lexicon: ReadonlyArray<LexiconEntry> = [
  {
    resourceId: "stepbible-lexicons",
    strongs: "G1492",
    stepStrongs: "G6063",
    lemma: "οἶδα",
    transliteration: "oida",
    gloss: "to know",
    definition: "to know, to have knowledge of",
  },
  {
    resourceId: "stepbible-lexicons",
    strongs: "G1492",
    stepStrongs: "G1492G",
    lemma: "εἴδω",
    transliteration: "eidō",
    gloss: "to perceive: understand",
    definition: "to have seen or perceived, hence to know",
  },
  {
    resourceId: "stepbible-lexicons",
    strongs: "G1161",
    stepStrongs: "G1161",
    lemma: "δέ",
    transliteration: "de",
    gloss: "but",
    definition: "but, and",
  },
]

/** Every confession as transcribed for the dataset, so each real record has its text and proof-text links are real. */
const confessions = readdirSync(join(repoRoot, "dataset/confessions")).map((id) =>
  Schema.decodeUnknownSync(Confession)(readJson(`dataset/confessions/${id}/confession.json`)),
)

const built = await Effect.runPromise(
  buildRelease(
    {
      records,
      translations: bsb,
      commentaries: [calvin, ...calvinHarmonies],
      crossReferences: [xrefs],
      originals: [greek],
      lexicon,
      confessions,
      corrections: [],
    },
    { date: "2026-11-03" },
  ),
)

export const RELEASE = built.release

/** Published files as served, keyed by path within the release. */
export const FILES: ReadonlyMap<string, string> = new Map(
  [...built.files].map(([path, value]) => [path, JSON.stringify(value)]),
)

export const RELEASE_DIR = join(mkdtempSync(join(tmpdir(), "capability-fixture-")), RELEASE)
for (const [path, text] of FILES) {
  const target = join(RELEASE_DIR, path)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, text)
}

export const ORIGIN = "https://reformed.example"

/** Serves release files the way a static host does, from `/data/<release>/<path>`. */
export const staticHost =
  (files: ReadonlyMap<string, string>, release = RELEASE) =>
  (request: Request): Promise<Response> => {
    const prefix = `/data/${release}/`
    const { pathname } = new URL(request.url)
    const body = pathname.startsWith(prefix) ? files.get(pathname.slice(prefix.length)) : undefined
    return Promise.resolve(
      body === undefined ? new Response("Not found", { status: 404 }) : new Response(body),
    )
  }

export const fsStore = layerFs({ directory: RELEASE_DIR, release: RELEASE })

export const fetchStore = (files: ReadonlyMap<string, string> = FILES, release = RELEASE) =>
  layerFetch({ baseUrl: ORIGIN, release, fetch: staticHost(files, release) })

/**
 * Runs a capability's handler against a store, and checks the result encodes and decodes through
 * the contract's output schema, so every result in these tests is a valid envelope.
 */
export const call = <C extends AnyContract, R>(
  capability: Capability<C, R>,
  input: C["input"]["Type"],
  store: Layer.Layer<ContentStore> = fsStore,
) =>
  capability.handler(input).pipe(
    Effect.tap((output) =>
      Schema.encodeUnknownEffect(capability.contract.output)(output).pipe(
        Effect.flatMap(Schema.decodeUnknownEffect(capability.contract.output)),
        Effect.orDie,
      ),
    ),
    Effect.provide(Layer.merge(store, Site.layer(ORIGIN))),
  )
