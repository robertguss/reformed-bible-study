import { Option } from "effect"
import type { Command } from "foldkit"
import { fromString, type Url } from "foldkit/url"
import { Message } from "../src/message.ts"
import type { Model } from "../src/model.ts"
import { init, update } from "../src/update.ts"
import { ORIGIN, runCommand, staticHost } from "./fixture.ts"

export const urlOf = (path: string): Url => Option.getOrThrow(fromString(`${ORIGIN}${path}`))

type AnyCommand = Command.Command<Message, never, never> | { readonly name: string }

/** Arguments of every pending Command with this name, in the order update returned them. */
export const argsOf = (commands: ReadonlyArray<AnyCommand> | undefined, name: string) =>
  (commands ?? [])
    .filter((command) => command.name === name)
    .map((command) => {
      const { args } = command as { readonly args?: unknown }
      return args
    })

/**
 * Runs every content Command against the fixture release and folds its result back through
 * update, until no content work is pending. Browser-only Commands (navigation, scrolling,
 * reloading) are left unrun: a test that cares about them asserts on them directly.
 */
export const settle = async (
  start: { readonly model: Model; readonly commands?: ReadonlyArray<unknown> },
  host = staticHost(),
): Promise<Model> => {
  let model = start.model
  let pending = [...(start.commands ?? [])] as Array<{
    readonly name: string
    readonly effect: never
  }>
  while (pending.length > 0) {
    const fetches = pending.filter((command) => command.name.startsWith("Fetch"))
    pending = []
    const messages = await Promise.all(fetches.map((command) => runCommand<Message>(command, host)))
    for (const message of messages) {
      const next = update(model, message)
      model = next.model
      pending.push(...((next.commands ?? []) as typeof pending))
    }
  }
  return model
}

/** The app as it stands once a URL has opened and its content has loaded. */
export const boot = (path: string, host = staticHost()) => settle(init(urlOf(path)), host)
