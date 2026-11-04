import { BOOK_IDS, CommentaryBook } from "@reformed-bible/core"
import { Effect } from "effect"
import { writeNormalized } from "../normalized.ts"
import {
  commentaryBookFromZCom,
  readZCom,
  type Testament,
  ZComError,
  type ZComFiles,
} from "./crosswire-zcom.ts"
import { download, type SourceSpec, unzipSafe } from "./download.ts"
import type { ChapterStart } from "./osis-text.ts"

/** A whole-Bible commentary from a CrossWire zCom4 module whose entries carry no section markers. */
export interface WholeBibleModule {
  readonly resourceId: string
  readonly source: SourceSpec
  /** The module's `DataPath` from its `.conf`, inside the zip. */
  readonly moduleDir: string
  readonly chapterStart: ChapterStart
}

export const HENRY: WholeBibleModule = {
  resourceId: "matthew-henry",
  source: {
    url: "https://www.crosswire.org/ftpmirror/pub/sword/packages/rawzip/MHC.zip",
    sha256: "6bcb936873ca144e317805e5c1677940fd86e2403f7c14517752e44f25c8882b",
    maxBytes: 64 * 1024 * 1024,
  },
  moduleDir: "modules/comments/zcom4/mhc",
  chapterStart: "introduction",
}

export const JFB: WholeBibleModule = {
  resourceId: "jamieson-fausset-brown",
  source: {
    url: "https://www.crosswire.org/ftpmirror/pub/sword/packages/rawzip/JFB.zip",
    sha256: "78eae01d4e4cea96aec496b4d4f149b582d6d7316c56c0b1f9ef07f8f784b2a6",
    maxBytes: 64 * 1024 * 1024,
  },
  moduleDir: "modules/comments/zcom/jfb",
  chapterStart: "chapter-title",
}

const testamentFiles = (
  files: Readonly<Record<string, Uint8Array>>,
  moduleDir: string,
  testament: Testament,
) =>
  Effect.gen(function* () {
    const read = (ext: string) => {
      const path = `${moduleDir}/${testament}.${ext}`
      const bytes = files[path]
      return bytes === undefined
        ? Effect.fail(new ZComError({ reason: "missing-file", detail: path }))
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
 * Reads every book of a whole-Bible commentary from its unzipped CrossWire module, one commentary
 * book per book of the Bible. Fails if any entry cannot be placed at its slot.
 */
export const wholeBibleBooks = (
  work: WholeBibleModule,
  files: Readonly<Record<string, Uint8Array>>,
) =>
  Effect.gen(function* () {
    const entries = [
      ...(yield* readZCom("ot", yield* testamentFiles(files, work.moduleDir, "ot"), "zCom4")),
      ...(yield* readZCom("nt", yield* testamentFiles(files, work.moduleDir, "nt"), "zCom4")),
    ]
    const books: Array<CommentaryBook> = []
    const misplaced: Array<string> = []
    for (const id of BOOK_IDS) {
      const read = yield* commentaryBookFromZCom(
        work.resourceId,
        id,
        entries,
        new Map(),
        work.chapterStart,
      )
      misplaced.push(...read.misplaced.map((m) => `${m.slot} holds ${m.ref ?? "no reference"}`))
      books.push(read.book)
    }
    if (misplaced.length > 0) {
      return yield* new ZComError({ reason: "misplaced-entries", detail: misplaced.join("; ") })
    }
    return books
  })

/**
 * Ingests a whole-Bible commentary from its pinned CrossWire module into one normalized commentary
 * file per book. Nothing is written if any entry cannot be placed.
 */
export const ingestWholeBible = (repoRoot: string, work: WholeBibleModule) =>
  Effect.gen(function* () {
    const archive = yield* download(repoRoot, work.source)
    const books = yield* wholeBibleBooks(work, yield* unzipSafe(archive))
    for (const book of books) {
      yield* writeNormalized(repoRoot, work.resourceId, `${book.book}.json`, CommentaryBook, book)
    }
    return { books: books.length, sections: books.reduce((n, b) => n + b.sections.length, 0) }
  })
