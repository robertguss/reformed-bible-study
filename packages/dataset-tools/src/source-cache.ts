import { createHash } from "node:crypto"
import { join } from "node:path"

/** Directory, relative to the repository root, where pinned source downloads are cached. */
export const SOURCE_CACHE_DIR = ".cache/sources"

// File names are limited to 255 bytes; longer encoded URLs are named by their hash instead.
const MAX_READABLE_NAME = 200

/** Cache path of one source download, derived from its URL. */
export const sourceCachePath = (repoRoot: string, url: string): string => {
  const encoded = encodeURIComponent(url)
  const name =
    encoded.length <= MAX_READABLE_NAME
      ? encoded
      : `sha256-${createHash("sha256").update(url).digest("hex")}`
  return join(repoRoot, SOURCE_CACHE_DIR, name)
}
