import { CommentaryBook } from "@reformed-bible/core"
import { Effect } from "effect"
import { writeNormalized } from "../normalized.ts"
import { commentaryBookFromZCom, readZCom, ZComError, type ZComFiles } from "./crosswire-zcom.ts"
import { download, unzipSafe } from "./download.ts"

export const CALVIN_RESOURCE_ID = "calvin-commentaries"

export const CALVIN_SOURCE = {
  url: "https://www.crosswire.org/ftpmirror/pub/sword/packages/rawzip/CalvinCommentaries.zip",
  sha256: "df66fc8c03537499ad006d069481d2c95b600887cdbd6ce75ec5d264b573192a",
  maxBytes: 64 * 1024 * 1024,
} as const

const MODULE_DIR = "modules/comments/zcom/calvincommentaries"

const newTestamentFiles = (files: Readonly<Record<string, Uint8Array>>) =>
  Effect.gen(function* () {
    const read = (ext: string) => {
      const bytes = files[`${MODULE_DIR}/nt.${ext}`]
      return bytes === undefined
        ? Effect.fail(new ZComError({ reason: "missing-file", detail: `${MODULE_DIR}/nt.${ext}` }))
        : Effect.succeed(bytes)
    }
    const module: ZComFiles = {
      bzs: yield* read("bzs"),
      bzv: yield* read("bzv"),
      bzz: yield* read("bzz"),
    }
    return module
  })

/**
 * Ingests Calvin's commentary on Romans from the pinned CrossWire module into the normalized
 * commentary file. Fails without writing if any Romans entry sits in a slot its own verse
 * reference disagrees with.
 */
export const ingestCalvin = (repoRoot: string) =>
  Effect.gen(function* () {
    const archive = yield* download(repoRoot, CALVIN_SOURCE)
    const entries = yield* readZCom("nt", yield* newTestamentFiles(yield* unzipSafe(archive)))
    const { book, misplaced } = yield* commentaryBookFromZCom(CALVIN_RESOURCE_ID, "Rom", entries)
    if (misplaced.length > 0) {
      return yield* new ZComError({
        reason: "misplaced-entries",
        detail: misplaced.map((m) => `${m.slot} holds ${m.ref ?? "no reference"}`).join("; "),
      })
    }
    yield* writeNormalized(repoRoot, CALVIN_RESOURCE_ID, "Rom.json", CommentaryBook, book)
    return { sections: book.sections.length }
  })
