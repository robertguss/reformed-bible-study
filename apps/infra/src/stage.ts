import { createHash } from "node:crypto"
import { fileURLToPath } from "node:url"
import { parseArgs } from "node:util"

export const WORKERS_SUBDOMAIN = "howtocode"

export const REPOSITORY = "robertguss/reformed-bible-study"

export const STAGES = ["production"] as const
export type Stage = (typeof STAGES)[number]

export const isStage = (value: string): value is Stage =>
  (STAGES as ReadonlyArray<string>).includes(value)

/** Reads `--stage` from the command line, exiting with a usage line when it names no stage. */
export const stageFromArgs = (command: string): Stage => {
  const { values } = parseArgs({ options: { stage: { type: "string" } } })
  const stage = values.stage ?? ""
  if (!isStage(stage)) {
    console.error(`usage: ${command} --stage production`)
    process.exit(1)
  }
  return stage
}

export interface Site {
  readonly stage: Stage
  readonly workerName: string
  readonly origin: string
  readonly assetsDirectory: string
}

export const siteFor = (stage: Stage): Site => {
  const workerName = stage === "production" ? "reformed-bible" : `reformed-bible-${stage}`
  return {
    stage,
    workerName,
    origin: `https://${workerName}.${WORKERS_SUBDOMAIN}.workers.dev`,
    assetsDirectory: fileURLToPath(new URL(`../../../dist/site/${stage}`, import.meta.url)),
  }
}

/**
 * A numeric rate-limit namespace id unique to the stage and binding. Namespaces are shared by every
 * Worker in the account that names the same id, so stages must not reuse one.
 */
export const rateLimitNamespace = (stage: Stage, binding: string): number =>
  createHash("sha256").update(`${stage}:${binding}`).digest().readUInt32BE(0) % 1_000_000_000

export const archiveUrl = (lock: { readonly release: string; readonly archive: string }) =>
  `https://github.com/${REPOSITORY}/releases/download/dataset-${lock.release}/${lock.archive}`
