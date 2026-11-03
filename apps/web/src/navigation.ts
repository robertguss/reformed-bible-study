import { Effect, Schema } from "effect"
import { Command, Dom } from "foldkit"
import { load, pushUrl, replaceUrl } from "foldkit/navigation"
import { Message } from "./message.ts"

export const NavigateInternal = Command.define("NavigateInternal", {
  args: { url: Schema.String },
  messages: [Message.CompletedNavigateInternal],
  execute: ({ url }) => pushUrl(url).pipe(Effect.as(Message.CompletedNavigateInternal())),
})

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

export const ScrollToVerse = Command.define("ScrollToVerse", {
  args: { verse: Schema.Int, block: Schema.Literals(["center", "nearest"]) },
  messages: [Message.CompletedScrollToVerse],
  execute: ({ verse, block }) =>
    Dom.scrollIntoViewAfterPaint(`#v${verse}`, { block }).pipe(
      Effect.ignore,
      Effect.as(Message.CompletedScrollToVerse()),
    ),
})
