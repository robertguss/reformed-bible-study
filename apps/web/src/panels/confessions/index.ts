import { type CitingArticle, type Envelope, findConfessionArticles } from "@reformed-bible/core"
import type { HtmlBuilder } from "foldkit/html"
import { load } from "../../content.ts"
import { confessionArticleHref } from "../../route.ts"
import { paragraphsView, runsView } from "../../text.ts"
import { catalogEntry, coverageView, focusNoun, type PanelContext } from "../context.ts"

/** The confession and catechism articles whose proof texts cite the passage in focus. */
export const fetchConfessionArticles = (focus: string) =>
  load(findConfessionArticles.handler({ ref: focus }))

const titleOf = (context: PanelContext, id: string) =>
  catalogEntry(context.catalog, id)?.title ?? id

/**
 * Confessions with citing articles come first, each with its articles; then one line naming the
 * confessions this release does not hold yet, and one naming those with no article on the verse.
 */
export const confessionsView = <M>(
  envelope: Envelope<CitingArticle>,
  context: PanelContext,
  h: HtmlBuilder<M>,
) => {
  const active = envelope.resources.filter((entry) => entry.status.state === "active")
  const withState = (coverage: string) =>
    active
      .filter((entry) => entry.coverage === coverage)
      .map((entry) => titleOf(context, entry.resourceId))
  const withdrawn = envelope.resources.flatMap((entry) =>
    entry.status.state === "withdrawn"
      ? [`${titleOf(context, entry.resourceId)} has been withdrawn: ${entry.status.reason}`]
      : [],
  )
  const noEntry = withState("no_entry")
  const notIngested = withState("not_ingested")
  return [
    ...active
      .filter((entry) => entry.coverage === "covered")
      .map((entry) =>
        h.keyed("section")(
          entry.resourceId,
          [h.Class("confession")],
          [
            h.h3([], [titleOf(context, entry.resourceId)]),
            h.ul(
              [],
              envelope.items
                .filter(({ value }) => value.confession === entry.resourceId)
                .map(({ value }) =>
                  h.keyed("li")(
                    value.articleId,
                    [h.Class("article")],
                    [
                      h.a(
                        [h.Href(confessionArticleHref(value.confession, value.articleId))],
                        [value.citation],
                      ),
                      " ",
                      h.span([h.Class("division")], [value.division]),
                      ...(value.question === undefined
                        ? []
                        : [h.p([h.Class("question")], runsView(value.question, h))]),
                      ...paragraphsView(value.paragraphs, h),
                    ],
                  ),
                ),
            ),
          ],
        ),
      ),
    ...coverageView(
      [
        ...(noEntry.length === 0
          ? []
          : [`No article cites ${focusNoun(context.passage)} in: ${noEntry.join(", ")}.`]),
        ...(notIngested.length === 0 ? [] : [`Not yet available: ${notIngested.join(", ")}.`]),
        ...withdrawn,
      ],
      h,
    ),
  ]
}
