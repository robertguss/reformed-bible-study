import { Effect } from "effect"
import { Command } from "foldkit"
import { RELEASE } from "./content.ts"
import { Message } from "./message.ts"

// Keyed by this build's release, so the build a reload lands on may reload once itself.
const RELOADED_KEY = `reformed-bible:reloaded-from:${RELEASE}`

/**
 * A tab built against a replaced release asks for files the deploy no longer has. Reloading puts
 * it on the current build. A build reloads at most once per tab session, so a deploy that really
 * lacks a file shows the inline error instead of reloading forever.
 */
export const ReloadOntoCurrentBuild = Command.define("ReloadOntoCurrentBuild", {
  messages: [Message.StartedReload, Message.DeclinedRepeatReload],
  execute: Effect.sync(() => {
    if (window.sessionStorage.getItem(RELOADED_KEY) !== null) return Message.DeclinedRepeatReload()
    window.sessionStorage.setItem(RELOADED_KEY, "1")
    window.location.reload()
    return Message.StartedReload()
  }),
})
