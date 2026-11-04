import {
  type CatalogResource,
  chooseDefaultCommentary,
  type CommentaryItem,
  type Envelope,
  getCommentary,
  listResources,
  otherCoveringCommentaries,
  passagePath,
} from "@reformed-bible/core"
import { Effect, Option } from "effect"
import type { HtmlBuilder } from "foldkit/html"
import { load } from "../../content.ts"
import { paragraphsView } from "../../text.ts"
import {
  coverageMessage,
  coverageView,
  focusNoun,
  type PanelContext,
  passageOfFocus,
} from "../context.ts"

export const cursorInput = (cursor: Option.Option<string>) =>
  Option.match(cursor, { onNone: () => ({}), onSome: (value) => ({ cursor: value }) })

export const fetchCommentary = (resourceId: string, focus: string, cursor: Option.Option<string>) =>
  load(getCommentary.handler({ ref: focus, work: resourceId, ...cursorInput(cursor) }))

/**
 * Chooses the commentator for the focus's chapter from the release's own catalog, so the panel
 * never waits on the app's catalog load, then reads that commentator's comment and lists the other
 * commentators who hold the chapter. The catalog is fixed for a release, so "show more" on the
 * same focus chooses the same commentator again.
 */
export const fetchDefaultCommentary = (focus: string, cursor: Option.Option<string>) =>
  load(
    Effect.gen(function* () {
      const listing = yield* listResources.handler({})
      const catalog = listing.items.map(({ value }) => value)
      const chapter = Option.map(passageOfFocus(focus), ({ start }) => ({
        book: start.book,
        chapter: start.chapter,
      }))
      if (Option.isNone(chapter)) return Option.none()
      const work = Option.flatMap(chooseDefaultCommentary(catalog, chapter.value), (id) =>
        Option.fromUndefinedOr(catalog.find((resource) => resource.id === id)),
      )
      if (Option.isNone(work)) return Option.none()
      const envelope = yield* getCommentary.handler({
        ref: focus,
        work: work.value.id,
        ...cursorInput(cursor),
      })
      const others = otherCoveringCommentaries(catalog, chapter.value, work.value.id)
      return Option.some({ work: work.value, envelope, others })
    }),
  )

/**
 * "Also on this chapter: Hutcheson, Poole", each name a button that opens that commentator's panel.
 * Empty when no other commentator holds the chapter.
 */
export const otherCommentariesView = <M>(
  others: ReadonlyArray<CatalogResource>,
  select: (resourceId: string) => M,
  h: HtmlBuilder<M>,
) =>
  others.length === 0
    ? []
    : [
        h.p(
          [h.Class("also-on")],
          [
            "Also on this chapter: ",
            ...others.flatMap((resource, i) => [
              ...(i === 0 ? [] : [", "]),
              h.keyed("button")(
                resource.id,
                [h.Type("button"), h.OnClick(select(resource.id))],
                [resource.name ?? resource.creator],
              ),
            ]),
          ],
        ),
      ]

/** "Also treats Mark 4:1-12; Luke 8:1-10", each passage a link, for a comment from a harmony. */
const parallelsView = <M>(parallels: CommentaryItem["parallels"], h: HtmlBuilder<M>) =>
  parallels === undefined
    ? []
    : [
        h.p(
          [h.Class("parallels")],
          [
            "Also treats ",
            ...parallels.flatMap(({ osis, display }, i) => [
              ...(i === 0 ? [] : ["; "]),
              Option.match(passageOfFocus(osis), {
                onNone: () => display,
                onSome: (passage) => h.a([h.Href(passagePath(passage))], [display]),
              }),
            ]),
          ],
        ),
      ]

export const commentaryView = <M>(
  envelope: Envelope<CommentaryItem>,
  context: PanelContext,
  h: HtmlBuilder<M>,
) => [
  ...coverageView(
    envelope.resources.flatMap((entry) =>
      Option.toArray(
        coverageMessage(
          entry,
          context,
          (title) => `${title} has no comment on ${focusNoun(context.passage)}.`,
        ),
      ),
    ),
    h,
  ),
  ...envelope.items.map(({ value }) =>
    h.keyed("article")(
      `${value.ref}#${value.part?.index ?? 1}`,
      [h.Class("commentary-section")],
      [
        // Later parts of a long section follow the earlier ones, so they continue without a heading.
        ...((value.part?.index ?? 1) > 1
          ? []
          : [h.h3([], [value.display]), ...parallelsView(value.parallels, h)]),
        ...paragraphsView(value.paragraphs, h),
        ...(value.notes.length === 0
          ? []
          : [h.div([h.Class("notes")], paragraphsView(value.notes, h))]),
      ],
    ),
  ),
]
