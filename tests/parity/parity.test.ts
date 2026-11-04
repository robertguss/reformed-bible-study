/**
 * Parity: every capability is defined once, so the web app, the public API and MCP must return the
 * same envelope for the same request. One case list runs through four paths over the same built
 * release, and the differences the surfaces are meant to have are asserted, not excluded.
 */
import { describe, expect, it } from "@effect/vitest"
import { Effect, Layer, Schema } from "effect"
import {
  callTool,
  fakeLimiter,
  get,
  testApp,
  textOf,
  type McpMessage,
} from "../../apps/edge/test/support.ts"
import { RATE_LIMITS } from "../../apps/edge/src/rate-limit.ts"
import {
  call,
  FILES,
  fsStore,
  ORIGIN,
  RELEASE,
  staticHost,
} from "../../packages/core/test/capabilities/fixture.ts"
import type { AnyContract, Capability } from "../../packages/capability/src/index.ts"
import { layerFetch } from "../../packages/core/src/content-store/fetch.ts"
import {
  capabilities,
  type ContentStore,
  escapeMarkdown,
  findConfessionArticles,
  formatPassage,
  getCommentary,
  getConfessionArticle,
  getConfessionOutline,
  getCrossReferences,
  getLexiconEntry,
  getPassage,
  getVerseWords,
  listResources,
  type Passage,
  resolveReference,
  toOsis,
} from "../../packages/core/src/index.ts"
import cases from "./cases.json" with { type: "json" }

type Args = Readonly<Record<string, string>>

interface Case {
  readonly name: string
  readonly tool: string
  readonly args: Args
  /** Read this page of the result, following each path's own cursor from page one. */
  readonly page?: number
  /** The typed failure every path must report. */
  readonly fails?: string
}

const CASES: ReadonlyArray<Case> = cases

/** What one path answered: an envelope, a typed failure, or (MCP only) a tool error. */
type Outcome =
  | { readonly kind: "envelope"; readonly envelope: unknown; readonly text?: string }
  | { readonly kind: "failure"; readonly failure: unknown }
  | { readonly kind: "tool-error"; readonly text: string }

/** Runs a capability's handler in process and encodes its result as JSON, as the wire carries it. */
const runner =
  <C extends AnyContract, R>(capability: Capability<C, R>) =>
  (args: Args, store: Layer.Layer<ContentStore>) =>
    Schema.decodeEffect(capability.contract.input)(args).pipe(
      Effect.flatMap((input) => call(capability, input, store)),
      Effect.flatMap(Schema.encodeUnknownEffect(Schema.toCodecJson(capability.contract.output))),
      Effect.map((envelope): Outcome => ({ kind: "envelope", envelope })),
      Effect.catch((failure) =>
        Schema.encodeUnknownEffect(Schema.toCodecJson(capability.contract.failure))(failure).pipe(
          Effect.map((encoded): Outcome => ({ kind: "failure", failure: encoded })),
        ),
      ),
      Effect.orDie,
    )

const RUNNERS: Readonly<
  Record<string, (args: Args, store: Layer.Layer<ContentStore>) => Effect.Effect<Outcome>>
> = {
  list_resources: runner(listResources),
  resolve_reference: runner(resolveReference),
  get_passage: runner(getPassage),
  get_commentary: runner(getCommentary),
  find_confession_articles: runner(findConfessionArticles),
  get_confession_article: runner(getConfessionArticle),
  get_confession_outline: runner(getConfessionOutline),
  get_cross_references: runner(getCrossReferences),
  get_verse_words: runner(getVerseWords),
  get_lexicon_entry: runner(getLexiconEntry),
}

const runHandler = (tool: string, args: Args, store: Layer.Layer<ContentStore>) => {
  const run = RUNNERS[tool]
  if (run === undefined) throw new Error(`No capability is named ${tool}`)
  return run(args, store)
}

const cursorOf = (envelope: unknown): string | undefined => {
  if (typeof envelope !== "object" || envelope === null || !("cursor" in envelope)) return undefined
  return typeof envelope.cursor === "string" ? envelope.cursor : undefined
}

