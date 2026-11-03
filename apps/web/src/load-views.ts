import type { HtmlBuilder } from "foldkit/html"
import { LoadError } from "./content.ts"

/** Shown while content loads, so a panel is never blank. */
export const loadingView = <M>(h: HtmlBuilder<M>) =>
  h.p([h.Class("loading"), h.Role("status")], ["Loading…"])

const detail = (error: LoadError): string =>
  LoadError.match(error, {
    Unavailable: () => "The content could not be reached.",
    Corrupt: () => "The content could not be read.",
    Missing: () => "The content is missing from this version of the site.",
    Rejected: ({ message }) => message,
  })

/**
 * A load failure, with a way to try again. This is never a coverage message: the reader is told
 * something went wrong, not that the passage lacks content.
 */
export const loadErrorView = <M>(error: LoadError, retry: M, h: HtmlBuilder<M>) =>
  h.div(
    [h.Class("load-error"), h.Role("alert")],
    [
      h.p([], [`Something went wrong loading this. ${detail(error)}`]),
      h.button([h.Type("button"), h.OnClick(retry)], ["Retry"]),
    ],
  )
