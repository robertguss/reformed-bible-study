import { Effect } from "effect"
import { Command } from "foldkit"
import { RELEASE } from "./content.ts"
import { Message } from "./message.ts"

const RELOADED_KEY = `reformed-bible:reloaded-from:${RELEASE}`

export const ReloadOntoCurrentBuild = Command.define("ReloadOntoCurrentBuild", {
  messages: [Message.StartedReload, Message.DeclinedRepeatReload],
  execute: Effect.sync(() => {
    if (window.sessionStorage.getItem(RELOADED_KEY) !== null) return Message.DeclinedRepeatReload()
    window.sessionStorage.setItem(RELOADED_KEY, "1")
    window.location.reload()
    return Message.StartedReload()
  }),
})
