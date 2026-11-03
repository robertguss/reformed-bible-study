import { cpSync, existsSync, readFileSync, rmSync } from "node:fs"
import { join } from "node:path"
import { parseArgs } from "node:util"
import { writeDiscoveryFiles } from "@reformed-bible/edge/discovery"
import { archiveUrl, isStage, siteFor } from "./stage.ts"

/**
 * Assembles one stage's static assets: the web build, the locked release's data files and the
 * discovery files for the stage's origin. Only the locked release's data is included, so files
 * from a replaced release are no longer served.
 */
const repoRoot = join(import.meta.dirname, "../../..")
const { values } = parseArgs({ options: { stage: { type: "string" } } })
const stage = values.stage ?? ""
if (!isStage(stage)) {
  console.error("usage: assemble --stage <preview | production>")
  process.exit(1)
}

const lock = JSON.parse(readFileSync(join(repoRoot, "dataset/release.lock.json"), "utf8")) as {
  readonly release: string
  readonly archive: string
}
const web = join(repoRoot, "apps/web/dist")
const data = join(repoRoot, "dist/release/data", lock.release)
const missing = [
  [join(web, "index.html"), "pnpm --filter @reformed-bible/web build"],
  [data, "pnpm dataset:from-archive"],
].filter(([path]) => !existsSync(path ?? ""))
if (missing.length > 0) {
  for (const [path, command] of missing) console.error(`${path} is missing; run: ${command}`)
  process.exit(1)
}

const site = siteFor(stage)
rmSync(site.assetsDirectory, { recursive: true, force: true })
cpSync(web, site.assetsDirectory, { recursive: true })
cpSync(data, join(site.assetsDirectory, "data", lock.release), { recursive: true })
writeDiscoveryFiles(site.assetsDirectory, { origin: site.origin, archiveUrl: archiveUrl(lock) })
console.log(`assembled ${site.assetsDirectory} for ${site.origin} with release ${lock.release}`)
