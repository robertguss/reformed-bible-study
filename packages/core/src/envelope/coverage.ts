import { Schema } from "effect"
import { ResourceId, ResourceStatus } from "../resources/index.ts"

/**
 * Why a resource has or lacks content for a passage. Published API and tool schemas describe this
 * as an open set: clients treat an unknown state as `no_entry`, so adding a state is not breaking.
 */
export const CoverageStates = ["covered", "not_ingested", "outside_work", "no_entry"] as const
export const Coverage = Schema.Literals(CoverageStates)
export type Coverage = typeof Coverage.Type

export const ResourceCoverage = Schema.Struct({
  resourceId: ResourceId,
  coverage: Coverage,
  status: ResourceStatus,
})
export type ResourceCoverage = typeof ResourceCoverage.Type
