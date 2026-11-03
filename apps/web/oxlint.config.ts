import foldkitRecommended from "@foldkit/oxlint-plugin/recommended.json" with { type: "json" }
import { defineConfig } from "oxlint"
import root from "../../oxlint.config.ts"

// The root config stays the single source of shared rules. A config in this directory replaces
// it for files here, so it re-applies those rules, re-roots the overrides written for
// `apps/web/**`, and adds the Foldkit plugin's recommended rules for this app.
const WEB = "apps/web/**"

const rootOverrides = (root.overrides ?? []).flatMap((override) => {
  const files = override.files.filter((pattern) => pattern === WEB || pattern.startsWith("**"))
  return files.length === 0
    ? []
    : [{ ...override, files: files.map((pattern) => (pattern === WEB ? "**" : pattern)) }]
})

// Type-aware linting is switched on by the root config only.
const { options: _rootOnly, ...shared } = root

export default defineConfig({
  ...shared,
  jsPlugins: [...(root.jsPlugins ?? []), ...foldkitRecommended.jsPlugins],
  rules: { ...root.rules, ...foldkitRecommended.rules },
  overrides: [...rootOverrides, ...foldkitRecommended.overrides],
})
