import { MODERN, ORIGIN, testApp } from "../../apps/edge/test/support.ts"
import type { ToolCall, Transcript } from "./grade.ts"

const MESSAGES_URL = "https://api.anthropic.com/v1/messages"
const MAX_TURNS = 16

interface ToolDefinition {
  readonly name: string
  readonly description?: string
  readonly inputSchema: unknown
}

interface ToolResult {
  readonly content?: ReadonlyArray<{ readonly type: string; readonly text?: string }>
  readonly structuredContent?: unknown
  readonly isError?: boolean
}

interface McpReply {
  readonly result?: {
    readonly instructions?: string
    readonly tools?: ReadonlyArray<ToolDefinition>
  } & ToolResult
  readonly error?: { readonly code: number; readonly message: string }
}

type Send = (request: Request) => Promise<Response>

export const mcpClient = (endpoint: string, send: Send) => {
  let nextId = 1
  const request = async (method: string, params: Record<string, unknown> = {}) => {
    const name = params["name"]
    const response = await send(
      new Request(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
          "mcp-protocol-version": MODERN,
          "mcp-method": method,
          ...(typeof name === "string" ? { "mcp-name": name } : {}),
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: nextId++,
          method,
          params: {
            ...params,
            _meta: {
              "io.modelcontextprotocol/protocolVersion": MODERN,
              "io.modelcontextprotocol/clientCapabilities": {},
              "io.modelcontextprotocol/clientInfo": { name: "agent-evals", version: "0.0.0" },
            },
          },
        }),
      }),
    )
    const body = await response.text()
    const json = response.headers.get("content-type")?.includes("text/event-stream")
      ? body
          .split("\n")
          .filter((line) => line.startsWith("data: "))
          .map((line) => line.slice("data: ".length))
          .at(-1)
      : body
    const reply = JSON.parse(json ?? "{}") as McpReply
    if (reply.result === undefined)
      throw new Error(
        `MCP ${method} failed (HTTP ${response.status}): ${reply.error?.message ?? body}`,
      )
    return reply.result
  }

  return {
    instructions: async () => (await request("server/discover")).instructions,
    listTools: async () => (await request("tools/list")).tools ?? [],
    callTool: async (name: string, args: unknown): Promise<ToolCall> => {
      const result = await request("tools/call", { name, arguments: args })
      return {
        name,
        args,
        isError: result.isError === true,
        text: (result.content ?? []).map((block) => block.text ?? "").join("\n"),
        structured: result.structuredContent,
      }
    },
  }
}

export type McpClient = ReturnType<typeof mcpClient>

export interface Settings {
  readonly apiKey: string
  readonly model: string
  readonly endpoint: string | undefined
}

export const settings = (): Settings => {
  const apiKey = process.env["ANTHROPIC_API_KEY"]
  if (apiKey === undefined || apiKey === "")
    throw new Error("Set ANTHROPIC_API_KEY to run the agent evals.")
  return {
    apiKey,
    model: process.env["EVAL_MODEL"] ?? "claude-sonnet-5-5",
    endpoint: process.env["EVAL_ENDPOINT"],
  }
}

export const connect = (endpoint: string | undefined): McpClient => {
  if (endpoint !== undefined) return mcpClient(endpoint, (request) => fetch(request))
  const { app } = testApp()
  return mcpClient(`${ORIGIN}/mcp`, (request) => app.fetch(request))
}

interface ContentBlock {
  readonly type: string
  readonly text?: string
  readonly id?: string
  readonly name?: string
  readonly input?: unknown
}

interface ModelReply {
  readonly content: ReadonlyArray<ContentBlock>
  readonly stop_reason: string
}

interface Message {
  readonly role: "user" | "assistant"
  readonly content: string | ReadonlyArray<unknown>
}

const createMessage = async (
  options: Settings,
  body: {
    readonly system: string
    readonly tools: ReadonlyArray<unknown>
    readonly messages: ReadonlyArray<Message>
  },
): Promise<ModelReply> => {
  const response = await fetch(MESSAGES_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": options.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model: options.model, max_tokens: 16_000, ...body }),
  })
  if (!response.ok)
    throw new Error(`Messages API returned ${response.status}: ${await response.text()}`)
  return (await response.json()) as ModelReply
}

export const ask = async (
  question: string,
  options: Settings = settings(),
): Promise<Transcript> => {
  const client = connect(options.endpoint)
  const system = (await client.instructions()) ?? ""
  const tools = (await client.listTools()).map((tool) => ({
    name: tool.name,
    description: tool.description ?? "",
    input_schema: tool.inputSchema,
  }))
  const messages: Array<Message> = [{ role: "user", content: question }]
  const calls: Array<ToolCall> = []

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const reply = await createMessage(options, { system, tools, messages })
    messages.push({ role: "assistant", content: reply.content })
    if (reply.stop_reason !== "tool_use") {
      if (reply.stop_reason !== "end_turn")
        throw new Error(`The model stopped with ${reply.stop_reason} before answering.`)
      const answer = reply.content
        .filter((block) => block.type === "text")
        .map((block) => block.text ?? "")
        .join("\n")
      return { question, answer, calls }
    }
    const results = []
    for (const block of reply.content) {
      if (block.type !== "tool_use" || block.name === undefined) continue
      const call = await client.callTool(block.name, block.input ?? {})
      calls.push(call)
      results.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: call.text,
        is_error: call.isError,
      })
    }
    messages.push({ role: "user", content: results })
  }
  throw new Error(`The model did not answer within ${MAX_TURNS} turns.`)
}

export const report = (transcript: Transcript): void => {
  const calls = transcript.calls.map(
    (call) => `  ${call.name} ${JSON.stringify(call.args)}${call.isError ? " (error)" : ""}`,
  )
  console.log(
    [
      `Question: ${transcript.question}`,
      "Tool calls:",
      ...calls,
      "Answer:",
      transcript.answer,
    ].join("\n"),
  )
}
