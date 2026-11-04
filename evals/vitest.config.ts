import { join } from "node:path"
import { defineConfig } from "vitest/config"

if ((process.env["ANTHROPIC_API_KEY"] ?? "") === "") {
  console.error(
    "pnpm evals needs ANTHROPIC_API_KEY: the agent evals call the Anthropic Messages API from this machine. See evals/README.md.",
  )
  process.exit(1)
}

export default defineConfig({
  test: {
    root: join(import.meta.dirname, ".."),
    include: ["evals/**/*.eval.ts"],
    testTimeout: 300_000,
    hookTimeout: 300_000,
    silent: false,
  },
})
