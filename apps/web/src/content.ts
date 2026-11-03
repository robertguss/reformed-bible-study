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

export const RELEASE: string = releaseLock.release

export type AppServices = ContentStore | Site

export const contentLayer = (origin: string): Layer.Layer<AppServices> =>
  Layer.merge(layerFetch({ baseUrl: origin, release: RELEASE }), Site.layer(origin))

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
  return LoadError.Rejected({ message: error.message })
}

export const load = <A, E extends CapabilityFailure>(
  effect: Effect.Effect<A, E, AppServices>,
): Effect.Effect<A, LoadError, AppServices> => Effect.mapError(effect, toLoadError)
