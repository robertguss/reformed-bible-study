import { Effect } from "effect"
import type { VendorRanges } from "./vendor-ranges.ts"

/** Cloudflare's rate-limit binding: counts approximately, per location, over its configured period. */
export interface RateLimitBinding {
  readonly limit: (options: { readonly key: string }) => Promise<{ readonly success: boolean }>
}

/** Separate namespaces for the API, for MCP, and for the ceiling each agent vendor shares. */
export interface RateLimitBindings {
  readonly api: RateLimitBinding
  readonly mcp: RateLimitBinding
  readonly vendor: RateLimitBinding
}

/**
 * Starting limits per key and per 60 seconds, to be tuned after launch. The deploy declares each
 * binding with these values; the Worker only asks whether a key is within its limit.
 */
export const RATE_LIMITS = {
  api: { limit: 120, period: 60 },
  mcp: { limit: 60, period: 60 },
  vendor: { limit: 600, period: 60 },
} as const

/** Every namespace counts over 60 seconds, so a refused caller may retry after that long. */
export const RETRY_AFTER_SECONDS = 60

export type Surface = "api" | "mcp"

const parseIpv4 = (text: string): number | undefined => {
  const parts = text.split(".")
  if (parts.length !== 4) return undefined
  let value = 0
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part) || Number(part) > 255) return undefined
    value = value * 256 + Number(part)
  }
  return value
}

const parseIpv6 = (text: string): bigint | undefined => {
  if (!text.includes(":")) return undefined
  const [head = "", tail, ...rest] = text.split("::")
  if (rest.length > 0) return undefined
  const groups = (part: string) => (part === "" ? [] : part.split(":"))
  const left = groups(head)
  const right = tail === undefined ? [] : groups(tail)
  const missing = 8 - left.length - right.length
  if (tail === undefined ? missing !== 0 : missing < 1) return undefined
  const all = [...left, ...Array.from({ length: missing }, () => "0"), ...right]
  let value = 0n
  for (const group of all) {
    if (!/^[\da-f]{1,4}$/i.test(group)) return undefined
    value = (value << 16n) | BigInt(Number.parseInt(group, 16))
  }
  return value
}

interface Block {
  readonly vendor: string
  readonly matches: (address: string) => boolean
}

const blockOf = (vendor: string, cidr: string): Block => {
  const [network = "", bits = ""] = cidr.split("/")
  const prefix = Number(bits)
  const v4 = parseIpv4(network)
  if (v4 !== undefined) {
    const size = 2 ** (32 - prefix)
    const start = v4 - (v4 % size)
    return {
      vendor,
      matches: (address) => {
        const value = parseIpv4(address)
        return value !== undefined && value >= start && value < start + size
      },
    }
  }
  const v6 = parseIpv6(network)
  if (v6 === undefined) throw new Error(`Vendor range ${cidr} of ${vendor} is not a CIDR block`)
  const shift = BigInt(128 - prefix)
  return {
    vendor,
    matches: (address) => {
      const value = parseIpv6(address)
      return value !== undefined && value >> shift === v6 >> shift
    },
  }
}

const compiled = new WeakMap<ReadonlyArray<VendorRanges>, ReadonlyArray<Block>>()

/** The vendor whose published egress range holds the address, if any. */
export const vendorOf = (
  address: string,
  ranges: ReadonlyArray<VendorRanges>,
): string | undefined => {
  let blocks = compiled.get(ranges)
  if (blocks === undefined) {
    blocks = ranges.flatMap(({ vendor, cidrs }) => cidrs.map((cidr) => blockOf(vendor, cidr)))
    compiled.set(ranges, blocks)
  }
  return blocks.find((block) => block.matches(address))?.vendor
}

/** The address Cloudflare saw. Forwarding headers are client-controlled, so they are never read. */
const connectingAddress = (headers: Headers): string => headers.get("cf-connecting-ip") ?? "unknown"

/** The caller's rate-limit key: its IPv4 address, or its IPv6 /64, which one subscriber usually holds. */
export const clientAddress = (headers: Headers): string => {
  const address = connectingAddress(headers)
  const v6 = parseIpv6(address)
  if (v6 === undefined) return address
  const network = v6 >> 64n
  const groups = [48n, 32n, 16n, 0n].map((shift) => ((network >> shift) & 0xffffn).toString(16))
  return `${groups.join(":")}::/64`
}

interface Check {
  readonly binding: keyof RateLimitBindings
  readonly key: string
}

/**
 * Which buckets a request draws on. A direct caller has one bucket per address. Vendor traffic has
 * one bucket per vendor and verified session when it carries a session, and always also counts
 * against the vendor's shared ceiling; without a session it has only that ceiling.
 */
export const checksFor = (options: {
  readonly surface: Surface
  readonly headers: Headers
  readonly vendorRanges: ReadonlyArray<VendorRanges>
  readonly session?: string | undefined
}): ReadonlyArray<Check> => {
  const vendor = vendorOf(connectingAddress(options.headers), options.vendorRanges)
  if (vendor === undefined)
    return [{ binding: options.surface, key: clientAddress(options.headers) }]
  return [
    ...(options.session === undefined
      ? []
      : [{ binding: options.surface, key: `${vendor}:${options.session}` }]),
    { binding: "vendor", key: `${options.surface}:${vendor}` },
  ]
}

/** True when every bucket the request draws on still has room. */
export const withinLimits = (
  bindings: RateLimitBindings,
  checks: ReadonlyArray<Check>,
): Effect.Effect<boolean> =>
  Effect.gen(function* () {
    for (const { binding, key } of checks) {
      const { success } = yield* Effect.promise(() => bindings[binding].limit({ key }))
      if (!success) return false
    }
    return true
  })
