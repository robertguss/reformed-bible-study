import { basename } from "node:path"
import { describe, expect, it } from "@effect/vitest"
import { sourceCachePath } from "../src/source-cache.ts"

describe("sourceCachePath", () => {
  it("keeps a short URL readable as its encoded form", () => {
    const url = "https://ebible.org/Scriptures/engwebp_usfm.zip"
    expect(basename(sourceCachePath("/repo", url))).toBe(encodeURIComponent(url))
  })

  it("names a long URL by a fixed-length hash that fits a filename", () => {
    const url = `https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master/${"Translators Amalgamated OT+NT/".repeat(8)}TAGNT.txt`
    const name = basename(sourceCachePath("/repo", url))
    expect(Buffer.byteLength(name)).toBeLessThanOrEqual(255)
    expect(name).not.toBe(basename(sourceCachePath("/repo", `${url}?other`)))
  })
})
