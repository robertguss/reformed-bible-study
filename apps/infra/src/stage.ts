import { createHash } from "node:crypto"
import { fileURLToPath } from "node:url"

/** The Cloudflare account's workers.dev subdomain, where every stage is served until a custom domain is attached. */
export const WORKERS_SUBDOMAIN = "howtocode"

/** The GitHub repository whose releases carry the dataset archive. */
export const REPOSITORY = "robertguss/reformed-bible-study"

export const STAGES = ["preview", "production"] as const
export type Stage = (typeof STAGES)[number]

export const isStage = (value: string): value is Stage =>
  (STAGES as ReadonlyArray<string>).includes(value)

export interface Site {
  readonly stage: Stage
  readonly workerName: string
  /** The public origin the discovery files and the Worker's MCP origin check name. */
  readonly origin: string
  /** The assembled static assets: the web build, the release data and the discovery files. */
  readonly assetsDirectory: string
}

/**
 * The deploy target for a stage. Attaching a custom domain means giving the Worker a `domain` and
 * pointing `origin` at it.
 */
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
