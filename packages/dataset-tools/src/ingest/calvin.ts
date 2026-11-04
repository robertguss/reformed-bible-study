import { readFileSync } from "node:fs"
import { join } from "node:path"
import { BOOK_IDS, CommentaryBook, ResourceRecord, type BookId } from "@reformed-bible/core"
import { Effect, Schema } from "effect"
import { writeNormalized } from "../normalized.ts"
import {
  commentaryBookFromZCom,
  type HarmonyPericopes,
  harmonyPericopes,
  readZCom,
  testamentFiles,
  ZComError,
} from "./crosswire-zcom.ts"
import { download, unzipSafe } from "./download.ts"

export const CALVIN_RESOURCE_ID = "calvin-commentaries"

export const CALVIN_SOURCE = {
  url: "https://www.crosswire.org/ftpmirror/pub/sword/packages/rawzip/CalvinCommentaries.zip",
  sha256: "df66fc8c03537499ad006d069481d2c95b600887cdbd6ce75ec5d264b573192a",
  maxBytes: 64 * 1024 * 1024,
} as const

const MODULE_DIR = "modules/comments/zcom/calvincommentaries"

/**
 * Calvin died while lecturing on Ezekiel 20. The module's one later entry, at Ezekiel 21:1, is the
 * translator's note that the commentary ends there, so Ezekiel stops at chapter 20.
 */
const LAST_EZEKIEL_CHAPTER = 20

/**
 * Calvin's two harmonies: the Gospels, keyed to Matthew, Mark and Luke, and the Law, keyed to
 * Exodus through Deuteronomy. Only their pericope headings give parallels; tables elsewhere, such
 * as an argument's or a back-matter index's, cite other books without heading a parallel comment.
 */
const HARMONIES: ReadonlyArray<ReadonlyArray<BookId>> = [
  ["Matt", "Mark", "Luke"],
  ["Exod", "Lev", "Num", "Deut"],
]

const ofCalvin = (book: CommentaryBook): CommentaryBook =>
  book.book !== "Ezek"
    ? book
    : {
        ...book,
        sections: book.sections.filter((s) => Number(s.ref.split(".")[1]) <= LAST_EZEKIEL_CHAPTER),
      }

/**
 * Reads Calvin's commentary on every book in `scope` from the unzipped CrossWire module, one
 * commentary book per scoped book, with Ezekiel ending where Calvin's commentary does and each
 * harmony comment naming its parallels. Fails if any entry sits in a slot its own verse reference
 * disagrees with.
 */
export const calvinBooks = (
  files: Readonly<Record<string, Uint8Array>>,
  scope: ReadonlyArray<BookId>,
) =>
  Effect.gen(function* () {
    const entries = [
      ...(yield* readZCom("ot", yield* testamentFiles(files, MODULE_DIR, "ot"))),
      ...(yield* readZCom("nt", yield* testamentFiles(files, MODULE_DIR, "nt"))),
    ]
    const pericopes = new Map<BookId, HarmonyPericopes>()
    for (const harmony of HARMONIES) {
      const headings = yield* harmonyPericopes(entries, harmony)
      for (const book of harmony) pericopes.set(book, headings)
    }
    const books: Array<CommentaryBook> = []
    const misplaced: Array<string> = []
    for (const id of scope) {
      const read = yield* commentaryBookFromZCom(CALVIN_RESOURCE_ID, id, entries, pericopes.get(id))
      misplaced.push(...read.misplaced.map((m) => `${m.slot} holds ${m.ref ?? "no reference"}`))
      books.push(ofCalvin(read.book))
    }
    if (misplaced.length > 0) {
      return yield* new ZComError({ reason: "misplaced-entries", detail: misplaced.join("; ") })
    }
    return books
  })

const calvinScope = (repoRoot: string) =>
  Effect.gen(function* () {
    const path = join(repoRoot, "dataset", "resources", CALVIN_RESOURCE_ID, "resource.json")
    const record = yield* Schema.decodeUnknownEffect(ResourceRecord)(
      JSON.parse(readFileSync(path, "utf8")),
    )
    return record.scope ?? BOOK_IDS
  })

/**
 * Ingests Calvin's commentary from the pinned CrossWire module into one normalized commentary file
 * per book in the resource record's scope. Nothing is written if any entry is misplaced.
 */
export const ingestCalvin = (repoRoot: string) =>
  Effect.gen(function* () {
    const scope = yield* calvinScope(repoRoot)
    const archive = yield* download(repoRoot, CALVIN_SOURCE)
    const books = yield* calvinBooks(yield* unzipSafe(archive), scope)
    for (const book of books) {
      yield* writeNormalized(
        repoRoot,
        CALVIN_RESOURCE_ID,
        `${book.book}.json`,
        CommentaryBook,
        book,
      )
    }
    return { books: books.length, sections: books.reduce((n, b) => n + b.sections.length, 0) }
  })
