import { CommentaryBook } from "@reformed-bible/core"
import { Effect } from "effect"
import { writeNormalized } from "../normalized.ts"
import { download, type SourceSpec } from "./download.ts"
import { readTeiCommentary, type TeiCommentaryLayout } from "./tei-commentary.ts"

export const OWEN_RESOURCE_ID = "owen-hebrews"

/** The EEBO-TCP text of Owen on Hebrews 6 to 10, pinned to the commit that added it. */
export const OWEN_SOURCE: SourceSpec = {
  url: "https://raw.githubusercontent.com/textcreationpartnership/A53678/e5d5779408ec6294b29a69cf555b3b0659ad107b/A53678.xml",
  sha256: "0436c101f08640cf6de5f3b6a1cad6bc81b9056b4f19a89ab0e62996faed2b87",
  maxBytes: 8 * 1024 * 1024,
}

/** The whole body is Hebrews; each chapter holds one division per verse or group of verses. */
export const OWEN_LAYOUT: TeiCommentaryLayout = {
  chapterDivisions: new Set(["exegesis_of_chapter"]),
  verseDivisions: new Set(["exegesis_of_verse", "exegesis_of_verses"]),
}

/** Ingests Owen's exposition of Hebrews 6 to 10 into one normalized commentary file. */
export const ingestOwen = (repoRoot: string) =>
  Effect.gen(function* () {
    const bytes = yield* download(repoRoot, OWEN_SOURCE)
    const [hebrews] = yield* readTeiCommentary(
      OWEN_RESOURCE_ID,
      new TextDecoder("utf-8").decode(bytes),
      ["Heb"],
      OWEN_LAYOUT,
    )
    if (hebrews !== undefined)
      yield* writeNormalized(repoRoot, OWEN_RESOURCE_ID, "Heb.json", CommentaryBook, hebrews)
    return { books: hebrews === undefined ? 0 : 1, sections: hebrews?.sections.length ?? 0 }
  })
