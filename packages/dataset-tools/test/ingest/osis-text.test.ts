import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "@effect/vitest"
import type { TextRun } from "@reformed-bible/core"
import { Effect } from "effect"
import { parseOsisEntry } from "../../src/ingest/osis-text.ts"

const fixture = (name: string): string =>
  readFileSync(join(import.meta.dirname, "../fixtures/calvin-romans-sample", name), "utf8")

const plain = (runs: ReadonlyArray<TextRun>): string => runs.map((run) => run.text).join("")

const section = (body: string, ref = "Rom.1.1", id = "s1"): string =>
  `<div annotateRef="Bible:${ref}" osisID="${ref}" sID="${id}" type="section"/>${body}<div annotateRef="Bible:${ref}" eID="${id}" osisID="${ref}" type="section"/>`

describe("OSIS entry text", () => {
  it.effect("takes the entry's own verse reference and moves its notes out of the body", () =>
    Effect.gen(function* () {
      const {
        sections: [entry, ...rest],
      } = yield* parseOsisEntry(fixture("Matt.1.2.xml"))
      expect(rest).toEqual([])
      expect(entry?.ref).toBe("Matt.1.2")
      expect(entry?.paragraphs).toEqual([
        [
          { text: "2. Jacob begat Judah and his brethren", emphasis: true },
          {
            text: " While Matthew passes by in silence Ishmael, Abraham’s first-born, and Esau, who was Jacob’s elder brother, he properly assigns a place in the genealogy to the Twelve Patriarchs, on all of whom God had bestowed a similar favor of adoption. He therefore intimates, that the blessing promised in Christ does not refer to the tribe of Judah alone, but belongs equally to all the children of Jacob, whom God gathered into his Church, while Ishmael and Esau were treated as strangers.",
          },
        ],
      ])
      expect(entry?.notes).toEqual([
        [
          {
            text: "“Quum essent extranei.” — “En lieu qu'Ismael et Esau en avoyent este rejettez et bannis comme estrangers.” — “Whereas Ishmael and Esau were thrown out and banished from it as strangers.”",
          },
        ],
      ])
    }),
  )

  it.effect("keeps each paragraph of a note inside that one note", () =>
    Effect.gen(function* () {
      const {
        sections: [entry],
      } = yield* parseOsisEntry(fixture("Rom.8.28.xml"))
      expect(entry?.ref).toBe("Rom.8.28")
      expect(entry?.paragraphs).toHaveLength(5)
      const body = (entry?.paragraphs ?? []).map(plain).join("\n")
      expect(body).not.toContain("Hammond")
      expect(plain(entry?.paragraphs[4] ?? [])).toContain(
        "more distinctly set forth. Paul, however, no doubt made here",
      )
      expect(entry?.notes).toHaveLength(1)
      const note = plain(entry?.notes[0] ?? [])
      expect(note.startsWith("Hammond has a long note")).toBe(true)
      expect(note).toContain("modern Divines agree.\n\nGrotius very justly observes")
    }),
  )

  it.effect("leaves out text after the section ends, such as the next passage's translation", () =>
    Effect.gen(function* () {
      const { sections } = yield* parseOsisEntry(fixture("Rom.8.27.xml"))
      expect(sections.map((s) => s.ref)).toEqual(["Rom.8.27"])
      const all = sections
        .flatMap((s) => [...s.paragraphs, ...s.notes])
        .map(plain)
        .join("\n")
      expect(all).not.toContain("Novimus autem")
      expect(all).not.toContain("Romans 8:28-30")
    }),
  )

  it.effect("returns escaped markup such as a script element as literal text in a plain run", () =>
    Effect.gen(function* () {
      const {
        sections: [entry],
      } = yield* parseOsisEntry(section("Calvin &lt;script&gt;alert(1)&lt;/script&gt; &amp; Owen"))
      expect(entry?.paragraphs).toEqual([[{ text: "Calvin <script>alert(1)</script> & Owen" }]])
    }),
  )

  it.effect("does not expand an entity declared in a document type definition", () =>
    Effect.gen(function* () {
      const {
        sections: [entry],
      } = yield* parseOsisEntry(
        `<!DOCTYPE osis [<!ENTITY xxe "EXPANDED">]>${section("Before &xxe; after")}`,
      )
      expect(entry?.paragraphs).toEqual([[{ text: "Before &xxe; after" }]])
    }),
  )

  it.effect("starts a new paragraph at a self-closing p element", () =>
    Effect.gen(function* () {
      const {
        sections: [entry],
      } = yield* parseOsisEntry(section("First thought.<p/>Second thought."))
      expect(entry?.paragraphs).toEqual([
        [{ text: "First thought." }],
        [{ text: "Second thought." }],
      ])
    }),
  )

  it.effect("returns each section of an entry under its own reference, in order", () =>
    Effect.gen(function* () {
      const { sections } = yield* parseOsisEntry(
        [
          `<div annotateRef="Bible:Ps.1" osisID="Ps.1" sID="c1" type="section"/>`,
          "Psalm one opens.",
          section("On verse one.", "Ps.1.1", "v1"),
          " Calvin's version of verse two. ",
          section("On verse two.", "Ps.1.2", "v2"),
          section("More on verse two.", "Ps.1.2", "v2b"),
          `<div annotateRef="Bible:Ps.1" eID="c1" osisID="Ps.1" type="section"/>`,
          " Index of texts.",
        ].join(""),
      )
      expect(sections.map((s) => [s.ref, s.paragraphs.map(plain)])).toEqual([
        ["Ps.1", ["Psalm one opens."]],
        ["Ps.1.1", ["On verse one."]],
        ["Ps.1.2", ["On verse two.", "More on verse two."]],
      ])
    }),
  )

  it.effect(
    "reads the reference row of each table, after however many sections had begun before it",
    () =>
      Effect.gen(function* () {
        // As in Calvin's Harmony of the Gospels: a comment ends, then the next pericope's heading and
        // its table, whose first row names each gospel's passage and whose next row translates them.
        const cell = (body: string) =>
          `<cell> <div sID="c" type="x-p"/>${body}<div eID="c" type="x-p"/> </cell>`
        const { sections, tables } = yield* parseOsisEntry(
          [
            section("On verse forty-two.", "Matt.12.42", "s42"),
            `<div sID="h" type="x-p"/>MATTHEW 13:1-17; MARK 4:1-12<div eID="h" type="x-p"/>`,
            "<table> <row> ",
            cell(`<reference osisRef="Bible:Matt.13.1-Matt.13.17">Matthew 13:1-17</reference>`),
            cell(`<reference osisRef="Bible:Mark.4.1-Mark.4.12">Mark 4:1-12</reference>, 24-25`),
            cell("Luke<lb/> 8:1-10, 18"),
            "</row><row> ",
            cell(`<hi type="bold">1</hi>. And on the same day Jesus went out of the house.`),
            "</row> </table>",
          ].join(""),
        )
        expect(sections.map((s) => s.ref)).toEqual(["Matt.12.42"])
        expect(tables).toEqual([
          {
            firstRow: ["Matthew 13:1-17", "Mark 4:1-12, 24-25", "Luke 8:1-10, 18"],
            sectionsBefore: 1,
          },
        ])
      }),
  )
})
