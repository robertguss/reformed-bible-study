import {
  chooseDefaultCommentary,
  type CommentaryItem,
  type Envelope,
  getCommentary,
  listResources,
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
 * never waits on the app's catalog load, then reads that commentator's comment. The catalog is
 * fixed for a release, so "show more" on the same focus chooses the same commentator again.
 */
export const fetchDefaultCommentary = (focus: string, cursor: Option.Option<string>) =>
  load(
    Effect.gen(function* () {
      const listing = yield* listResources.handler({})
      const catalog = listing.items.map(({ value }) => value)
      const work = Option.flatMap(
        Option.flatMap(passageOfFocus(focus), ({ start }) =>
          chooseDefaultCommentary(catalog, { book: start.book, chapter: start.chapter }),
        ),
        (id) => Option.fromUndefinedOr(catalog.find((resource) => resource.id === id)),
      )
      if (Option.isNone(work)) return Option.none()
      const envelope = yield* getCommentary.handler({
        ref: focus,
        work: work.value.id,
        ...cursorInput(cursor),
      })
      return Option.some({ work: work.value, envelope })
    }),
  )

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
      value.ref,
      [h.Class("commentary-section")],
      [
        h.h3([], [value.display]),
        ...paragraphsView(value.paragraphs, h),
        ...(value.notes.length === 0
          ? []
          : [h.div([h.Class("notes")], paragraphsView(value.notes, h))]),
      ],
    ),
  ),
]
