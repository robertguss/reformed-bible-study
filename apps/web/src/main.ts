import { Runtime } from "foldkit"
import { contentLayer } from "./content.ts"
import { Message } from "./message.ts"
import { Model } from "./model.ts"
import { subscriptions } from "./subscriptions.ts"
import { init, update } from "./update.ts"
import { view } from "./view.ts"

const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  subscriptions,
  container: document.getElementById("root"),
  routing: {
    onUrlRequest: (request) => Message.ClickedLink({ request }),
    onUrlChange: (url) => Message.ChangedUrl({ url }),
  },
  // The handlers read this origin's static release files; the app never calls the public API.
  resources: contentLayer(window.location.origin),
  devTools: { Message },
})

Runtime.run(application)
