import type { CatalogResource } from "@reformed-bible/core"
import { Option, Schema } from "effect"
import type { Update } from "foldkit"
import { modifyFields } from "foldkit/struct"
import type { AppServices } from "../content.ts"
import type { Message } from "../message.ts"
import { DEFAULT_TRANSLATION, type Model, Saved } from "../model.ts"
import { PanelSpec } from "../panels/panel.ts"
import { validReading } from "../reading.ts"
import { AppRoute } from "../route.ts"
import type { ReadingPosition } from "./layout-schema.ts"
import { SaveLayout } from "./storage.ts"

type UpdateReturn = Update.Return<Model, Message, AppServices>

const sameSaved = Schema.toEquivalence(Saved)

export const saveIfChanged = (before: Saved, result: UpdateReturn): UpdateReturn =>
  sameSaved(before, result.model.saved)
    ? result
    : {
        ...result,
        commands: [...(result.commands ?? []), SaveLayout({ saved: result.model.saved })],
      }

const positionOfRoute = (route: AppRoute): Option.Option<ReadingPosition> =>
  AppRoute.guards.Chapter(route) || AppRoute.guards.Verses(route)
    ? Option.map(validReading(route), ({ book, chapter, selection }) =>
        Option.match(selection, {
          onNone: () => ({ book, chapter }),
          onSome: ({ first }) => ({ book, chapter, verse: first }),
        }),
      )
    : Option.none()

export const recordPosition = (model: Model): Model =>
  Option.match(positionOfRoute(model.route), {
    onNone: () => model,
    onSome: (position) =>
      modifyFields(model, {
        saved: (saved) => modifyFields(saved, { readingPosition: () => Option.some(position) }),
      }),
  })

export const positionRoute = ({ book, chapter, verse }: ReadingPosition): AppRoute =>
  verse === undefined
    ? AppRoute.Chapter({ book, chapter, t: Option.none() })
    : AppRoute.Verses({ book, chapter, verses: { first: verse, last: verse }, t: Option.none() })

export const dropUnavailable = (
  saved: Saved,
  catalog: ReadonlyArray<CatalogResource>,
): { readonly saved: Saved; readonly removed: ReadonlyArray<string> } => {
  const nameIfGone = (id: string, kind: CatalogResource["kind"]): Option.Option<string> => {
    const resource = catalog.find((entry) => entry.id === id && entry.kind === kind)
    if (resource === undefined) return Option.some(id)
    return resource.status.state === "withdrawn" ? Option.some(resource.title) : Option.none()
  }
  const translation =
    saved.translation === DEFAULT_TRANSLATION
      ? Option.none<string>()
      : nameIfGone(saved.translation, "translation")
  const panels = saved.panels.map((spec) => ({
    spec,
    removed: PanelSpec.match(spec, {
      Commentary: ({ resourceId }) => nameIfGone(resourceId, "commentary"),
      Confessions: () => Option.none<string>(),
      CrossReferences: () => Option.none<string>(),
      OriginalLanguage: () => Option.none<string>(),
    }),
  }))
  return {
    saved: {
      ...saved,
      translation: Option.isSome(translation) ? DEFAULT_TRANSLATION : saved.translation,
      panels: panels.filter(({ removed }) => Option.isNone(removed)).map(({ spec }) => spec),
    },
    removed: [translation, ...panels.map(({ removed }) => removed)].flatMap(Option.toArray),
  }
}
