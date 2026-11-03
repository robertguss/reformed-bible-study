import type { TextRun } from "@reformed-bible/core"
import type { HtmlBuilder } from "foldkit/html"

/**
 * Inline text as the dataset stores it: plain runs with an emphasis flag. Each run becomes a text
 * node, so content can never become markup; a run holding `<script>` shows as those characters.
 */
export const runsView = <M>(runs: ReadonlyArray<TextRun>, h: HtmlBuilder<M>) =>
  runs.map((run) => (run.emphasis === true ? h.em([], [run.text]) : run.text))

export const paragraphsView = <M>(
  paragraphs: ReadonlyArray<ReadonlyArray<TextRun>>,
  h: HtmlBuilder<M>,
) => paragraphs.map((runs) => h.p([], runsView(runs, h)))
