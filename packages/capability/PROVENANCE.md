# Provenance

This package is a copy of part of the `capability` package from rat-stack:

- Repository: https://github.com/joelhooks/rat-stack
- Commit: `81a12c4b86cd65bf86e4bdba98eda122d0133844` (main, resolved 2026-11-03)
- Upstream path: `packages/capability/`

The copy is maintained here and is not resynced with upstream. Changes upstream do not flow into this package, and changes here are not sent back.

## Files

| Here                                                                      | Upstream                    | Changes                                                                                                                                          |
| ------------------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/contract.ts`                                                         | `src/contract.ts`           | Import specifiers                                                                                                                                |
| `src/implement.ts`                                                        | `src/implement.ts`          | Import specifiers; one inert `@effect-diagnostics` directive replaced by the matching oxlint directive                                           |
| `src/call-watch.ts`                                                       | `src/call-watch.ts`         | Service key renamed                                                                                                                              |
| `src/approval.ts`                                                         | `src/approval.ts`           | Import specifiers; service key renamed                                                                                                           |
| `src/approval-denied.ts`                                                  | `src/approval-denied.ts`    | None beyond formatting                                                                                                                           |
| `src/input-json-schema.ts`                                                | `src/input-json-schema.ts`  | Import specifiers                                                                                                                                |
| `src/to-http-api.ts`                                                      | `src/to-http-api.ts`        | Import specifiers; middleware keys renamed                                                                                                       |
| `src/to-toolkit.ts`                                                       | `src/to-toolkit.ts`         | Import specifiers                                                                                                                                |
| `src/http-api.ts`                                                         | `src/http-api.ts`           | Import specifiers; also exports the group name as `HTTP_API_GROUP`                                                                               |
| `src/toolkit.ts`                                                          | `src/toolkit.ts`            | Import specifiers                                                                                                                                |
| `src/index.ts`                                                            | `src/index.ts`              | Rewritten: exports contracts, `implement`, approval and call watching only                                                                       |
| `test/mcp-harness.ts`                                                     | `test/mcp-harness.ts`       | Import specifiers; service key renamed                                                                                                           |
| `test/fixtures.ts`, `test/to-http-api.test.ts`, `test/to-toolkit.test.ts` | the files of the same names | Reduced to the cases this project relies on: GET routes with path and query input, typed failures, tool listing with annotations, and tool calls |

All changes:

- Import specifiers end in `.ts` instead of `.js`, because this workspace runs TypeScript sources directly.
- Service and middleware keys start with `@reformed-bible/capability/` instead of `@rat-stack/capability/`.
- Formatting follows this repository's formatter (no semicolons).
- The package root exports only contracts and handlers. The HTTP API projection is at `@reformed-bible/capability/http-api` and the toolkit (MCP) projection at `@reformed-bible/capability/toolkit`, so code that only runs handlers, such as the web app, never bundles them.
- Code mode, the sandbox, the command, RPC and catalog projections, `define.ts` and `actor-watch.ts` are left out.

The upstream commit already builds against Effect 4.1.2, the version this workspace pins, so no Effect API changes were needed.

## License

rat-stack is distributed under the MIT License:

```text
MIT License

Copyright (c) 2026 Joel Hooks

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
