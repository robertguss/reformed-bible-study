import {
  ContentCorrupt,
  ContentNotFound,
  type ContentStore,
  ContentUnavailable,
  Site,
} from "@reformed-bible/core"
import { layerFetch } from "@reformed-bible/core/content-store/fetch"
import { Effect, Layer, Schema } from "effect"
import { defineTaggedUnion } from "foldkit/schema"
import releaseLock from "../../../dataset/release.lock.json"

/** The dataset release this build reads, pinned at build time. */
export const RELEASE: string = releaseLock.release

/** Services the capability handlers need: the published release, and where the site is served. */
export type AppServices = ContentStore | Site

/**
 * The browser runs the same capability handlers as the Worker, reading release files from this
 * origin's `/data/<release>/` path. It never calls the public API.
 */
export const contentLayer = (origin: string): Layer.Layer<AppServices> =>
  Layer.merge(layerFetch({ baseUrl: origin, release: RELEASE }), Site.layer(origin))

/**
 * Why content could not be shown. These are load failures, never coverage: a reader sees a retry
 * message for them, not "not yet covered". `Missing` means this build asked for a file the deploy
 * no longer has, which a reload onto the current build fixes.
 */
export const LoadError = defineTaggedUnion({
  Unavailable: { reason: Schema.String },
  Corrupt: { reason: Schema.String },
  Missing: { path: Schema.String },
  Rejected: { message: Schema.String },
})
export type LoadError = typeof LoadError.Type

interface CapabilityFailure {
  readonly message: string
}

export const toLoadError = (error: CapabilityFailure): LoadError => {
  if (error instanceof ContentNotFound) return LoadError.Missing({ path: error.path })
  if (error instanceof ContentUnavailable) return LoadError.Unavailable({ reason: error.reason })
  if (error instanceof ContentCorrupt) return LoadError.Corrupt({ reason: error.reason })
  // Invalid references, unknown resources, stale cursors and missing entries: the request was wrong.
  return LoadError.Rejected({ message: error.message })
}

/** Runs a capability handler and turns its typed failures into a `LoadError`. */
export const load = <A, E extends CapabilityFailure>(
  effect: Effect.Effect<A, E, AppServices>,
): Effect.Effect<A, LoadError, AppServices> => Effect.mapError(effect, toLoadError)
