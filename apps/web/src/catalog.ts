import { listResources } from "@reformed-bible/core"
import { Effect } from "effect"
import { Command } from "foldkit"
import { type LoadError, load } from "./content.ts"
import { Message } from "./message.ts"

/** The catalog names the translations to pick from and the commentaries a panel can show. */
export const FetchCatalog = Command.define("FetchCatalog", {
  messages: [Message.SucceededFetchCatalog, Message.FailedFetchCatalog],
  execute: load(listResources.handler({})).pipe(
    Effect.map((envelope) =>
      Message.SucceededFetchCatalog({ resources: envelope.items.map(({ value }) => value) }),
    ),
    Effect.catch((error: LoadError) => Effect.succeed(Message.FailedFetchCatalog({ error }))),
  ),
})
