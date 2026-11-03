import { type Envelope, getVerseWords, type VerseWords } from "@reformed-bible/core"
import { Option } from "effect"
import type { HtmlBuilder } from "foldkit/html"
import { load } from "../../content.ts"
import { coverageMessage, coverageView, focusNoun, type PanelContext } from "../context.ts"

/** The Greek or Hebrew words of the passage in focus, with Strong's numbers and glosses. */
export const fetchVerseWords = (focus: string) => load(getVerseWords.handler({ ref: focus }))

// Hebrew reads right to left and needs the language tag for correct shaping and fonts.
const script = (language: VerseWords["language"]) =>
  language === "hbo" ? { lang: "he", dir: "rtl" } : { lang: "grc", dir: "ltr" }

export const originalLanguageView = <M>(
  envelope: Envelope<VerseWords>,
  context: PanelContext,
  h: HtmlBuilder<M>,
) => {
  // Several original-language texts are catalogued; only the one covering this book speaks.
  const relevant = envelope.resources.filter((entry) => entry.coverage !== "outside_work")
  const messages =
    envelope.items.length > 0
      ? []
      : relevant.length === 0
        ? [`No original-language text covers ${focusNoun(context.passage)}.`]
        : relevant
            .slice(0, 1)
            .flatMap((entry) =>
              Option.toArray(
                coverageMessage(
                  entry,
                  context,
                  () => `There are no words for ${focusNoun(context.passage)}.`,
                ),
              ),
            )
  return [
    ...coverageView(messages, h),
    ...envelope.items.map(({ value }) => {
      const { lang, dir } = script(value.language)
      return h.keyed("section")(
        value.osis,
        [h.Class("verse-words")],
        [
          h.h3([], [`Verse ${value.verse}`]),
          h.ol(
            [h.Class("words"), h.Lang(lang), h.Dir(dir)],
            value.words.map((word) =>
              h.keyed("li")(
                `${word.position}`,
                [h.Class("word")],
                [
                  h.span([h.Class("surface")], [word.surface]),
                  h.span(
                    [h.Class("transliteration"), h.Lang("en"), h.Dir("ltr")],
                    [word.transliteration],
                  ),
                  h.span([h.Class("strongs"), h.Lang("en"), h.Dir("ltr")], [word.strongs]),
                  h.span([h.Class("gloss"), h.Lang("en"), h.Dir("ltr")], [word.gloss]),
                ],
              ),
            ),
          ),
          ...(value.notes.length === 0
            ? []
            : [
                h.ul(
                  [h.Class("textual-notes")],
                  value.notes.map((note) => h.keyed("li")(note, [], [note])),
                ),
              ]),
        ],
      )
    }),
  ]
}
