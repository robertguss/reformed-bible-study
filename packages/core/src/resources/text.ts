import { Schema } from "effect"

/**
 * Zero-width, bidirectional-control and tag characters can hide instructions or reorder text
 * without the reader seeing it, so no dataset content may contain them.
 */
export const UNSAFE_CHARACTERS = new RegExp(
  // Matching control characters is the point of this pattern.
  // oxlint-disable-next-line no-control-regex
  "[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F\\u200B-\\u200F\\u202A-\\u202E\\u2060-\\u2064\\u2066-\\u2069\\uFEFF\\u{E0000}-\\u{E007F}]",
  "u",
)

export const hasUnsafeCharacters = (text: string): boolean => UNSAFE_CHARACTERS.test(text)

const MARKDOWN_LINK = /\[[^\]]*\]\([^)]*\)/
const HTML_TAG = /<\/?[a-z!][^>]*>/i
const URL_SCHEME = /\b[a-z][a-z0-9+.-]*:\/\//i

/** Free text in a resource record: no markup, no links, no hidden characters. */
export const PlainText = Schema.String.check(
  Schema.isMaxLength(2000),
  Schema.makeFilter((text: string) =>
    hasUnsafeCharacters(text)
      ? "must not contain invisible or bidirectional control characters"
      : MARKDOWN_LINK.test(text)
        ? "must not contain Markdown links"
        : HTML_TAG.test(text)
          ? "must not contain HTML tags"
          : URL_SCHEME.test(text)
            ? "must not contain URLs; use a URL field"
            : undefined,
  ),
)

/** An absolute https URL. */
export const HttpsUrl = Schema.String.check(
  Schema.isMaxLength(2000),
  Schema.makeFilter((text: string) => {
    if (hasUnsafeCharacters(text)) return "must not contain invisible characters"
    try {
      return new URL(text).protocol === "https:" ? undefined : "must use https"
    } catch {
      return "must be an absolute URL"
    }
  }),
)
