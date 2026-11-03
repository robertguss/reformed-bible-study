import { defineConfig } from "oxfmt"

export default defineConfig({
  semi: false,
  printWidth: 100,
  ignorePatterns: ["docs/**", "pnpm-lock.yaml"],
})
