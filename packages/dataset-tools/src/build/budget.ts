/** Cloudflare's free plan allows 20,000 static files per deploy; the build stops short of that. */
export const DEFAULT_FILE_BUDGET = 18_000

export const exceedsBudget = (fileCount: number, budget: number): string | undefined =>
  fileCount > budget ? `${fileCount} files exceeds the budget of ${budget}` : undefined
