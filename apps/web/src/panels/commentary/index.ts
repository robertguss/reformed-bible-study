import { type CommentaryItem, type Envelope, getCommentary } from "@reformed-bible/core"
import { Option } from "effect"
import type { HtmlBuilder } from "foldkit/html"
import { load } from "../../content.ts"
import { paragraphsView } from "../../text.ts"
import { coverageMessage, coverageView, focusNoun, type PanelContext } from "../context.ts"

export const cursorInput = (cursor: Option.Option<string>) =>
  Option.match(cursor, { onNone: () => ({}), onSome: (value) => ({ cursor: value }) })

export const fetchCommentary = (resourceId: string, focus: string, cursor: Option.Option<string>) =>
  load(getCommentary.handler({ ref: focus, work: resourceId, ...cursorInput(cursor) }))

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
