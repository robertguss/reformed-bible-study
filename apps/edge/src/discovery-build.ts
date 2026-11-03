import { parseArgs } from "node:util"
import { writeDiscoveryFiles } from "./discovery.ts"

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { origin: { type: "string" }, "archive-url": { type: "string" } },
})
const [directory] = positionals
const origin = values.origin
const archiveUrl = values["archive-url"]
if (directory === undefined || origin === undefined || archiveUrl === undefined) {
  console.error(
    "usage: discovery-build <directory> --origin <https://...> --archive-url <https://...>",
  )
  process.exit(1)
}
writeDiscoveryFiles(directory, { origin: origin.replace(/\/+$/, ""), archiveUrl })
