import { join } from "node:path"

/** Directory, relative to the repository root, where pinned source downloads are cached. */
export const SOURCE_CACHE_DIR = ".cache/sources"

/** Cache path of one source download, derived from its URL. */
export const sourceCachePath = (repoRoot: string, url: string): string =>
  join(repoRoot, SOURCE_CACHE_DIR, encodeURIComponent(url))
