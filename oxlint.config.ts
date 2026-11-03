import { recommended } from "@effect/tsgo/oxlint-presets"
import { defineConfig } from "oxlint"

export default defineConfig({
  ...recommended,
  options: { typeAware: true },
  categories: { correctness: "error", suspicious: "warn" },
  // Effect modules marked unstable are used on purpose and kept behind the capability package.
  rules: { ...recommended.rules, "effecttsgo/unstable-api-usage": "off" },
  ignorePatterns: ["**/dist/**", "**/node_modules/**", "docs/**"],
})
