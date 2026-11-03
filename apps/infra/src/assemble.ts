import { cpSync, existsSync, rmSync } from "node:fs"
import { join } from "node:path"
import { writeDiscoveryFiles } from "@reformed-bible/edge/discovery"
import releaseLock from "../../../dataset/release.lock.json" with { type: "json" }
import { archiveUrl, siteFor, stageFromArgs } from "./stage.ts"

const repoRoot = join(import.meta.dirname, "../../..")
const site = siteFor(stageFromArgs("assemble"))

const web = join(repoRoot, "apps/web/dist")
const data = join(repoRoot, "dist/release/data", releaseLock.release)
const inputs: ReadonlyArray<readonly [path: string, command: string]> = [
  [join(web, "index.html"), "pnpm --filter @reformed-bible/web build"],
  [data, "pnpm dataset:from-archive"],
]
const missing = inputs.filter(([path]) => !existsSync(path))
if (missing.length > 0) {
  for (const [path, command] of missing) console.error(`${path} is missing; run: ${command}`)
  process.exit(1)
}

rmSync(site.assetsDirectory, { recursive: true, force: true })
cpSync(web, site.assetsDirectory, { recursive: true })
cpSync(data, join(site.assetsDirectory, "data", releaseLock.release), { recursive: true })
writeDiscoveryFiles(site.assetsDirectory, {
  origin: site.origin,
  archiveUrl: archiveUrl(releaseLock),
})
console.log(
  `assembled ${site.assetsDirectory} for ${site.origin} with release ${releaseLock.release}`,
)
