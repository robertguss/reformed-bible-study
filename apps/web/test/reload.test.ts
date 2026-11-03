import { Effect } from "effect"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ReloadOntoCurrentBuild } from "../src/reload.ts"

const run = () =>
  Effect.runSync(ReloadOntoCurrentBuild().effect as Effect.Effect<{ readonly _tag: string }>)

const memoryStorage = () => {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("reloading onto the current build", () => {
  it("reloads once per release and declines a second time", () => {
    const reload = vi.fn()
    vi.stubGlobal("window", { sessionStorage: memoryStorage(), location: { reload } })
    expect(run()._tag).toBe("StartedReload")
    expect(run()._tag).toBe("DeclinedRepeatReload")
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it("declines without reloading when session storage is blocked", () => {
    const reload = vi.fn()
    const blocked = () => {
      throw new DOMException("blocked", "SecurityError")
    }
    vi.stubGlobal("window", {
      sessionStorage: { getItem: blocked, setItem: blocked },
      location: { reload },
    })
    expect(run()._tag).toBe("DeclinedRepeatReload")
    expect(reload).not.toHaveBeenCalled()
  })
})
