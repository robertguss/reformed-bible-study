import { Effect } from "effect"

/** How long an id is honoured after it was issued, however active the session. */
export const SESSION_LIFETIME_MS = 24 * 60 * 60 * 1000

const encoder = new TextEncoder()

const toBase64Url = (bytes: ArrayBuffer): string =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")

const fromBase64Url = (text: string): Uint8Array<ArrayBuffer> | undefined => {
  if (!/^[\w-]+$/.test(text) || text.length % 4 === 1) return undefined
  const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"))
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

const keys = new Map<string, Promise<CryptoKey>>()

const keyFor = (secret: string) =>
  Effect.promise(() => {
    const existing = keys.get(secret)
    if (existing !== undefined) return existing
    const key = crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"],
    )
    keys.set(secret, key)
    return key
  })

export const mintSessionId = (secret: string, now: number): Effect.Effect<string> =>
  Effect.gen(function* () {
    const payload = `${crypto.randomUUID()}.${now.toString(36)}`
    const key = yield* keyFor(secret)
    const signature = yield* Effect.promise(() =>
      crypto.subtle.sign("HMAC", key, encoder.encode(payload)),
    )
    return `${payload}.${toBase64Url(signature)}`
  })

export const verifySessionId = (secret: string, id: string, now: number): Effect.Effect<boolean> =>
  Effect.gen(function* () {
    const [uuid, issuedText, signatureText, ...rest] = id.split(".")
    if (uuid === undefined || issuedText === undefined || signatureText === undefined) return false
    if (rest.length > 0) return false
    const issued = Number.parseInt(issuedText, 36)
    // A minute of tolerance for clocks that differ between the locations minting and checking an id.
    if (!Number.isFinite(issued) || issued > now + 60_000 || now - issued > SESSION_LIFETIME_MS)
      return false
    const signature = fromBase64Url(signatureText)
    if (signature === undefined) return false
    const key = yield* keyFor(secret)
    return yield* Effect.promise(() =>
      crypto.subtle.verify("HMAC", key, signature, encoder.encode(`${uuid}.${issuedText}`)),
    )
  })
