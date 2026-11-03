import { createHash } from "node:crypto"
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative, resolve } from "node:path"
import { Console, Effect } from "effect"
import { sourceCachePath } from "./source-cache.ts"
import { renderJson, renderReport, validateDataset, type DatasetFile } from "./validate/validate.ts"

const listFiles = (dir: string): ReadonlyArray<string> =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? listFiles(path) : [path]
  })

const cachedSourceHashes = (
  repoRoot: string,
  files: ReadonlyArray<DatasetFile>,
): Map<string, string> => {
  const hashes = new Map<string, string>()
  for (const file of files) {
    if (!file.path.endsWith("/resource.json")) continue
    let urls: ReadonlyArray<string> = []
    try {
      const record = JSON.parse(file.text) as {
        source?: { files?: ReadonlyArray<{ url?: unknown }> }
      }
      urls = (record.source?.files ?? []).flatMap((f) => (typeof f.url === "string" ? [f.url] : []))
    } catch {
      continue
    }
    for (const url of urls) {
      const cached = sourceCachePath(repoRoot, url)
      if (existsSync(cached))
        hashes.set(url, createHash("sha256").update(readFileSync(cached)).digest("hex"))
    }
  }
  return hashes
}

const validate = (args: ReadonlyArray<string>) =>
  Effect.gen(function* () {
    const repoRoot = resolve(import.meta.dirname, "../../..")
    const datasetRoot = join(repoRoot, "dataset")
    const paths = listFiles(datasetRoot).map((path) => relative(datasetRoot, path))
    const files = paths.map((path) => ({
      path,
      text: readFileSync(join(datasetRoot, path), "utf8"),
    }))
    const violations = validateDataset({
      files,
      existingPaths: new Set(paths),
      sourceHashes: cachedSourceHashes(repoRoot, files),
    })
    yield* Console.log(args.includes("--json") ? renderJson(violations) : renderReport(violations))
    return violations.length === 0
  })

const main = Effect.gen(function* () {
  const [command, ...args] = process.argv.slice(2)
  if (command === "validate") return yield* validate(args)
  yield* Console.error("usage: dataset-tools validate [--json]")
  return false
})

Effect.runPromise(main).then(
  (ok) => {
    process.exitCode = ok ? 0 : 1
  },
  (error: unknown) => {
    process.exitCode = 2
    throw error
  },
)
