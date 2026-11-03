import { Context, Effect, Layer, Schema } from "effect"

import { defineContract, implement } from "../src/index.ts"

export class NotFound extends Schema.TaggedError<NotFound, { readonly brand: unique symbol }>()(
  "NotFound",
  { subject: Schema.String },
  { httpApiStatus: 404 },
) {
  override get message(): string {
    return `No one called ${this.subject}`
  }
}

export class Greeter extends Context.Service<
  Greeter,
  { readonly greet: (name: string) => Effect.Effect<string> }
>()("@reformed-bible/capability/test/Greeter", {
  make: Effect.succeed({ greet: (name: string) => Effect.succeed(`hello ${name}`) }),
}) {
  static readonly layer = Layer.effect(this, this.make)
}

const lookupContract = defineContract("lookup", {
  annotations: { idempotent: true, readOnly: true },
  description: "Read one item with an optional window",
  failure: NotFound,
  http: { method: "GET", path: "/items/:item" },
  input: Schema.Struct({
    item: Schema.String.annotate({ description: "Item to read" }),
    window: Schema.optional(Schema.Finite),
  }),
  output: Schema.Struct({ item: Schema.String, window: Schema.Finite }),
})

export const lookup = implement(lookupContract, ({ item, window }) =>
  item === "nobody"
    ? Effect.fail(new NotFound({ subject: item }))
    : Effect.succeed({ item, window: window ?? 60 }),
)

const greetContract = defineContract("greet", {
  annotations: { idempotent: true, readOnly: true },
  description: "Greet someone by name",
  failure: NotFound,
  http: { method: "GET", path: "/greet/:name" },
  input: Schema.Struct({ name: Schema.String }),
  output: Schema.Struct({ greeting: Schema.String }),
})

export const greet = implement(greetContract, ({ name }) =>
  name === "nobody"
    ? Effect.fail(new NotFound({ subject: name }))
    : Greeter.use((greeter) => greeter.greet(name)).pipe(Effect.map((greeting) => ({ greeting }))),
)

const noArgsContract = defineContract("noArgs", {
  annotations: { idempotent: true, readOnly: true },
  description: "Return a fixed value without input",
  failure: Schema.Never,
  http: { method: "GET", path: "/ready" },
  input: Schema.Struct({}),
  output: Schema.String,
})

export const noArgs = implement(noArgsContract, () => Effect.succeed("ready"))
