import {
  type CrossReferenceItem,
  type Envelope,
  getCrossReferences,
  passagePath,
} from "@reformed-bible/core"
import { Option } from "effect"
import type { HtmlBuilder } from "foldkit/html"
import { load } from "../../content.ts"
import { cursorInput } from "../commentary/index.ts"
import {
  coverageMessage,
  coverageView,
  focusNoun,
  type PanelContext,
  passageOfFocus,
} from "../context.ts"

export const fetchCrossReferences = (focus: string, cursor: Option.Option<string>) =>
  load(getCrossReferences.handler({ ref: focus, ...cursorInput(cursor) }))

export const crossReferencesView = <M>(
  envelope: Envelope<CrossReferenceItem>,
  context: PanelContext,
  h: HtmlBuilder<M>,
) => [
  ...coverageView(
    envelope.resources.flatMap((entry) =>
      Option.toArray(
        coverageMessage(
          entry,
          context,
          () => `There are no cross-references for ${focusNoun(context.passage)}.`,
        ),
      ),
    ),
    h,
  ),
  ...(envelope.items.length === 0
    ? []
    : [
        h.ul(
          [h.Class("cross-references")],
          envelope.items.map(({ value }) =>
            h.keyed("li")(
              `${value.from}>${value.target}`,
              [],
              [
                Option.match(passageOfFocus(value.target), {
                  onNone: () => value.display,
                  onSome: (passage) => h.a([h.Href(passagePath(passage))], [value.display]),
                }),
              ],
            ),
          ),
        ),
      ]),
]
