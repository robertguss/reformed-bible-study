import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import { getCommentary } from "../../src/capabilities/index.ts"
import { call, CALVIN_ON_THE_SOWER, ORIGIN } from "./fixture.ts"

const CALVIN = "calvin-commentaries"

const link = (osis: string, display: string, path: string) => ({
  osis,
  display,
  url: `${ORIGIN}${path}`,
})

const SOWER_PARALLELS = [
  link("Mark.4.1-Mark.4.12", "Mark 4:1-12", "/mark/4/1-12"),
  link("Luke.8.1-Luke.8.10", "Luke 8:1-10", "/luke/8/1-10"),
]

/** Every section's own range for a request, following the cursor through each page. */
const refsOf = (ref: string) =>
  Effect.gen(function* () {
    const refs: Array<string> = []
    let cursor: string | undefined
    do {
      const result = yield* call(
        getCommentary,
        cursor === undefined ? { ref, work: CALVIN } : { ref, work: CALVIN, cursor },
      )
      refs.push(...result.items.map((item) => item.value.ref))
      cursor = result.cursor
    } while (cursor !== undefined)
    return refs
  })

describe("get_commentary on a passage a harmony comment treats as a parallel", () => {
  for (const ref of ["Mark 4:3", "Luke 8:5"])
    it.effect(`returns Calvin's sections on Matthew 13 for ${ref}, naming their parallels`, () =>
      Effect.gen(function* () {
        const result = yield* call(getCommentary, { ref, work: CALVIN })
        expect(
          result.items.slice(0, 2).map(({ value }) => [value.ref, value.display, value.parallels]),
        ).toEqual([
          ["Matt.13.2-Matt.13.8", "Matthew 13:2-8", SOWER_PARALLELS],
          ["Matt.13.9-Matt.13.17", "Matthew 13:9-17", SOWER_PARALLELS],
        ])
        expect(result.items[0]?.value.paragraphs).toEqual([[{ text: CALVIN_ON_THE_SOWER }]])
        expect(result.resources).toEqual([
          { resourceId: CALVIN, coverage: "covered", status: { state: "active" } },
        ])
      }),
    )

  it.effect("returns the mustard seed's section for Mark 4:30, not the sower's", () =>
    Effect.gen(function* () {
      expect(yield* refsOf("Mark 4:30")).toEqual(["Matt.13.31-Matt.13.32"])
    }),
  )

  it.effect("keeps a chapter's own section alongside those keyed to another gospel", () =>
    Effect.gen(function* () {
      expect(yield* refsOf("Mark 4")).toEqual([
        "Matt.13.2-Matt.13.8",
        "Matt.13.9-Matt.13.17",
        "Matt.13.31-Matt.13.32",
        "Mark.4.12",
      ])
    }),
  )

  it.effect("returns no Matthew 13 section for Mark 5", () =>
    Effect.gen(function* () {
      expect(yield* refsOf("Mark 5")).toEqual(["Matt.8.28-Matt.8.34", "Mark.5.1-Mark.5.20"])
    }),
  )

  it.effect(
    "returns a request across two chapters in canonical order, not chapter by chapter",
    () =>
      Effect.gen(function* () {
        expect(yield* refsOf("Mark 4-5")).toEqual([
          "Matt.8.28-Matt.8.34",
          "Matt.13.2-Matt.13.8",
          "Matt.13.9-Matt.13.17",
          "Matt.13.31-Matt.13.32",
          "Mark.4.12",
          "Mark.5.1-Mark.5.20",
        ])
      }),
  )

  it.effect(
    "returns a Harmony of the Law comment at its Deuteronomy parallel, under its own range",
    () =>
      Effect.gen(function* () {
        const result = yield* call(getCommentary, { ref: "Deut 5:7", work: CALVIN })
        expect(
          result.items.map(({ value }) => [value.ref, value.display, value.parallels]),
        ).toEqual([
          ["Exod.20.3", "Exodus 20:3", [link("Deut.5.7", "Deuteronomy 5:7", "/deuteronomy/5/7")]],
        ])
      }),
  )

  it.effect("leaves the field out of a section with no parallels", () =>
    Effect.gen(function* () {
      const result = yield* call(getCommentary, { ref: "Rom 8:29", work: CALVIN })
      expect(result.items.map(({ value }) => "parallels" in value)).toEqual([false])
    }),
  )
})
