import {
  BOOK_IDS,
  LexiconEntry,
  OriginalChapter,
  chapterCount,
  type BookId,
} from "@reformed-bible/core"
import { Effect, Schema } from "effect"
import { download, type SourceSpec } from "./download.ts"
import { buildGreekChapters, parseSblgnt, SBLGNT_RESOURCE_ID } from "./sblgnt.ts"
import {
  indexLexicon,
  LEXICON_RESOURCE_ID,
  lexiconEntries,
  lexiconFileName,
  parseStepLexicon,
} from "./stepbible-lexicon.ts"
import {
  buildHebrewChapters,
  parseTagnt,
  parseTahot,
  TAHOT_RESOURCE_ID,
} from "./stepbible-tagged.ts"
import { parseTvtms } from "./tvtms.ts"
import { writeNormalized } from "../normalized.ts"

// STEPBible-Data at commit 5de0a47 (2026-11-02) and the SBLGNT at commit d7f35ad (2026-10-25).
export const STEPBIBLE_SOURCES = {
  tagntMatJhn: {
    url: "https://raw.githubusercontent.com/STEPBible/STEPBible-Data/5de0a47f35f0fc13dfe1430d104e5db8a4285f9c/Translators%20Amalgamated%20OT%2BNT/TAGNT%20Mat-Jhn%20-%20Translators%20Amalgamated%20Greek%20NT%20-%20STEPBible.org%20CC-BY.txt",
    sha256: "d4c0c820fdf9f2b450c9f96ce6103d6875028affd2e44094d753f1329ca1fd85",
  },
  tagntActRev: {
    url: "https://raw.githubusercontent.com/STEPBible/STEPBible-Data/5de0a47f35f0fc13dfe1430d104e5db8a4285f9c/Translators%20Amalgamated%20OT%2BNT/TAGNT%20Act-Rev%20-%20Translators%20Amalgamated%20Greek%20NT%20-%20STEPBible.org%20CC-BY.txt",
    sha256: "122040eeeaeba50d6abbf67b39cacaff687211bda69b080e5d53927c830d9968",
  },
  tahotGenDeu: {
    url: "https://raw.githubusercontent.com/STEPBible/STEPBible-Data/5de0a47f35f0fc13dfe1430d104e5db8a4285f9c/Translators%20Amalgamated%20OT%2BNT/TAHOT%20Gen-Deu%20-%20Translators%20Amalgamated%20Hebrew%20OT%20-%20STEPBible.org%20CC%20BY.txt",
    sha256: "7763ef367bb0e6e1c1a95fb9b652e1d611b2481827611433e82abbf229216d70",
  },
  tahotJosEst: {
    url: "https://raw.githubusercontent.com/STEPBible/STEPBible-Data/5de0a47f35f0fc13dfe1430d104e5db8a4285f9c/Translators%20Amalgamated%20OT%2BNT/TAHOT%20Jos-Est%20-%20Translators%20Amalgamated%20Hebrew%20OT%20-%20STEPBible.org%20CC%20BY.txt",
    sha256: "b79add01a8c95673e31ec3ab8ad86183d2312cd96421ddf21f3d1f74377526a7",
  },
  tahotJobSng: {
    url: "https://raw.githubusercontent.com/STEPBible/STEPBible-Data/5de0a47f35f0fc13dfe1430d104e5db8a4285f9c/Translators%20Amalgamated%20OT%2BNT/TAHOT%20Job-Sng%20-%20Translators%20Amalgamated%20Hebrew%20OT%20-%20STEPBible.org%20CC%20BY.txt",
    sha256: "e0416880bb78f46715bb17ce526b623c3051da0ef83f7bf83beaad350e6272e8",
  },
  tahotIsaMal: {
    url: "https://raw.githubusercontent.com/STEPBible/STEPBible-Data/5de0a47f35f0fc13dfe1430d104e5db8a4285f9c/Translators%20Amalgamated%20OT%2BNT/TAHOT%20Isa-Mal%20-%20Translators%20Amalgamated%20Hebrew%20OT%20-%20STEPBible.org%20CC%20BY.txt",
    sha256: "d5a609f5a4b9f7757a2615e55877b07f9f6931a8afccef012c0b4bf662caf540",
  },
  tbesg: {
    url: "https://raw.githubusercontent.com/STEPBible/STEPBible-Data/5de0a47f35f0fc13dfe1430d104e5db8a4285f9c/Lexicons/TBESG%20-%20Translators%20Brief%20lexicon%20of%20Extended%20Strongs%20for%20Greek%20-%20STEPBible.org%20CC%20BY.txt",
    sha256: "734a5b64a1152f67604bf09d32f15c0ba537151961752fcf168087b41b4d93ea",
  },
  tbesh: {
    url: "https://raw.githubusercontent.com/STEPBible/STEPBible-Data/5de0a47f35f0fc13dfe1430d104e5db8a4285f9c/Lexicons/TBESH%20-%20Translators%20Brief%20lexicon%20of%20Extended%20Strongs%20for%20Hebrew%20-%20STEPBible.org%20CC%20BY.txt",
    sha256: "848eef2ac16753a43694897dbb9e8f266725e7cc9da4809f367ee5b990f05dbb",
  },
  tvtms: {
    url: "https://raw.githubusercontent.com/STEPBible/STEPBible-Data/5de0a47f35f0fc13dfe1430d104e5db8a4285f9c/Versification/TVTMS%20-%20Translators%20Versification%20Traditions%20with%20Methodology%20for%20Standardisation%20for%20Eng%2BHeb%2BLat%2BGrk%2BOthers%20-%20STEPBible.org%20CC%20BY.txt",
    sha256: "c42cdfec1ae82d3e0c7e2f6a89d73bbed28ede4cf3fe18d5582626881e8d5c78",
  },
} as const satisfies Record<string, SourceSpec>

