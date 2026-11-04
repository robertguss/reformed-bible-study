import { Option } from "effect"
import type { CatalogResource } from "../shards/index.ts"
import { type ChapterRef, hasChapter } from "./shared.ts"

/**
 * The commentators the default commentary panel tries, first to last: Calvin, then Poole, Henry and
 * Jamieson-Fausset-Brown for the chapters Calvin's commentary does not hold. Hodge and Owen are left
 * out because Calvin covers every book they wrote on.
 */
export const DEFAULT_COMMENTARY_ORDER: ReadonlyArray<string> = [
  "calvin-commentaries",
  "poole-annotations",
  "matthew-henry",
  "jamieson-fausset-brown",
]

/**
 * The first commentator in the default order whose commentary holds the chapter: it is active, its
 * scope includes the chapter's book, and the catalog lists the chapter as ingested.
 */
export const chooseDefaultCommentary = (
  catalog: ReadonlyArray<CatalogResource>,
  chapter: ChapterRef,
): Option.Option<string> =>
  Option.fromUndefinedOr(
    DEFAULT_COMMENTARY_ORDER.find((id) =>
      catalog.some(
        (resource) =>
          resource.id === id && resource.kind === "commentary" && hasChapter(resource, chapter),
      ),
    ),
  )

const labelOf = (resource: CatalogResource): string => resource.name ?? resource.creator

/**
 * Every other commentator whose commentary holds the chapter, by the same test the default choice
 * uses, sorted by short name (the creator when the catalog gives none). The commentator shown is
 * left out.
 */
export const otherCoveringCommentaries = (
  catalog: ReadonlyArray<CatalogResource>,
  chapter: ChapterRef,
  shownId: string,
): ReadonlyArray<CatalogResource> =>
  catalog
    .filter(
      (resource) =>
        resource.id !== shownId && resource.kind === "commentary" && hasChapter(resource, chapter),
    )
    .sort((a, b) => {
      const [x, y] = [labelOf(a), labelOf(b)]
      return x < y ? -1 : x > y ? 1 : 0
    })

const rankOf = (id: string): number => {
  const rank = DEFAULT_COMMENTARY_ORDER.indexOf(id)
  return rank < 0 ? DEFAULT_COMMENTARY_ORDER.length : rank
}

/** Works in the default commentary order, then the rest by id. */
export const inDefaultCommentaryOrder = (
  works: ReadonlyArray<CatalogResource>,
): ReadonlyArray<CatalogResource> =>
  [...works].sort((a, b) => rankOf(a.id) - rankOf(b.id) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
