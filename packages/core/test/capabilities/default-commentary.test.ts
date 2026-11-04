import { describe, expect, it } from "@effect/vitest"
import { Option } from "effect"
import { chooseDefaultCommentary, otherCoveringCommentaries } from "../../src/capabilities/index.ts"
import type { CatalogResource } from "../../src/shards/index.ts"

const commentary = (
  fields: Pick<CatalogResource, "id" | "ingested"> & Partial<CatalogResource>,
): CatalogResource => ({
  kind: "commentary",
  title: `Title of ${fields.id}`,
  creator: "Creator",
  edition: "Edition",
  language: "en",
  license: { spdx: "CC-PDM-1.0" },
  attribution: { text: "Credit line." },
  sourceUrl: "https://example.org/source",
  surfaces: ["web", "api", "mcp", "dataset"],
  status: { state: "active" },
  available: true,
  ...fields,
})

const CALVIN = commentary({
  id: "calvin-commentaries",
  scope: ["Gen", "Isa", "Rom"],
  ingested: [
    { book: "Gen", chapters: [1] },
    { book: "Isa", chapters: [52] },
  ],
})
const POOLE = commentary({ id: "poole-annotations", ingested: [{ book: "Prov", chapters: [3] }] })
const HENRY = commentary({
  id: "matthew-henry",
  ingested: [
    { book: "Gen", chapters: [1] },
    { book: "Prov", chapters: [3] },
    { book: "Isa", chapters: [53] },
  ],
})
const JFB = commentary({
  id: "jamieson-fausset-brown",
  ingested: [{ book: "Rev", chapters: [1] }],
})
// Sorts before Calvin by id, and holds every chapter below; it is not in the order, so never chosen.
const OTHER = commentary({
  id: "aaa-commentary",
  ingested: [
    { book: "Gen", chapters: [1] },
    { book: "Prov", chapters: [3] },
    { book: "Rev", chapters: [1] },
    { book: "Jude", chapters: [1] },
  ],
})

const CATALOG = [OTHER, CALVIN, HENRY, JFB, POOLE]

describe("chooseDefaultCommentary", () => {
  it("chooses Calvin where he holds the chapter, ahead of Henry who also does", () => {
    expect(chooseDefaultCommentary(CATALOG, { book: "Gen", chapter: 1 })).toEqual(
      Option.some("calvin-commentaries"),
    )
  })

  it("chooses Poole ahead of Henry outside Calvin's work", () => {
    expect(chooseDefaultCommentary(CATALOG, { book: "Prov", chapter: 3 })).toEqual(
      Option.some("poole-annotations"),
    )
  })

  it("chooses Henry outside Calvin's work when Poole is not in the catalog", () => {
    const withoutPoole = CATALOG.filter(({ id }) => id !== POOLE.id)
    expect(chooseDefaultCommentary(withoutPoole, { book: "Prov", chapter: 3 })).toEqual(
      Option.some("matthew-henry"),
    )
  })

  it("falls back past Calvin in a book he covers when his chapter is not ingested", () => {
    expect(chooseDefaultCommentary(CATALOG, { book: "Isa", chapter: 53 })).toEqual(
      Option.some("matthew-henry"),
    )
  })

  it("reaches Jamieson-Fausset-Brown last", () => {
    expect(chooseDefaultCommentary(CATALOG, { book: "Rev", chapter: 1 })).toEqual(
      Option.some("jamieson-fausset-brown"),
    )
  })

  it("skips a withdrawn commentator", () => {
    const withdrawnCalvin = CATALOG.map((resource) =>
      resource.id === CALVIN.id
        ? { ...resource, status: { state: "withdrawn" as const, reason: "Retracted." } }
        : resource,
    )
    expect(chooseDefaultCommentary(withdrawnCalvin, { book: "Gen", chapter: 1 })).toEqual(
      Option.some("matthew-henry"),
    )
  })

  it("skips a commentator whose scope leaves out the book, whatever its ingested list says", () => {
    const scopedPoole = CATALOG.map((resource) =>
      resource.id === POOLE.id ? { ...resource, scope: ["Gen" as const] } : resource,
    )
    expect(chooseDefaultCommentary(scopedPoole, { book: "Prov", chapter: 3 })).toEqual(
      Option.some("matthew-henry"),
    )
  })

  it("returns none for a chapter no commentator in the order holds", () => {
    expect(chooseDefaultCommentary(CATALOG, { book: "Jude", chapter: 1 })).toEqual(Option.none())
  })
})

describe("otherCoveringCommentaries", () => {
  const JOHN_3 = { book: "John", chapter: 3 } as const
  const calvin = commentary({
    id: "calvin-commentaries",
    name: "Calvin",
    creator: "John Calvin",
    ingested: [{ book: "John", chapters: [3] }],
  })
  const poole = commentary({
    id: "poole-annotations",
    name: "Poole",
    creator: "Matthew Poole and the divines who continued his work after Isaiah 58",
    ingested: [{ book: "John", chapters: [3] }],
  })
  const hutcheson = commentary({
    id: "hutcheson-john",
    name: "Hutcheson",
    creator: "George Hutcheson",
    scope: ["John"],
    ingested: [{ book: "John", chapters: [3] }],
  })
  const ids = (resources: ReadonlyArray<CatalogResource>) => resources.map(({ id }) => id)

  it("names every other commentator holding the chapter, in short-name order", () => {
    expect(ids(otherCoveringCommentaries([poole, calvin, hutcheson], JOHN_3, calvin.id))).toEqual([
      "hutcheson-john",
      "poole-annotations",
    ])
  })

  it("sorts an entry without a short name by its creator", () => {
    const westminster = commentary({
      id: "westminster-annotations",
      creator: "Divines appointed by Parliament",
      ingested: [{ book: "John", chapters: [3] }],
    })
    expect(
      ids(otherCoveringCommentaries([poole, westminster, calvin, hutcheson], JOHN_3, calvin.id)),
    ).toEqual(["westminster-annotations", "hutcheson-john", "poole-annotations"])
  })

  it("leaves out a withdrawn commentator that holds the chapter", () => {
    const withdrawnHutcheson = {
      ...hutcheson,
      status: { state: "withdrawn" as const, reason: "Retracted." },
    }
    expect(
      ids(otherCoveringCommentaries([calvin, poole, withdrawnHutcheson], JOHN_3, calvin.id)),
    ).toEqual(["poole-annotations"])
  })

  it("leaves out a commentator whose scope holds John but who has no ingested John 3", () => {
    const hutchesonWithoutJohn3 = {
      ...hutcheson,
      ingested: [{ book: "John" as const, chapters: [1, 2] }],
    }
    expect(
      ids(otherCoveringCommentaries([calvin, poole, hutchesonWithoutJohn3], JOHN_3, calvin.id)),
    ).toEqual(["poole-annotations"])
  })

  it("is empty when only the shown commentator holds the chapter", () => {
    const pooleWithoutJohn = { ...poole, ingested: [{ book: "Rom" as const, chapters: [8] }] }
    expect(otherCoveringCommentaries([calvin, pooleWithoutJohn], JOHN_3, calvin.id)).toEqual([])
  })
})
