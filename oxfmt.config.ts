import { defineConfig } from "oxfmt"

export default defineConfig({
  semi: false,
  printWidth: 100,
  ignorePatterns: ["pnpm-lock.yaml"],
  overrides: [
    {
      // Prose wraps at 80; tables, code blocks and headings keep their lines.
      files: ["**/*.md"],
      // The MCP server sends this file to clients verbatim, so its line breaks stay as written.
      excludeFiles: ["apps/edge/src/mcp-instructions.md"],
      options: { printWidth: 80, proseWrap: "always" },
    },
  ],
})