/** One plain-text file per book of the SBL Greek New Testament, keyed by book id. */
export const SBLGNT_SOURCES: ReadonlyArray<SourceSpec & { readonly book: BookId }> = [
  {
    book: "Matt",
    url: "https://raw.githubusercontent.com/Faithlife/SBLGNT/d7f35adca9ec410e1d1499c63b4dd989d76c8d4d/data/sblgnt/text/Matt.txt",
    sha256: "4fa718540cbc6330591b233c99c68bbf52b85afc90016e4188efe5cd9719eeb0",
  },
  {
    book: "Mark",
    url: "https://raw.githubusercontent.com/Faithlife/SBLGNT/d7f35adca9ec410e1d1499c63b4dd989d76c8d4d/data/sblgnt/text/Mark.txt",
    sha256: "fe1b5a4c15db71e7e30f33fb67966ca93baffae377085ece0b88f66316729638",
  },
  {
    book: "Luke",
    url: "https://raw.githubusercontent.com/Faithlife/SBLGNT/d7f35adca9ec410e1d1499c63b4dd989d76c8d4d/data/sblgnt/text/Luke.txt",
    sha256: "102d65ec7a91271777115d1a605688776adfda6a1188680ccf593e27e3e876d6",
  },
  {
    book: "John",
    url: "https://raw.githubusercontent.com/Faithlife/SBLGNT/d7f35adca9ec410e1d1499c63b4dd989d76c8d4d/data/sblgnt/text/John.txt",
    sha256: "ada9643154a990ae2725ab847c6cfb576ce2c3bcd4945d47606e8a90c8d065f5",
  },
  {
    book: "Acts",
    url: "https://raw.githubusercontent.com/Faithlife/SBLGNT/d7f35adca9ec410e1d1499c63b4dd989d76c8d4d/data/sblgnt/text/Acts.txt",
    sha256: "199867a92d9a1ef73abe85986e4489d4799bb187bdd22845f3c168c93cafa9c8",
  },
  {
    book: "Rom",
    url: "https://raw.githubusercontent.com/Faithlife/SBLGNT/d7f35adca9ec410e1d1499c63b4dd989d76c8d4d/data/sblgnt/text/Rom.txt",
    sha256: "a919e44983ec633d541ec1084da79cfba1c1aa7f0eac6470c1ac7ec66cf774e8",
  },
  {
    book: "1Cor",
    url: "https://raw.githubusercontent.com/Faithlife/SBLGNT/d7f35adca9ec410e1d1499c63b4dd989d76c8d4d/data/sblgnt/text/1Cor.txt",
    sha256: "2a706bac29f1e34568bf6862cbc1616471511e9b915d7292adba3e93fb72c946",
  },
  {
    book: "2Cor",
    url: "https://raw.githubusercontent.com/Faithlife/SBLGNT/d7f35adca9ec410e1d1499c63b4dd989d76c8d4d/data/sblgnt/text/2Cor.txt",
    sha256: "af6a60d5f851762c7ee22be6f15975e706a55cf24bd0b890d6ee9ab2ad74bd18",
  },
  {
    book: "Gal",
    url: "https://raw.githubusercontent.com/Faithlife/SBLGNT/d7f35adca9ec410e1d1499c63b4dd989d76c8d4d/data/sblgnt/text/Gal.txt",
    sha256: "cea30996850efb7a24d5be03d5d1ea052f2200e292f8bdd190c57298bd8c2fb1",
  },
  {
    book: "Eph",
    url: "https://raw.githubusercontent.com/Faithlife/SBLGNT/d7f35adca9ec410e1d1499c63b4dd989d76c8d4d/data/sblgnt/text/Eph.txt",
    sha256: "c15837d245dc849384a0be9f6c76de65590ffd496474f48c16822696ca024f6a",
  },
  {
    book: "Phil",
    url: "https://raw.githubusercontent.com/Faithlife/SBLGNT/d7f35adca9ec410e1d1499c63b4dd989d76c8d4d/data/sblgnt/text/Phil.txt",
    sha256: "c99e25ea7856fd7a3edb1055716869117c4cba4c15f07567ea22c0269e211b85",
  },
  {
    book: "Col",
    url: "https://raw.githubusercontent.com/Faithlife/SBLGNT/d7f35adca9ec410e1d1499c63b4dd989d76c8d4d/data/sblgnt/text/Col.txt",
    sha256: "665ef40dbc19bacf2b2642aa0bfc265e3cfab3f37b5757ea1ff69bdaf968bd08",
  },
  {
    book: "1Thess",
    url: "https://raw.githubusercontent.com/Faithlife/SBLGNT/d7f35adca9ec410e1d1499c63b4dd989d76c8d4d/data/sblgnt/text/1Thess.txt",
    sha256: "58b57d9b87ee994757a6bd425cfb8a12cecee9b3c7d0206286fdf2b089b44ccf",
  },
  {
    book: "2Thess",
    url: "https://raw.githubusercontent.com/Faithlife/SBLGNT/d7f35adca9ec410e1d1499c63b4dd989d76c8d4d/data/sblgnt/text/2Thess.txt",
    sha256: "c2a6922591a0282f5c07fe9fa47b8f38cd1aaf15b56eb9364aac91f5546f5822",
  },
  {
    book: "1Tim",
    url: "https://raw.githubusercontent.com/Faithlife/SBLGNT/d7f35adca9ec410e1d1499c63b4dd989d76c8d4d/data/sblgnt/text/1Tim.txt",
    sha256: "e4813e23b26b8b4763771b252cb41982d3af66abeead62f014e5f5f0a5323dcb",
  },
  {
    book: "2Tim",
    url: "https://raw.githubusercontent.com/Faithlife/SBLGNT/d7f35adca9ec410e1d1499c63b4dd989d76c8d4d/data/sblgnt/text/2Tim.txt",
    sha256: "eecea7f17f3493bb3e0d2d5922acf2ab10dae876156e0cbc395355c05f66d2bf",
  },
  {
    book: "Titus",
    url: "https://raw.githubusercontent.com/Faithlife/SBLGNT/d7f35adca9ec410e1d1499c63b4dd989d76c8d4d/data/sblgnt/text/Titus.txt",
    sha256: "8a7ff3511b7cbaaba481fe92b9aa716b8fd2abcc9d54829939c2fa3f836a2267",
  },
  {
    book: "Phlm",
    url: "https://raw.githubusercontent.com/Faithlife/SBLGNT/d7f35adca9ec410e1d1499c63b4dd989d76c8d4d/data/sblgnt/text/Phlm.txt",
    sha256: "0b74d129888819be274cdcf239672f4688691ebab77c627521b5fcb185bea011",
  },
  {
    book: "Heb",
    url: "https://raw.githubusercontent.com/Faithlife/SBLGNT/d7f35adca9ec410e1d1499c63b4dd989d76c8d4d/data/sblgnt/text/Heb.txt",
    sha256: "a89fa2a3a8f04e8bf6a9c71404a9c45fa0e32cff5b6942043e663d8c1f40cc93",
  },
  {
    book: "Jas",
    url: "https://raw.githubusercontent.com/Faithlife/SBLGNT/d7f35adca9ec410e1d1499c63b4dd989d76c8d4d/data/sblgnt/text/Jas.txt",
    sha256: "1343ea4125c64585c738a2f8bf54a077947d0a6229b2642b39a1ad845f40e153",
  },
  {
    book: "1Pet",
    url: "https://raw.githubusercontent.com/Faithlife/SBLGNT/d7f35adca9ec410e1d1499c63b4dd989d76c8d4d/data/sblgnt/text/1Pet.txt",
    sha256: "9c847143fbecfb2c5d0fc35820f973efb749c04a9badae99eb8d9ac0cf3d2a6d",
  },
  {
    book: "2Pet",
    url: "https://raw.githubusercontent.com/Faithlife/SBLGNT/d7f35adca9ec410e1d1499c63b4dd989d76c8d4d/data/sblgnt/text/2Pet.txt",
    sha256: "7afd9df2ea451cc6b3d55984d12fcf8d8d159b5f3d40489b4ebd375dbac8aea0",
  },
  {
    book: "1John",
    url: "https://raw.githubusercontent.com/Faithlife/SBLGNT/d7f35adca9ec410e1d1499c63b4dd989d76c8d4d/data/sblgnt/text/1John.txt",
    sha256: "074201796600c23d79c0abd26621ed0046290d5f227f4aaea67ac425784094c5",
  },
  {
    book: "2John",
    url: "https://raw.githubusercontent.com/Faithlife/SBLGNT/d7f35adca9ec410e1d1499c63b4dd989d76c8d4d/data/sblgnt/text/2John.txt",
    sha256: "b2daf832c6f88d67ae0bdf2ecfbbb42309e330dc161f5b127c8939d5cb448bc7",
  },
  {
    book: "3John",
    url: "https://raw.githubusercontent.com/Faithlife/SBLGNT/d7f35adca9ec410e1d1499c63b4dd989d76c8d4d/data/sblgnt/text/3John.txt",
    sha256: "db0bfc024dfbafa4bf0c978d6f53186c35e6eb771058672ff4f1c31708db6c16",
  },
  {
    book: "Jude",
    url: "https://raw.githubusercontent.com/Faithlife/SBLGNT/d7f35adca9ec410e1d1499c63b4dd989d76c8d4d/data/sblgnt/text/Jude.txt",
    sha256: "9d80e8332848395a7af425ebf30edd21c9c43f0f446489f648b65c652630b734",
  },
  {
    book: "Rev",
    url: "https://raw.githubusercontent.com/Faithlife/SBLGNT/d7f35adca9ec410e1d1499c63b4dd989d76c8d4d/data/sblgnt/text/Rev.txt",
    sha256: "61419de7970661f8c481975c35b50e7c1df0422db0c6400d1ce2c6ade35da9f0",
  },
]
export class OriginalLanguageError extends Schema.TaggedError<
  OriginalLanguageError,
  { readonly brand: unique symbol }
