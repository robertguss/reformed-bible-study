import { Runtime } from "foldkit"
import { contentLayer } from "./content.ts"
import { Flags, flags } from "./layout/storage.ts"
import { Message } from "./message.ts"
import { Model } from "./model.ts"
import { subscriptions } from "./subscriptions.ts"
import { init, update } from "./update.ts"
import { view } from "./view.ts"

const application = Runtime.makeApplication({
  Model,
  Flags,
  init,
  update,
  view,
  subscriptions,
  container: document.getElementById("root"),
  routing: {
    onUrlRequest: (request) => Message.ClickedLink({ request }),
    onUrlChange: (url) => Message.ChangedUrl({ url }),
  },
  resources: contentLayer(window.location.origin),
  devTools: { Message },
})

Runtime.run(application, { flags })
