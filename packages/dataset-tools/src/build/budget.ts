/**
 * Cloudflare's Workers Paid plan allows 100,000 static files per Worker version. The release's
 * payloads share that limit with the web build and the discovery files, so the build stops 5,000
 * short of it.
 */
export const DEFAULT_FILE_BUDGET = 95_000

export const exceedsBudget = (fileCount: number, budget: number): string | undefined =>
  fileCount > budget ? `${fileCount} files exceeds the budget of ${budget}` : undefined
