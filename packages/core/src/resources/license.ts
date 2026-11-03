/** Licenses a resource may carry without a written permission record. */
export const ALLOWED_LICENSES: ReadonlySet<string> = new Set([
  "CC-PDM-1.0",
  "CC0-1.0",
  "CC-BY-4.0",
  "CC-BY-SA-4.0",
  "Unlicense",
  "MIT",
  "LicenseRef-BSB-Dedication",
])

/** Licenses whose terms require crediting the creator wherever the content appears. */
export const ATTRIBUTION_REQUIRED: ReadonlySet<string> = new Set([
  "CC-BY-4.0",
  "CC-BY-SA-4.0",
  "MIT",
])

const LICENSE_URLS: Readonly<Record<string, string>> = {
  "CC-PDM-1.0": "https://creativecommons.org/publicdomain/mark/1.0/",
  "CC0-1.0": "https://creativecommons.org/publicdomain/zero/1.0/",
  "CC-BY-4.0": "https://creativecommons.org/licenses/by/4.0/",
  "CC-BY-SA-4.0": "https://creativecommons.org/licenses/by-sa/4.0/",
  Unlicense: "https://unlicense.org/",
  MIT: "https://opensource.org/license/mit",
  "LicenseRef-BSB-Dedication": "https://berean.bible/terms.htm",
}

/** Where a reader can read the terms of an SPDX license, when the project knows one. */
export const licenseUrl = (spdx: string): string | undefined => LICENSE_URLS[spdx]
