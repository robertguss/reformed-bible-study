import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "@effect/vitest"
import type { TextRun } from "@reformed-bible/core"
import { Effect } from "effect"
import {
  commentaryBookFromZCom,
  harmonyPericopes,
  readZCom,
} from "../../src/ingest/crosswire-zcom.ts"
import {
  buildModule,
  chapterSlots,
  end,
  pericope,
  section,
  start,
  testamentSlots,
  verseSlots,
} from "./zcom-module.ts"

const fixture = (name: string): string =>
  readFileSync(join(import.meta.dirname, "../fixtures/calvin-romans-sample", `${name}.xml`), "utf8")

const sample = (name: string): string =>
  readFileSync(join(import.meta.dirname, "../fixtures/henry-jfb-sample", `${name}.xml`), "utf8")

const plain = (runs: ReadonlyArray<TextRun>): string => runs.map((run) => run.text).join("")

const romans = [
  [{ text: fixture("Matt.1.2"), slots: ["Matt.1.2"] }],
  [
    { text: fixture("Rom.8.27"), slots: ["Rom.8.27"] },
    { text: fixture("Rom.8.28"), slots: ["Rom.8.28", "Rom.8.29"] },
    { text: fixture("Rom.8.31"), slots: ["Rom.8.31"] },
    { text: section("Rom.9.3", "r93", "For I could wish."), slots: ["Rom.9.3"] },
  ],
]

