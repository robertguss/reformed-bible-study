import {
  type Attribution,
  bookByOsis,
  type CatalogResource,
  formatPassage,
  parseOsis,
  type Passage,
  type ResourceCoverage,
} from "@reformed-bible/core"
import { Option, Result } from "effect"
import type { HtmlBuilder } from "foldkit/html"
import { attributionOfResource } from "../attribution.ts"

/** What a panel's content needs besides its result: the catalog, and the passage in focus. */
export interface PanelContext {
  readonly catalog: ReadonlyArray<CatalogResource>
  readonly passage: Passage
}

export const passageOfFocus = (focus: string): Option.Option<Passage> =>
  Result.getSuccess(parseOsis(focus))

export const focusLabel = (passage: Passage): string => formatPassage(passage)

const isOneVerse = ({ start, end }: Passage): boolean =>
  start.book === end.book && start.chapter === end.chapter && start.verse === end.verse

/** "this verse" or "this passage", whichever the reader has in focus. */
export const focusNoun = (passage: Passage): string =>
  isOneVerse(passage) ? "this verse" : "this passage"

export const catalogEntry = (
  catalog: ReadonlyArray<CatalogResource>,
  resourceId: string,
): CatalogResource | undefined => catalog.find((resource) => resource.id === resourceId)

/**
 * The reader-facing message for a resource that has nothing to show here. Each coverage state says
 * something different: not ingested yet, a book the author never wrote on, or a work with no entry
 * for the verse. A withdrawn resource shows why it was withdrawn.
 */
export const coverageMessage = (
  entry: ResourceCoverage,
  context: PanelContext,
  noEntry: (title: string) => string,
): Option.Option<string> => {
  const resource = catalogEntry(context.catalog, entry.resourceId)
  const title = resource?.title ?? entry.resourceId
  if (entry.status.state === "withdrawn")
    return Option.some(`${title} has been withdrawn: ${entry.status.reason}`)
  switch (entry.coverage) {
    case "covered":
      return Option.none()
    case "not_ingested":
      return Option.some(`${focusLabel(context.passage)} is not yet covered.`)
    case "outside_work": {
      const book = bookByOsis(context.passage.start.book)?.name ?? context.passage.start.book
      return Option.some(`${resource?.creator ?? title} did not write on ${book}.`)
    }
    default:
      // `no_entry`, and any coverage state a newer release adds.
      return Option.some(noEntry(title))
  }
}

export const coverageView = <M>(messages: ReadonlyArray<string>, h: HtmlBuilder<M>) =>
  messages.map((message) => h.keyed("p")(message, [h.Class("coverage")], [message]))

export const resourceAttributions = (
  context: PanelContext,
  resourceIds: ReadonlyArray<string>,
): ReadonlyArray<Attribution> =>
  resourceIds.flatMap((id) => {
    const resource = catalogEntry(context.catalog, id)
    return resource === undefined ? [] : [attributionOfResource(resource)]
  })
