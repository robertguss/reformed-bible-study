import type { TextRun } from "@reformed-bible/core"
import type { HtmlBuilder } from "foldkit/html"

export const runsView = <M>(runs: ReadonlyArray<TextRun>, h: HtmlBuilder<M>) =>
  runs.map((run) => (run.emphasis === true ? h.em([], [run.text]) : run.text))

export const paragraphsView = <M>(
  paragraphs: ReadonlyArray<ReadonlyArray<TextRun>>,
  h: HtmlBuilder<M>,
) => paragraphs.map((runs) => h.p([], runsView(runs, h)))
