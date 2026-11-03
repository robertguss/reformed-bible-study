import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "@effect/vitest"
import type { TextRun } from "@reformed-bible/core"
import { Effect } from "effect"
import { parseOsisEntry } from "../../src/ingest/osis-text.ts"

const fixture = (name: string): string =>
  readFileSync(join(import.meta.dirname, "../fixtures/calvin-romans-sample", name), "utf8")

const plain = (runs: ReadonlyArray<TextRun>): string => runs.map((run) => run.text).join("")

const section = (body: string): string =>
  `<div annotateRef="Bible:Rom.1.1" osisID="Rom.1.1" sID="s1" type="section"/>${body}<div annotateRef="Bible:Rom.1.1" eID="s1" osisID="Rom.1.1" type="section"/>`

describe("OSIS entry text", () => {
  it.effect("takes the entry's own verse reference and moves its notes out of the body", () =>
    Effect.gen(function* () {
      const entry = yield* parseOsisEntry(fixture("Matt.1.2.xml"))
      expect(entry.ref).toBe("Matt.1.2")
      expect(entry.paragraphs).toEqual([
        [
          { text: "2. Jacob begat Judah and his brethren", emphasis: true },
          {
            text: " While Matthew passes by in silence Ishmael, Abraham’s first-born, and Esau, who was Jacob’s elder brother, he properly assigns a place in the genealogy to the Twelve Patriarchs, on all of whom God had bestowed a similar favor of adoption. He therefore intimates, that the blessing promised in Christ does not refer to the tribe of Judah alone, but belongs equally to all the children of Jacob, whom God gathered into his Church, while Ishmael and Esau were treated as strangers.",
          },
        ],
      ])
      expect(entry.notes).toEqual([
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
      const entry = yield* parseOsisEntry(fixture("Rom.8.28.xml"))
      expect(entry.ref).toBe("Rom.8.28")
      expect(entry.paragraphs).toHaveLength(5)
      const body = entry.paragraphs.map(plain).join("\n")
      expect(body).not.toContain("Hammond")
      expect(plain(entry.paragraphs[4] ?? [])).toContain(
        "more distinctly set forth. Paul, however, no doubt made here",
      )
      expect(entry.notes).toHaveLength(1)
      const note = plain(entry.notes[0] ?? [])
      expect(note.startsWith("Hammond has a long note")).toBe(true)
      expect(note).toContain("modern Divines agree.\n\nGrotius very justly observes")
    }),
  )

  it.effect("leaves out text after the section ends, such as the next passage's translation", () =>
    Effect.gen(function* () {
      const entry = yield* parseOsisEntry(fixture("Rom.8.27.xml"))
      const all = [...entry.paragraphs, ...entry.notes].map(plain).join("\n")
      expect(all).not.toContain("Novimus autem")
      expect(all).not.toContain("Romans 8:28-30")
    }),
  )

  it.effect("returns escaped markup such as a script element as literal text in a plain run", () =>
    Effect.gen(function* () {
      const entry = yield* parseOsisEntry(
        section("Calvin &lt;script&gt;alert(1)&lt;/script&gt; &amp; Owen"),
      )
      expect(entry.paragraphs).toEqual([[{ text: "Calvin <script>alert(1)</script> & Owen" }]])
    }),
  )

  it.effect("does not expand an entity declared in a document type definition", () =>
    Effect.gen(function* () {
      const entry = yield* parseOsisEntry(
        `<!DOCTYPE osis [<!ENTITY xxe "EXPANDED">]>${section("Before &xxe; after")}`,
      )
      expect(entry.paragraphs).toEqual([[{ text: "Before &xxe; after" }]])
    }),
  )
})