>()("OriginalLanguageError", {
  problems: Schema.Array(Schema.String),
}) {}

/** What one ingest run produced. */
export interface OriginalLanguageSummary {
  readonly greekChapters: number
  readonly greekWords: number
  /** Verses in KJV numbering the SBL text lacks, shown from other editions with a note. */
  readonly versesNotInSbl: number
  /** Verses with no Greek words at all, carrying only a note. */
  readonly greekVersesWithoutWords: number
  readonly untaggedGreekWords: number
  readonly sblAddedToEditions: number
  readonly hebrewChapters: number
  readonly hebrewWords: number
  readonly hebrewVersesWithoutWords: number
  readonly lexiconEntries: number
  readonly lexiconFiles: number
  /** Word tags with no lexicon entry to join to. */
  readonly unjoinedTags: number
}

const decoder = new TextDecoder("utf-8", { fatal: true })

const fetchText = (repoRoot: string, spec: SourceSpec) =>
  download(repoRoot, spec).pipe(Effect.map((bytes) => decoder.decode(bytes)))

const missingChapters = (
  chapters: ReadonlyArray<OriginalChapter>,
  books: ReadonlyArray<BookId>,
) => {
  const have = new Set(chapters.map((c) => `${c.book}.${c.chapter}`))
  return books.flatMap((book) =>
    Array.from({ length: chapterCount(book) }, (_, i) => `${book}.${i + 1}`).filter(
      (key) => !have.has(key),
    ),
  )
}