/** Requests page one, then follows that path's cursor until it reaches the case's page. */
const paged = (run: (args: Args) => Effect.Effect<Outcome>) => (testCase: Case) =>
  Effect.gen(function* () {
    let outcome = yield* run(testCase.args)
    for (let page = 2; page <= (testCase.page ?? 1); page++) {
      const cursor = outcome.kind === "envelope" ? cursorOf(outcome.envelope) : undefined
      if (cursor === undefined) throw new Error(`${testCase.name}: no cursor to page ${page}`)
      outcome = yield* run({ ...testCase.args, cursor })
    }
    return outcome
  })

/** The handler run directly, over the release's files on disk. */
const viaHandler = (testCase: Case) =>
  paged((args) => runHandler(testCase.tool, args, fsStore))(testCase)

/**
 * The handler run as the web app runs it: through the fetch content store, reading the published
 * static files. `requested` records every path the store fetched.
 */
const viaWeb = (testCase: Case, requested: Array<string> = []) => {
  const host = staticHost(FILES)
  const store = layerFetch({
    baseUrl: ORIGIN,
    release: RELEASE,
    fetch: (request) => {
      requested.push(new URL(request.url).pathname)
      return host(request)
    },
  })
  return paged((args) => runHandler(testCase.tool, args, store))(testCase)
}

type App = ReturnType<typeof testApp>["app"]

/** The public API path for a request, with path parameters filled and the rest as query. */
const apiPath = (tool: string, args: Args): string => {
  const route = capabilities.find((c) => c.contract.name === tool)?.contract.http
  if (route === undefined) throw new Error(`${tool} has no HTTP route`)
  let path: string = route.path
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(args)) {
    if (path.includes(`:${key}`)) path = path.replace(`:${key}`, encodeURIComponent(value))
    else query.set(key, value)
  }
  return query.size === 0 ? path : `${path}?${query.toString()}`
}

const apiRequest = (app: App, tool: string, args: Args) =>
  Effect.gen(function* () {
    const response = yield* get(app, apiPath(tool, args))
    const body: unknown = yield* Effect.promise(() => response.json())
    return { response, body }
  })

const viaApi = (testCase: Case, app: App = testApp().app) =>
  paged((args) =>
    Effect.gen(function* () {
      const { response, body } = yield* apiRequest(app, testCase.tool, args)
      if (response.status === 200) return { kind: "envelope", envelope: body } satisfies Outcome
      return { kind: "failure", failure: body } satisfies Outcome
    }),
  )(testCase)

const outcomeOfTool = (message: McpMessage | undefined): Outcome =>
  message?.result?.isError === true
    ? { kind: "tool-error", text: textOf(message) }
    : {
        kind: "envelope",
        envelope: message?.result?.structuredContent,
        text: textOf(message),
      }

const viaMcp = (testCase: Case, app: App = testApp().app) =>
  paged((args) =>
    Effect.map(callTool(app, testCase.tool, args), ({ message }) => outcomeOfTool(message)),
  )(testCase)

const SUCCEEDING = CASES.filter((testCase) => testCase.fails === undefined)
const FAILING = CASES.filter((testCase) => testCase.fails !== undefined)

interface Attributed {
  readonly items: ReadonlyArray<{
    readonly attribution: { readonly author: string; readonly license: string }
  }>
}

