import { Effect, Schema } from "effect"
import { Command, Dom } from "foldkit"
import { load, pushUrl, replaceUrl } from "foldkit/navigation"
import { Message } from "./message.ts"

export const NavigateInternal = Command.define("NavigateInternal", {
  args: { url: Schema.String },
  messages: [Message.CompletedNavigateInternal],
  execute: ({ url }) => pushUrl(url).pipe(Effect.as(Message.CompletedNavigateInternal())),
})

/** Changes the address bar without adding a history entry, as selecting a verse does. */
export const ReplaceUrl = Command.define("ReplaceUrl", {
  args: { url: Schema.String },
  messages: [Message.CompletedReplaceUrl],
  execute: ({ url }) => replaceUrl(url).pipe(Effect.as(Message.CompletedReplaceUrl())),
})

export const LoadExternal = Command.define("LoadExternal", {
  args: { href: Schema.String },
  messages: [Message.CompletedLoadExternal],
  execute: ({ href }) => load(href).pipe(Effect.as(Message.CompletedLoadExternal())),
})

/** Brings a linked verse into view once its chapter has rendered. */
export const ScrollToVerse = Command.define("ScrollToVerse", {
  args: { verse: Schema.Int },
  messages: [Message.CompletedScrollToVerse],
  execute: ({ verse }) =>
    Dom.scrollIntoViewAfterPaint(`#v${verse}`, { block: "center" }).pipe(
      Effect.ignore,
      Effect.as(Message.CompletedScrollToVerse()),
    ),
})
