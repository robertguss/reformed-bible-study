import { Schema } from "effect"

const C0_CONTROLS_EXCEPT_TAB_LF_CR = "\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F"
const ZERO_WIDTH_AND_DIRECTION_MARKS = "\\u200B-\\u200F"
const BIDI_EMBEDDINGS_AND_OVERRIDES = "\\u202A-\\u202E"
const INVISIBLE_OPERATORS = "\\u2060-\\u2064"
const BIDI_ISOLATES = "\\u2066-\\u2069"
const BYTE_ORDER_MARK = "\\uFEFF"
const TAG_CHARACTERS = "\\u{E0000}-\\u{E007F}"

export const UNSAFE_CHARACTERS = new RegExp(
  `[${C0_CONTROLS_EXCEPT_TAB_LF_CR}${ZERO_WIDTH_AND_DIRECTION_MARKS}${BIDI_EMBEDDINGS_AND_OVERRIDES}${INVISIBLE_OPERATORS}${BIDI_ISOLATES}${BYTE_ORDER_MARK}${TAG_CHARACTERS}]`,
  "u",
)

export const hasUnsafeCharacters = (text: string): boolean => UNSAFE_CHARACTERS.test(text)

const MARKDOWN_LINK = /\[[^\]]*\]\([^)]*\)/
const HTML_TAG = /<\/?[a-z!][^>]*>/i
const URL_SCHEME = /\b[a-z][a-z0-9+.-]*:\/\//i

export const PlainText = Schema.String.check(
  Schema.isMaxLength(2000),
  Schema.makeFilter((text: string) => {
    if (hasUnsafeCharacters(text))
      return "must not contain invisible or bidirectional control characters"
    if (MARKDOWN_LINK.test(text)) return "must not contain Markdown links"
    if (HTML_TAG.test(text)) return "must not contain HTML tags"
    if (URL_SCHEME.test(text)) return "must not contain URLs; use a URL field"
    return undefined
  }),
)

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