describe("parity across the handler, the web app, the public API and MCP", () => {
  it("covers the agreed cases", () => {
    expect(CASES.map((testCase) => testCase.name)).toEqual([
      "Romans 8:28 text",
      "Calvin on Romans 8:29",
      "Calvin on Mark 4:3, a parallel of his comment on Matthew 13",
      "confession articles citing Romans 8:28",
      "Heidelberg Catechism Question 1",
      "cross-references from Romans 8:28, page two",
      "original-language words of Romans 8:28",
      "Romans 17",
    ])
  })

  for (const testCase of SUCCEEDING)
    it.effect(`${testCase.name}: the same envelope on all four paths`, () =>
      Effect.gen(function* () {
        const handler = yield* viaHandler(testCase)
        const web = yield* viaWeb(testCase)
        const api = yield* viaApi(testCase)
        const mcp = yield* viaMcp(testCase)

        expect(handler.kind).toBe("envelope")
        if (handler.kind !== "envelope") return
        const items = (handler.envelope as Attributed).items
        expect(items.length).toBeGreaterThan(0)
        expect(web).toEqual(handler)
        expect(api).toEqual(handler)
        expect(mcp).toEqual({ ...handler, text: expect.any(String) })
      }),
    )

  for (const testCase of FAILING)
    it.effect(
      `${testCase.name}: the same typed failure and suggestion, a 422 body on the API and a tool error on MCP`,
      () =>
        Effect.gen(function* () {
          const handler = yield* viaHandler(testCase)
          const web = yield* viaWeb(testCase)
          const { app } = testApp()
          const { response, body } = yield* apiRequest(app, testCase.tool, testCase.args)
          const mcp = yield* viaMcp(testCase)

          expect(handler).toMatchObject({ kind: "failure", failure: { _tag: testCase.fails } })
          expect(web).toEqual(handler)
          expect(response.status).toBe(422)
          expect({ kind: "failure", failure: body }).toEqual(handler)

          if (handler.kind !== "failure") return
          const failure = handler.failure as {
            readonly reason: string
            readonly suggestion: Passage
          }
          expect(failure.suggestion).toEqual({
            start: { book: "Rom", chapter: 16, verse: 1 },
            end: { book: "Rom", chapter: 16, verse: 27 },
          })
          expect(mcp).toEqual({
            kind: "tool-error",
            text: [
              `"${testCase.args["ref"]}" is out of range. The nearest valid passage is ${formatPassage(failure.suggestion)}.`,
              JSON.stringify({
                error: "invalid_reference",
                reason: failure.reason,
                suggestion: toOsis(failure.suggestion),
              }),
            ].join("\n"),
          })
        }),
    )

  it.effect("MCP adds a Markdown text form that names each item's source and the release", () =>
    Effect.gen(function* () {
      for (const testCase of SUCCEEDING) {
        // The API body is the bare envelope (the parity cases above), so only MCP adds text.
        const mcp = yield* viaMcp(testCase)
        if (mcp.kind !== "envelope" || mcp.text === undefined) throw new Error(testCase.name)
        expect(() => JSON.parse(mcp.text ?? "")).toThrow()
        expect(mcp.text).toContain(`Dataset release ${RELEASE}.`)
        for (const { attribution } of (mcp.envelope as Attributed).items) {
          expect(mcp.text).toContain(escapeMarkdown(attribution.author))
          expect(mcp.text).toContain(`License: ${attribution.license}.`)
        }
      }
    }),
  )

  it.effect(
    "rate limits are a 429 on the API, a tool error on MCP, and never reach the web app",
    () =>
      Effect.gen(function* () {
        const [testCase] = SUCCEEDING
        if (testCase === undefined) throw new Error("no cases")
        const { app } = testApp({
          rateLimits: {
            api: fakeLimiter({ limit: 0 }),
            mcp: fakeLimiter({ limit: 0 }),
            vendor: fakeLimiter(RATE_LIMITS.vendor),
          },
        })

        const { response, body } = yield* apiRequest(app, testCase.tool, testCase.args)
        expect(response.status).toBe(429)
        expect(response.headers.get("retry-after")).toBe("60")
        expect(body).toEqual({ error: "rate_limited", retry_after_seconds: 60 })

        const mcp = yield* viaMcp(testCase, app)
        expect(mcp).toEqual({
          kind: "tool-error",
          text: 'Rate limit reached. Retry after 60 seconds.\n{"error":"rate_limited","retry_after_seconds":60}',
        })

        // The web app reads the release's static files and never calls the Worker's limited routes,
        // so the same request succeeds there however often it is made.
        const requested: Array<string> = []
        const handler = yield* viaHandler(testCase)
        for (let i = 0; i <= RATE_LIMITS.api.limit; i++)
          expect(yield* viaWeb(testCase, requested)).toEqual(handler)
        expect(requested.length).toBeGreaterThan(RATE_LIMITS.api.limit)
        expect(requested.every((path) => path.startsWith(`/data/${RELEASE}/`))).toBe(true)
      }),
  )
})
