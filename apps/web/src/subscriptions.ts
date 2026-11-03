import { Dom, Subscription } from "foldkit"
import { Message } from "./message.ts"
import type { Model } from "./model.ts"

/** Below this width the panels move into a tabbed dock under the text. Keep in step with styles.css. */
export const NARROW_QUERY = "(max-width: 48rem)"

export const subscriptions = Subscription.make<Model, Message>()(() => ({
  viewport: Subscription.persistentEntry(
    Dom.streamFromMediaQuery({
      query: NARROW_QUERY,
      mapMatches: (isNarrow) => Message.ChangedViewportWidth({ isNarrow }),
    }),
  ),
}))