const OLD_TESTAMENT = BOOK_IDS.slice(0, 39)
const NEW_TESTAMENT = BOOK_IDS.slice(39)

/**
 * Downloads the pinned STEPBible and SBLGNT sources and writes the normalized original-language
 * content: one Greek chapter file per New Testament chapter under `sblgnt/`, one Hebrew chapter file
 * per Old Testament chapter under `stepbible-tahot/`, both named like `Rom.8.json`, and the lexicons
 * under `stepbible-lexicons/` bucketed by `lexiconFileName`.
 */
export const ingestOriginalLanguage = (repoRoot: string) =>
  Effect.gen(function* () {
    const s = STEPBIBLE_SOURCES
    const lexiconRows = [
      ...parseStepLexicon(yield* fetchText(repoRoot, s.tbesg)),
      ...parseStepLexicon(yield* fetchText(repoRoot, s.tbesh)),
    ]
    const lexicon = indexLexicon(lexiconRows)
    const tvtms = parseTvtms(yield* fetchText(repoRoot, s.tvtms))

    const problems: Array<string> = []
    const tahotRows = []
    for (const spec of [s.tahotGenDeu, s.tahotJosEst, s.tahotJobSng, s.tahotIsaMal]) {
      tahotRows.push(...parseTahot(yield* fetchText(repoRoot, spec)))
    }
    const hebrew = buildHebrewChapters(tahotRows, tvtms, lexicon)
    problems.push(...hebrew.problems)
    problems.push(
      ...missingChapters(hebrew.chapters, OLD_TESTAMENT).map((key) => `no Hebrew chapter ${key}`),
    )

    const tagntRows = []
    for (const spec of [s.tagntMatJhn, s.tagntActRev]) {
      tagntRows.push(...parseTagnt(yield* fetchText(repoRoot, spec)))
    }
    const tokens = []
    for (const spec of SBLGNT_SOURCES) {
      tokens.push(...parseSblgnt(spec.book, yield* fetchText(repoRoot, spec)))
    }
    const greek = buildGreekChapters(tokens, tagntRows, lexicon)
    problems.push(...greek.problems)
    problems.push(
      ...missingChapters(greek.chapters, NEW_TESTAMENT).map((key) => `no Greek chapter ${key}`),
    )
    if (problems.length > 0) return yield* new OriginalLanguageError({ problems })

    for (const chapter of [...hebrew.chapters, ...greek.chapters]) {
      yield* writeNormalized(
        repoRoot,
        chapter.resourceId,
        `${chapter.book}.${chapter.chapter}.json`,
        OriginalChapter,
        chapter,
      )
    }
    const entries = lexiconEntries(lexiconRows)
    const buckets = new Map<string, Array<LexiconEntry>>()
    for (const entry of entries) {
      const name = lexiconFileName(entry.stepStrongs)
      const bucket = buckets.get(name) ?? []
      bucket.push(entry)
      buckets.set(name, bucket)
    }
    for (const [name, bucket] of buckets) {
      yield* writeNormalized(
        repoRoot,
        LEXICON_RESOURCE_ID,
        name,
        Schema.Array(LexiconEntry),
        bucket,
      )
    }

    const verses = (chapters: ReadonlyArray<OriginalChapter>) => chapters.flatMap((c) => c.verses)
    const allWords = [...verses(hebrew.chapters), ...verses(greek.chapters)].flatMap((v) => v.words)
    const summary: OriginalLanguageSummary = {
      greekChapters: greek.chapters.length,
      greekWords: verses(greek.chapters).reduce((n, v) => n + v.words.length, 0),
      versesNotInSbl: verses(greek.chapters).filter(
        (v) => v.words.length > 0 && v.words.every((w) => !w.editions.includes("SBL")),
      ).length,
      greekVersesWithoutWords: verses(greek.chapters).filter((v) => v.words.length === 0).length,
      untaggedGreekWords: greek.untagged.length,
      sblAddedToEditions: greek.sblAdded,
      hebrewChapters: hebrew.chapters.length,
      hebrewWords: verses(hebrew.chapters).reduce((n, v) => n + v.words.length, 0),
      hebrewVersesWithoutWords: verses(hebrew.chapters).filter((v) => v.words.length === 0).length,
      lexiconEntries: entries.length,
      lexiconFiles: buckets.size,
      unjoinedTags: allWords
        .flatMap((w) => (w.stepStrongs === "" ? [""] : w.stepStrongs.split("+")))
        .filter((tag) => !lexicon.has(tag)).length,
    }
    return summary
  })

export { SBLGNT_RESOURCE_ID, TAHOT_RESOURCE_ID }
