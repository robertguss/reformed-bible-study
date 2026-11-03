import { compareVerse, type Passage } from "./passage.ts"

/** True when the two passages share at least one verse. */
export const overlaps = (a: Passage, b: Passage): boolean =>
  compareVerse(a.start, b.end) <= 0 && compareVerse(b.start, a.end) <= 0

/** True when every verse of `inner` lies within `outer`. */
export const contains = (outer: Passage, inner: Passage): boolean =>
  compareVerse(outer.start, inner.start) <= 0 && compareVerse(inner.end, outer.end) <= 0
