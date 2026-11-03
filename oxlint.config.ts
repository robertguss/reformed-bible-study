import { recommended } from "@effect/tsgo/oxlint-presets"
import { defineConfig } from "oxlint"

export default defineConfig({
  ...recommended,
  options: { typeAware: true },
  categories: { correctness: "error", suspicious: "warn" },
  // Effect modules marked unstable are used on purpose and kept behind the capability package.
  rules: { ...recommended.rules, "effecttsgo/unstable-api-usage": "off" },
  overrides: [
    {
      files: ["apps/web/**"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: [
                  "@reformed-bible/dataset-tools",
                  "@reformed-bible/dataset-tools/*",
                  "**/dataset-tools/**",
                ],
                message: "dataset-tools is Node-only and must not reach the browser.",
              },
              {
                group: [
                  "@reformed-bible/capability/http-api",
                  "@reformed-bible/capability/toolkit",
                  "**/capability/src/to-http-api*",
                  "**/capability/src/to-toolkit*",
                ],
                message:
                  "The web app runs handlers directly; API and MCP projections belong to the edge app.",
              },
            ],
          },
        ],
      },
    },
    {
      files: ["apps/edge/**"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: [
                  "@reformed-bible/dataset-tools",
                  "@reformed-bible/dataset-tools/*",
                  "**/dataset-tools/**",
                ],
                message: "dataset-tools is Node-only and must not reach the Worker.",
              },
            ],
          },
        ],
      },
    },
    {
      files: ["**/test/**"],
      rules: { "effecttsgo/strict-effect-provide": "off" },
    },
  ],
  ignorePatterns: ["**/dist/**", "**/node_modules/**", "docs/**"],
})
