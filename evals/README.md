# Agent evals

These evals check that a real agent, given only this project's MCP tools,
answers Bible study questions from the tool results and credits its sources.
They are developer tooling. They call a model from your machine with your own
key. The deployed app never calls a model, and nothing here runs in CI or in
production.

## Running

```sh
ANTHROPIC_API_KEY=sk-ant-... pnpm evals
```

| Variable            | Default             | Meaning                                                                                                               |
| ------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `ANTHROPIC_API_KEY` | none (required)     | Your Anthropic API key. Without it, `pnpm evals` exits with a message.                                                |
| `EVAL_MODEL`        | `claude-sonnet-5-5` | The model that plays the agent.                                                                                       |
| `EVAL_ENDPOINT`     | in process          | A deployed `/mcp` URL, such as `https://reformed-bible.howtocode.workers.dev/mcp`. Unset, the Worker runs in process. |

By default the MCP server is the Worker running in process over the small test
release, the same one the parity tests use. Tool results are deterministic and
the only network traffic is the model calls. Set `EVAL_ENDPOINT` to run the same
questions against a deployed server and its real dataset. A run makes about a
dozen model calls.

The harness (`agent/harness.ts`) is a minimal MCP client. It reads the server's
instructions (`server/discover`) as the system prompt, offers the tools from
`tools/list` as Anthropic tools, runs each tool call with `tools/call`, and
passes the text result back, as a chat client would. It loops until the model
answers, and each eval prints the question, the tool calls and the answer.

## What is graded

Grading is deterministic, with no second model. The rules live in
`agent/grade.ts`, and `agent/grade.test.ts` checks them with canned transcripts
as part of `pnpm test`.

**Calvin and the confessions on Romans 8:28** (`agent/f2.eval.ts`). The question
is "What does John Calvin say about Romans 8:28, and which confession articles
cite that verse?"

- The agent calls `get_commentary` and `find_confession_articles` successfully.
- Every quoted span in the answer appears word for word in some tool result. A
  quoted span is text in double quotes (straight or curly) on one line, or a
  blockquote line. Spans under three words count as names or terms and are
  skipped. A blockquote line that starts with a dash is the answer's own credit
  line, not a quotation. Comparison ignores case, Markdown escapes, emphasis
  stars, and typographic quotes and dashes. A quotation may skip text with an
  ellipsis or a bracketed insertion, and each remaining piece must match.
- Every Westminster article the answer names was returned by a tool, and the
  answer gives that article's author, work, edition and license exactly as the
  result did (punctuation aside). Articles are recognised as `WCF 3.6`,
  `WLC Q45`, `WSC Q7` and the long forms ("Westminster Confession of Faith,
  chapter 5, section 7", "Larger Catechism Q. 45"). The license must be the SPDX
  id the tool gives, such as `CC-PDM-1.0`.

**Questions outside the dataset** (`agent/negative.eval.ts`):

- Asked for Calvin on Genesis 1:1, the agent says it is not covered.
- Asked for Matthew Henry on Romans 8:28, the agent says the source is not
  available.
- In both, any quotation must still come from a tool result.

"Says it is not covered" means the answer contains a negation followed closely
by a word for coverage or availability ("is not yet covered", "isn't available",
"doesn't include"). Read the printed answer when this check fails, since the
wording test is deliberately simple.

## Client smoke checklist

Run this by hand before launch, against the production `/mcp` URL,
`https://reformed-bible.howtocode.workers.dev/mcp`. The server needs no sign-in,
so choose "no authentication" wherever a client asks. Menu names change between
client versions. If a step below doesn't match, look for "custom connector",
"MCP server" or "developer mode".

### Connecting

- **Claude.ai**: Settings, then Connectors, then "Add custom connector". Give it
  a name and the `/mcp` URL, then turn the connector on in a new chat.
- **Claude Code**: `claude mcp add --transport http reformed-bible <url>/mcp`.
  Then run `/mcp` in a session to confirm it is connected and lists ten tools.
- **Cursor**: add the server to `~/.cursor/mcp.json` (or the project's
  `.cursor/mcp.json`), then check it shows as connected under Settings, MCP:

  ```json
  { "mcpServers": { "reformed-bible": { "url": "<url>/mcp" } } }
  ```

- **ChatGPT**: Settings, then Apps & Connectors, then Advanced, and turn on
  developer mode. Create a connector with the `/mcp` URL and no authentication,
  then add it to a chat from the tools menu.

### What to ask

Ask each question in a fresh chat with the connector enabled.

1. "What does John Calvin say about Romans 8:28, and which confession articles
   cite that verse?" Pass if the client calls the commentary and
   confession-article tools, quotes only what they returned, and credits each
   source with its author, work, edition and license.
2. "What does John Calvin say about Genesis 1:1?" Pass if it says the passage is
   not covered and does not quote Calvin from memory.
3. "What does Matthew Henry's commentary say about Romans 8:28?" Pass if it says
   the source is not available here.
4. "Show me Romans 17." Pass if it reports that the reference is out of range
   and offers Romans 16.

### Results

Record a pass or a fail for each question, with a short note on any failure (for
example, which quotation was not from a tool, or a missing credit).

| Client      | Date | Client version | 1. Calvin and confessions | 2. Genesis 1:1 | 3. Matthew Henry | 4. Romans 17 | Notes |
| ----------- | ---- | -------------- | ------------------------- | -------------- | ---------------- | ------------ | ----- |
| Claude.ai   |      |                |                           |                |                  |              |       |
| Claude Code |      |                |                           |                |                  |              |       |
| Cursor      |      |                |                           |                |                  |              |       |
| ChatGPT     |      |                |                           |                |                  |              |       |
