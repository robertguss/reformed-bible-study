import type {
  CommentaryBook,
  Confession,
  CrossReferenceChapter,
  OriginalChapter,
  ResourceRecord,
  TranslationChapter,
} from "@reformed-bible/core"
import type { ReleaseInput } from "../../src/build/release.ts"

export const record = (
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

const romans8: TranslationChapter = {
  resourceId: "bsb",
  book: "Rom",
  chapter: 8,
  headings: [],
  verses: [
    { verse: 28, text: [{ text: "And we know that God works all things together for the good" }] },
    { verse: 29, text: [{ text: "For those God foreknew" }] },
  ],
}

const calvin: CommentaryBook = {
  resourceId: "calvin-commentaries",
  book: "Rom",
  sections: [
    { ref: "Rom.7.24-Rom.8.1", paragraphs: [[{ text: "Wretched man" }]], notes: [] },
    {
      ref: "Rom.8.28-Rom.8.30",
      paragraphs: [[{ text: "So far are afflictions from hindering" }]],
      notes: [],
    },
    { ref: "Rom.9.1", paragraphs: [[{ text: "I say the truth" }]], notes: [] },
  ],
}

const wcf: Confession = {
  resourceId: "wcf",
  abbreviation: "WCF",
  title: "Westminster Confession of Faith",
  divisions: [
    {
      id: "3",
      title: "Of God's Eternal Decree",
      articles: [
        {
          id: "3.6",
          label: "Chapter 3, Section 6",
          paragraphs: [[{ text: "As God hath appointed" }]],
          proofs: [{ refs: ["Rom.8.28-Rom.8.30", "Eph.1.4"] }],
        },
      ],
    },
    {
      id: "5",
      title: "Of Providence",
      articles: [
        {
          id: "5.7",
          label: "Chapter 5, Section 7",
          paragraphs: [[{ text: "As the providence of God" }]],
          proofs: [{ refs: ["Rom.8.28"] }],
        },
        {
          id: "5.1",
          label: "Chapter 5, Section 1",
          paragraphs: [[{ text: "God the great Creator" }]],
          proofs: [{ refs: ["Rom.11.36"] }],
        },
      ],
    },
  ],
}

const xrefs: CrossReferenceChapter = {
  resourceId: "openbible-xrefs",
  book: "Rom",
  chapter: 8,
  verses: [{ verse: 28, targets: [{ target: "Gen.50.20", votes: 120 }] }],
}

const greek: OriginalChapter = {
  resourceId: "sblgnt",
  language: "grc",
  book: "Rom",
  chapter: 8,
  verses: [{ verse: 28, words: [], notes: [] }],
}

export const input = (overrides: Partial<ReleaseInput> = {}): ReleaseInput => ({
  records: [
    record({
      id: "bsb",
      kind: "translation",
      license: { spdx: "LicenseRef-BSB-Dedication", evidence: [] },
    }),
    record({ id: "calvin-commentaries", kind: "commentary", scope: ["Gen", "Rom", "Gal"] }),
    record({ id: "wcf", kind: "confession" }),
    record({
      id: "openbible-xrefs",
      kind: "cross-references",
      license: { spdx: "CC-BY-4.0", evidence: [] },
    }),
    record({
      id: "sblgnt",
      kind: "original-language",
      language: "grc",
      license: { spdx: "CC-BY-4.0", evidence: [] },
    }),
    record({
      id: "stepbible-lexicons",
      kind: "lexicon",
      license: { spdx: "CC-BY-4.0", evidence: [] },
    }),
  ],
  translations: [romans8],
  commentaries: [calvin],
  crossReferences: [xrefs],
  originals: [greek],
  lexicon: [
    {
      resourceId: "stepbible-lexicons",
      strongs: "G1492",
      stepStrongs: "G6063",
      lemma: "οἶδα",
      transliteration: "oida",
      gloss: "to know",
      definition: "to know",
    },
  ],
  confessions: [wcf],
  corrections: [],
  ...overrides,
})