describe("CrossWire zCom commentary", () => {
  it("lays out slots as the real module does", () => {
    // In the real CalvinCommentaries module, Romans 8:28 sits at New Testament slot 5132.
    expect(testamentSlots("nt").indexOf("Rom.8.28")).toBe(5132)
    expect(testamentSlots("nt")).toHaveLength(8246)
    expect(testamentSlots("ot")).toHaveLength(24115)
  })

  it.effect(
    "decodes fixture blocks and ends the section at Romans 8:28 where the next starts",
    () =>
      Effect.gen(function* () {
        const entries = yield* readZCom("nt", buildModule("nt", romans))
        expect(entries.map((entry) => entry.slot)).toEqual([
          "Matt.1.2",
          "Rom.8.27",
          "Rom.8.28",
          "Rom.8.31",
          "Rom.9.3",
        ])
        expect(entries[2]?.text).toBe(fixture("Rom.8.28"))
        const { book, misplaced } = yield* commentaryBookFromZCom(
          "calvin-commentaries",
          "Rom",
          entries,
        )
        expect(misplaced).toEqual([])
        expect(book.resourceId).toBe("calvin-commentaries")
        expect(book.book).toBe("Rom")
        expect(book.sections.map((s) => s.ref).slice(0, 2)).toEqual([
          "Rom.8.27",
          "Rom.8.28-Rom.8.30",
        ])
        expect(book.sections[1]?.notes).toHaveLength(1)
      }),
  )

  it.effect("ends a chapter's last section at the chapter's last verse", () =>
    Effect.gen(function* () {
      const entries = yield* readZCom("nt", buildModule("nt", romans))
      const { book } = yield* commentaryBookFromZCom("calvin-commentaries", "Rom", entries)
      expect(book.sections.map((s) => s.ref).slice(2)).toEqual([
        "Rom.8.31-Rom.8.39",
        "Rom.9.3-Rom.9.33",
      ])
    }),
  )

  it.effect("skips sections outside the requested book", () =>
    Effect.gen(function* () {
      const entries = yield* readZCom("nt", buildModule("nt", romans))
      const { book } = yield* commentaryBookFromZCom("calvin-commentaries", "Rom", entries)
      const text = JSON.stringify(book)
      expect(text).not.toContain("Matt.")
      expect(text).not.toContain("Ishmael")
    }),
  )

  it.effect("reports a slot whose own verse reference disagrees with its position", () =>
    Effect.gen(function* () {
      const entries = yield* readZCom(
        "nt",
        buildModule("nt", [
          [
            { text: fixture("Rom.8.27"), slots: ["Rom.8.27"] },
            { text: fixture("Rom.8.28"), slots: ["Rom.8.29"] },
          ],
        ]),
      )
      const { book, misplaced } = yield* commentaryBookFromZCom(
        "calvin-commentaries",
        "Rom",
        entries,
      )
      expect(misplaced).toEqual([{ slot: "Rom.8.29", ref: "Rom.8.28" }])
      expect(book.sections.map((entry) => entry.ref)).toEqual(["Rom.8.27-Rom.8.39"])
    }),
  )

  it.effect("takes an entry's size past 65,535 bytes from where the next entry starts", () =>
    Effect.gen(function* () {
      const long = section(
        "Gen.1.1",
        "g1",
        `In the beginning. ${"Calvin writes at length. ".repeat(3000)}Here the comment closes.`,
      )
      expect(Buffer.byteLength(long)).toBeGreaterThan(65536)
      const copy = section("Gen.1.5", "g5", "On the first day.")
      const entries = yield* readZCom(
        "ot",
        buildModule("ot", [
          [
            { text: long, slots: ["Gen.1.1"] },
            { text: section("Gen.1.2", "g2", "Without form."), slots: ["Gen.1.2"] },
            // A second copy of a later entry that no slot points at, as the real module holds
            // for a few verses of the Harmony of the Law.
            { text: copy },
            { text: copy, slots: ["Gen.1.5"] },
          ],
        ]),
      )
      expect(entries.map((entry) => entry.text)).toEqual([
        long,
        section("Gen.1.2", "g2", "Without form."),
        copy,
      ])
      const { book, misplaced } = yield* commentaryBookFromZCom(
        "calvin-commentaries",
        "Gen",
        entries,
      )
      expect(misplaced).toEqual([])
      expect(book.sections.map((s) => s.ref)).toEqual([
        "Gen.1.1",
        "Gen.1.2-Gen.1.4",
        "Gen.1.5-Gen.1.31",
      ])
      expect(plain(book.sections[0]?.paragraphs[0] ?? [])).toMatch(/Here the comment closes\.$/)
    }),
  )

  describe("a chapter whose verse slots all link to one entry", () => {
    const psalms = buildModule("ot", [
      [
        {
          text: `${start("Ps.1", "c1")}<div sID="c1p" type="x-p"/>PSALM 1. The sum of the whole.<div eID="c1p" type="x-p"/>${section("Ps.1.1", "v1", "Blessed is the man.")}`,
          slots: chapterSlots("Ps", 1),
        },
        {
          text: ` Calvin's version of verse two. ${section("Ps.1.2", "v2", "His delight is in the law.")} ${section("Ps.1.4", "v4", "The ungodly are not so.")}${end("Ps.1", "c1")}`,
        },
        {
          text: `${start("Ps.2", "c2")}PSALM 2.${section("Ps.2.1", "w1", "Why do the heathen rage?")}${end("Ps.2", "c2")}`,
          slots: chapterSlots("Ps", 2),
        },
        {
          text: `${start("Ps.53", "c53")}This psalm being almost identical with the fourteenth.${end("Ps.53", "c53")}`,
          slots: chapterSlots("Ps", 53),
        },
      ],
    ])

    it.effect("yields every verse section found after the entry, each at its own verse", () =>
      Effect.gen(function* () {
        const entries = yield* readZCom("ot", psalms)
        expect(entries.map((entry) => entry.slot)).toEqual(["Ps.1.1", "Ps.2.1", "Ps.53.1"])
        const { book, misplaced } = yield* commentaryBookFromZCom(
          "calvin-commentaries",
          "Ps",
          entries,
        )
        expect(misplaced).toEqual([])
        expect(book.sections.map((s) => [s.ref, s.paragraphs.map(plain)])).toEqual([
          ["Ps.1.1", ["PSALM 1. The sum of the whole.", "Blessed is the man."]],
          ["Ps.1.2-Ps.1.3", ["His delight is in the law."]],
          ["Ps.1.4-Ps.1.6", ["The ungodly are not so."]],
          ["Ps.2.1-Ps.2.12", ["PSALM 2.", "Why do the heathen rage?"]],
          ["Ps.53.1-Ps.53.6", ["This psalm being almost identical with the fourteenth."]],
        ])
      }),
    )

    it.effect("places a section repeated at the start of the next block once", () =>
      Effect.gen(function* () {
        const intro = `${start("Ps.119", "c119")}PSALM 119.`
        const entries = yield* readZCom(
          "ot",
          buildModule("ot", [
            [
              {
                text: `${start("Ps.118", "c118")}${section("Ps.118.1", "a1", "O praise the Lord.")}`,
                slots: chapterSlots("Ps", 118),
              },
              {
                text: `${section("Ps.118.5", "a5", "I called upon the Lord.")}${end("Ps.118", "c118")}${intro}${section("Ps.119.1", "b1", "Blessed are the undefiled.")}${section("Ps.119.3", "b3", "They also do no iniquity.")}`,
              },
            ],
            [
              {
                text: `${intro}${section("Ps.119.1", "b1", "Blessed are the undefiled.")}${start("Ps.119", "vol5")}COMMENTARY ON THE BOOK OF PSALMS, VOLUME FIFTH${end("Ps.119", "vol5")}`,
                slots: chapterSlots("Ps", 119),
              },
              { text: section("Ps.119.121", "b121", "I have done judgment.") },
            ],
          ]),
        )
        const { book, misplaced } = yield* commentaryBookFromZCom(
          "calvin-commentaries",
          "Ps",
          entries,
        )
        expect(misplaced).toEqual([])
        expect(book.sections.map((s) => [s.ref, s.paragraphs.map(plain)])).toEqual([
          ["Ps.118.1-Ps.118.4", ["O praise the Lord."]],
          ["Ps.118.5-Ps.118.29", ["I called upon the Lord."]],
          ["Ps.119.1-Ps.119.2", ["PSALM 119.", "Blessed are the undefiled."]],
          ["Ps.119.3-Ps.119.120", ["They also do no iniquity."]],
          ["Ps.119.121-Ps.119.176", ["I have done judgment."]],
        ])
      }),
    )

    it.effect("reports a second, different section on a verse that already has one", () =>
      Effect.gen(function* () {
        const entries = yield* readZCom(
          "ot",
          buildModule("ot", [
            [
              {
                text: `${start("Ps.3", "c3")}${section("Ps.3.1", "d1", "Lord, how are they increased.")}`,
                slots: chapterSlots("Ps", 3),
              },
              { text: section("Ps.3.2", "d2", "Many there be.") },
              {
                text: `${start("Ps.4", "c4")}${section("Ps.4.1", "f1", "Hear me when I call.")}`,
                slots: chapterSlots("Ps", 4),
              },
              { text: section("Ps.3.2", "e2", "A different comment.") },
            ],
          ]),
        )
        const { book, misplaced } = yield* commentaryBookFromZCom(
          "calvin-commentaries",
          "Ps",
          entries,
        )
        expect(misplaced).toEqual([{ slot: "Ps.4.1", ref: "Ps.3.2" }])
        expect(book.sections.map((s) => [s.ref, s.paragraphs.map(plain)])).toEqual([
          ["Ps.3.1", ["Lord, how are they increased."]],
          ["Ps.3.2-Ps.3.8", ["Many there be."]],
          ["Ps.4.1-Ps.4.8", ["Hear me when I call."]],
        ])
      }),
    )
  })

  describe("a harmony, whose pericope headings name each book's passage", () => {
    const GOSPELS = ["Matt", "Mark", "Luke"] as const
    // Calvin's reading order is block by block, not slot by slot: the heading for the sower sits at
    // the end of a comment on Luke 6, which reads before Matthew 13 although its slot comes later.
    const gospels = buildModule("nt", [
      [
        { text: section("Matt.12.42", "m42", "The queen of the south."), slots: ["Matt.12.42"] },
        {
          text: `${section("Luke.6.1", "l1", "On the sabbath.")}${pericope("Matthew 13:1-17", "Mark 4:1-12, 24-25", "Luke 8:1-10, 18; 10:23-24")}`,
          slots: ["Luke.6.1"],
        },
      ],
      [
        { text: section("Matt.13.2", "m2", "Great multitudes."), slots: ["Matt.13.2"] },
        { text: section("Matt.13.9", "m9", "He that hath ears."), slots: ["Matt.13.9"] },
        {
          text: `${section("Mark.4.12", "k12", "That seeing they may see.")}${pericope("Matthew 13:31-35", "Mark 4:26-34", "Psalm 78:2")}`,
          slots: ["Mark.4.12"],
        },
        { text: section("Matt.13.31", "m31", "A grain of mustard seed."), slots: ["Matt.13.31"] },
      ],
    ])

    const bookOf = (id: "Matt" | "Mark" | "Luke") =>
      Effect.gen(function* () {
        const entries = yield* readZCom("nt", gospels)
        const pericopes = yield* harmonyPericopes(entries, GOSPELS)
        const { book, misplaced } = yield* commentaryBookFromZCom(
          "calvin-commentaries",
          id,
          entries,
          pericopes,
        )
        expect(misplaced).toEqual([])
        return book.sections.map((s) => [s.ref, s.parallels])
      })

    it.effect(
      "gives each comment after a heading the other books' passages, up to the next heading",
      () =>
        Effect.gen(function* () {
          const sower = [
            "Mark.4.1-Mark.4.12",
            "Mark.4.24-Mark.4.25",
            "Luke.8.1-Luke.8.10",
            "Luke.8.18",
            "Luke.10.23-Luke.10.24",
          ]
          expect(yield* bookOf("Matt")).toEqual([
            ["Matt.12.42-Matt.12.50", undefined],
            ["Matt.13.2-Matt.13.8", sower],
            ["Matt.13.9-Matt.13.17", sower],
            ["Matt.13.31-Matt.13.35", ["Mark.4.26-Mark.4.34"]],
          ])
        }),
    )

    it.effect("ends a comment at its pericope's end in its own book", () =>
      Effect.gen(function* () {
        expect(yield* bookOf("Mark")).toEqual([
          [
            "Mark.4.12",
            ["Matt.13.1-Matt.13.17", "Luke.8.1-Luke.8.10", "Luke.8.18", "Luke.10.23-Luke.10.24"],
          ],
        ])
        expect(yield* bookOf("Luke")).toEqual([["Luke.6.1-Luke.6.49", undefined]])
      }),
    )

    it.effect("reads the passages of consecutive tables as one pericope", () =>
      Effect.gen(function* () {
        // The Harmony of the Law prints one table per book, so Exodus 20:3 and its repetition in
        // Deuteronomy 5:7 head one comment as two tables.
        const entries = yield* readZCom(
          "ot",
          buildModule("ot", [
            [
              {
                text: `${section("Deut.5.30", "d30", "Go say to them.")}${pericope("Exodus 20:3")}${pericope("Deuteronomy 5:7")}`,
                slots: ["Deut.5.30"],
              },
              {
                text: section("Exod.20.3", "e3", "Thou shalt have no other gods."),
                slots: ["Exod.20.3"],
              },
            ],
          ]),
        )
        const pericopes = yield* harmonyPericopes(entries, ["Exod", "Lev", "Num", "Deut"])
        const exodus = yield* commentaryBookFromZCom(
          "calvin-commentaries",
          "Exod",
          entries,
          pericopes,
        )
        const deuteronomy = yield* commentaryBookFromZCom(
          "calvin-commentaries",
          "Deut",
          entries,
          pericopes,
        )
        expect(exodus.book.sections.map((s) => [s.ref, s.parallels])).toEqual([
          ["Exod.20.3", ["Deut.5.7"]],
        ])
        expect(deuteronomy.book.sections.map((s) => [s.ref, s.parallels])).toEqual([
          ["Deut.5.30-Deut.5.33", undefined],
        ])
      }),
    )

    it.effect("heads a chapter's first verse whether or not a chapter entry opens it", () =>
      Effect.gen(function* () {
        const entries = yield* readZCom(
          "ot",
          buildModule("ot", [
            [
              { text: section("Exod.20", "e20", "The law is given."), slots: ["Exod.20"] },
              {
                text: `${pericope("Exodus 20:1-17", "Deuteronomy 5:6-21")}${section("Exod.20.1", "e1", "God spake all these words.")}`,
                slots: ["Exod.20.1"],
              },
              {
                text: `${pericope("Exodus 21:1-11", "Deuteronomy 15:12-18")}${section("Exod.21", "e21", "Of Hebrew servants.")}`,
                slots: ["Exod.21"],
              },
            ],
          ]),
        )
        const pericopes = yield* harmonyPericopes(entries, ["Exod", "Lev", "Num", "Deut"])
        const { book, misplaced } = yield* commentaryBookFromZCom(
          "calvin-commentaries",
          "Exod",
          entries,
          pericopes,
        )
        expect(misplaced).toEqual([])
        expect(book.sections.map((s) => [s.ref, s.parallels])).toEqual([
          ["Exod.20.1-Exod.20.17", ["Deut.5.6-Deut.5.21"]],
          ["Exod.21.1-Exod.21.11", ["Deut.15.12-Deut.15.18"]],
        ])
      }),
    )

    it.effect("gives a book read without its harmony no parallels and no pericope ends", () =>
      Effect.gen(function* () {
        const entries = yield* readZCom("nt", gospels)
        const { book } = yield* commentaryBookFromZCom("calvin-commentaries", "Mark", entries)
        expect(book.sections).toEqual([
          {
            ref: "Mark.4.12-Mark.4.41",
            paragraphs: [[{ text: "That seeing they may see." }]],
            notes: [],
          },
        ])
      }),
    )
  })

  describe("a zCom4 module, whose entries carry no section markers", () => {
    const sectionsOf = (
      work: "matthew-henry" | "jamieson-fausset-brown",
      testament: "ot" | "nt",
      book: "Prov" | "Obad" | "Exod" | "Matt" | "Gen" | "Phlm",
      blocks: Parameters<typeof buildModule>[1],
    ) =>
      Effect.gen(function* () {
        const entries = yield* readZCom(testament, buildModule(testament, blocks, "zCom4"), "zCom4")
        const read = yield* commentaryBookFromZCom(
          work,
          book,
          entries,
          new Map(),
          work === "matthew-henry" ? "introduction" : "chapter-title",
        )
        expect(read.misplaced).toEqual([])
        return read.book.sections.map((s) => [s.ref, s.paragraphs.map(plain)] as const)
      })

    it.effect("reads an entry past 65,535 bytes in full from its slot's 32-bit size", () =>
      Effect.gen(function* () {
        const long = `<div sID="a" type="x-p"/>${"Henry writes at length. ".repeat(3000)}Here the comment closes.<div eID="a" type="x-p"/>`
        expect(Buffer.byteLength(long)).toBeGreaterThan(65536)
        const entries = yield* readZCom(
          "ot",
          buildModule(
            "ot",
            [
              [
                { text: long, slots: ["Gen.1.1"] },
                // The real module links Genesis 4:11 and 4:12 to one entry and leaves the comment
                // on 4:12 unindexed after it.
                { text: sample("jfb/Gen.4.11"), slots: ["Gen.4.11", "Gen.4.12"] },
                { text: sample("jfb/Gen.4.11-unindexed") },
                { text: sample("jfb/Gen.4.13"), slots: ["Gen.4.13", "Gen.4.14"] },
              ],
            ],
            "zCom4",
          ),
          "zCom4",
        )
        expect(entries.map((entry) => [entry.slot, entry.text])).toEqual([
          ["Gen.1.1", long],
          ["Gen.4.11", sample("jfb/Gen.4.11") + sample("jfb/Gen.4.11-unindexed")],
          ["Gen.4.13", sample("jfb/Gen.4.13")],
        ])
      }),
    )

    it.effect("makes an entry linked over a range of verses one section covering the range", () =>
      Effect.gen(function* () {
        const sections = yield* sectionsOf("matthew-henry", "ot", "Prov", [
          [
            { text: sample("mhc/Prov.3.1"), slots: verseSlots("Prov", 3, 1, 6) },
            { text: sample("mhc/Prov.3.7"), slots: verseSlots("Prov", 3, 7, 12) },
            {
              text: `<div sID="p13" type="x-p"/> <hi type="super">13</hi> Happy is the man that findeth wisdom.<div eID="p13" type="x-p"/>`,
              slots: verseSlots("Prov", 3, 13, 35),
            },
          ],
        ])
        expect(sections.map(([ref]) => ref)).toEqual([
          "Prov.3.1-Prov.3.6",
          "Prov.3.7-Prov.3.12",
          "Prov.3.13-Prov.3.35",
        ])
        expect(sections[0]?.[1].slice(0, 2)).toEqual([
          "Communion Conferred by Wisdom.",
          "1 My son, forget not my law; but let thine heart keep my commandments: 2 For length of days, and long life, and peace, shall they add to thee. 3 Let not mercy and truth forsake thee: bind them about thy neck; write them upon the table of thine heart: 4 So shalt thou find favour and good understanding in the sight of God and man. 5 Trust in the Lord with all thine heart; and lean not unto thine own understanding. 6 In all thy ways acknowledge him, and he shall direct thy paths.",
        ])
        expect(sections[1]?.[1][0]).toBe("Consecration to God.")
      }),
    )

    it.effect("opens a chapter's first section with the introduction in the chapter's slot", () =>
      Effect.gen(function* () {
        const sections = yield* sectionsOf("matthew-henry", "ot", "Prov", [
          [
            { text: sample("mhc/Prov.3"), slots: ["Prov.3"] },
            { text: sample("mhc/Prov.3.1"), slots: verseSlots("Prov", 3, 1, 6) },
          ],
        ])
        expect(sections.map(([ref]) => ref)).toEqual(["Prov.3.1-Prov.3.35"])
        expect(sections[0]?.[1][0]).toMatch(
          /^This chapter is one of the most excellent in all this book.* From all this it appears what a tendency religion has to make men both blessed and blessings\.$/,
        )
        expect(sections[0]?.[1][1]).toBe("Communion Conferred by Wisdom.")
      }),
    )

    it.effect("leaves out a book's introduction and keeps the chapter's", () =>
      Effect.gen(function* () {
        const henry = yield* sectionsOf("matthew-henry", "ot", "Obad", [
          [
            { text: sample("mhc/Obad"), slots: ["Obad"] },
            { text: sample("mhc/Obad.1"), slots: ["Obad.1"] },
            {
              text: `<div eID="gen20265" type="x-p"/> <div eID="gen20264" type="introduction"/> <title type="x-s3">The Doom of Edom.</title> <div sID="o1" type="x-p"/> <hi type="super">1</hi> The vision of Obadiah.<div eID="o1" type="x-p"/>`,
              slots: verseSlots("Obad", 1, 1, 21),
            },
          ],
        ])
        expect(henry.map(([ref]) => ref)).toEqual(["Obad.1.1-Obad.1.21"])
        expect(henry[0]?.[1][0]).toMatch(/^This book is wholly concerning Edom/)
        expect(henry[0]?.[1].slice(1)).toEqual(["The Doom of Edom.", "1 The vision of Obadiah."])
        expect(JSON.stringify(henry)).not.toContain("shortest of all the books")

        const jfb = yield* sectionsOf("jamieson-fausset-brown", "ot", "Exod", [
          [
            { text: sample("jfb/Exod"), slots: ["Exod"] },
            { text: sample("jfb/Exod.1"), slots: ["Exod.1"] },
            { text: sample("jfb/Exod.1.1"), slots: ["Exod.1.1"] },
            { text: sample("jfb/Exod.1.7"), slots: ["Exod.1.7"] },
          ],
        ])
        expect(jfb.map(([ref]) => ref)).toEqual(["Exod.1.1-Exod.1.6", "Exod.1.7-Exod.1.22"])
        expect(jfb[0]?.[1]).toEqual([
          "Ex 1:1-22. Increase of the Israelites.",
          "1. Now these are the names--(See Ge 46:8-26).",
        ])

        // A book of one chapter has no chapter title, so its introduction runs to the verse.
        const philemon = yield* sectionsOf("jamieson-fausset-brown", "nt", "Phlm", [
          [
            { text: sample("jfb/Phlm.1"), slots: ["Phlm.1"] },
            { text: sample("jfb/Phlm.1.1"), slots: ["Phlm.1.1"] },
          ],
        ])
        expect(philemon.map(([ref, paragraphs]) => [ref, paragraphs[0]])).toEqual([
          [
            "Phlm.1.1-Phlm.1.25",
            `1. prisoner of Jesus Christ--one whom Christ's cause has made a prisoner (compare "in the bonds of the Gospel," (Phm 13). He does not call himself, as in other Epistles, "Paul an apostle," as he is writing familiarly, not authoritatively.`,
          ],
        ])
      }),
    )

    it.effect("starts a chapter's opening section at its first verse", () =>
      Effect.gen(function* () {
        // Jamieson-Fausset-Brown heads Genesis 6 from verse 1 but first comments on verse 2.
        const sections = yield* sectionsOf("jamieson-fausset-brown", "ot", "Gen", [
          [
            { text: sample("jfb/Gen.6.2"), slots: ["Gen.6.2"] },
            {
              text: '<div sID="g3" type="x-p"/>3. My spirit shall not always strive--<div eID="g3" type="x-p"/>',
              slots: ["Gen.6.3"],
            },
          ],
        ])
        expect(sections.map(([ref, paragraphs]) => [ref, paragraphs[0]])).toEqual([
          ["Gen.6.1-Gen.6.2", "Ge 6:1-22. Wickedness of the World."],
          ["Gen.6.3-Gen.6.22", "3. My spirit shall not always strive--"],
        ])
      }),
    )

    it.effect("gives a chapter held only in its chapter slot one section over the chapter", () =>
      Effect.gen(function* () {
        // Text after the chapter ends, such as the title of the next volume's preface that the
        // real module prints after Malachi 4, belongs to no chapter.
        const sections = yield* sectionsOf("jamieson-fausset-brown", "nt", "Matt", [
          [{ text: `${sample("jfb/Matt.24")} PREFACE`, slots: ["Matt.24"] }],
        ])
        expect(sections).toEqual([
          [
            "Matt.24.1-Matt.24.51",
            [
              "Mt 24:1-51. Christ's Prophecy of the Destruction of Jerusalem, and Warnings Suggested by It to Prepare for His Second Coming. ( = Mr 13:1-37; Lu 21:5-36).",
              "For the exposition, see on Mr 13:1-37.",
            ],
          ],
        ])
      }),
    )
  })
})
