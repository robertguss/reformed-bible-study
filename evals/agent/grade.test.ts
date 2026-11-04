import { describe, expect, it } from "vitest"
import {
  articleProblems,
  missingCalls,
  namedArticles,
  quotedSpans,
  saysNotCovered,
  type ToolCall,
  type Transcript,
  ungroundedQuotes,
} from "./grade.ts"

const WCF = {
  author: "Westminster Assembly of Divines",
  work: "The Westminster Confession of Faith",
  edition: "Schaff, The Creeds of Christendom, vol. 3 (1877)",
  license: "CC-PDM-1.0",
}

const commentary: ToolCall = {
  name: "get_commentary",
  args: { ref: "Romans 8:28", work: "calvin-commentaries" },
  isError: false,
  text: "> And we know that to them who love God. So far are afflictions from hindering our salvation.\n\n— John Calvin, Calvin's Collected Commentaries \\(1847\\). License: CC-PDM-1.0.",
  structured: { items: [] },
}

const articles: ToolCall = {
  name: "find_confession_articles",
  args: { ref: "Romans 8:28" },
  isError: false,
  text: "> WCF 5.7 \\(Of Providence\\): Section 7\n> As the providence of God doth, in general, reach to all creatures, so, after a most special manner, it taketh care of his Church.",
  structured: {
    items: [{ value: { citation: "WCF 5.7", articleId: "5.7" }, attribution: WCF }],
  },
}

const CREDIT = `— ${WCF.author}, ${WCF.work} (${WCF.edition}). License: ${WCF.license}.`

const transcript = (answer: string, calls = [commentary, articles]): Transcript => ({
  question: "What does Calvin say on Romans 8:28?",
  answer,
  calls,
})

describe("quotedSpans", () => {
  it("reads inline and blockquoted quotations, skipping attribution lines and short terms", () => {
    const answer = [
      'Calvin writes, "So far are afflictions from hindering our salvation."',
      "He calls it “the special care of his Church” and uses the word “providence”.",
      "> As the providence of God doth, in general, reach to all creatures",
      `> ${CREDIT}`,
    ].join("\n")
    expect(quotedSpans(answer)).toEqual([
      "So far are afflictions from hindering our salvation.",
      "the special care of his Church",
      "As the providence of God doth, in general, reach to all creatures",
    ])
  })
})

describe("ungroundedQuotes", () => {
  it("accepts quotations found word for word, through Markdown escapes and ellipses", () => {
    const answer = [
      '"So far are afflictions from hindering our salvation."',
      "> WCF 5.7 (Of Providence): Section 7",
      "> “As the providence of God doth … reach to all creatures”",
    ].join("\n")
    expect(ungroundedQuotes(transcript(answer))).toEqual([])
  })

  it("flags a quotation no tool returned, such as a verse recalled from memory", () => {
    const answer =
      '"So far are afflictions from hindering our salvation." Paul says "all things work together for good."'
    expect(ungroundedQuotes(transcript(answer))).toEqual(["all things work together for good."])
  })
})

describe("namedArticles", () => {
  it("reads abbreviations and the long forms as tool citations", () => {
    const answer =
      "See WCF 3.6, Westminster Confession of Faith, chapter 5, section 7, the Larger Catechism Q. 45 and WSC Q7."
    expect([...namedArticles(answer)].sort()).toEqual(["WCF 3.6", "WCF 5.7", "WLC Q45", "WSC Q7"])
  })

  it("reads the Heidelberg, Belgic and Dort forms as tool citations", () => {
    const answer = [
      "HC Q1, the Heidelberg Catechism, Q&A 21, and HC LD 32 (which opens with Q86).",
      "BC Art. 1 and the Belgic Confession, Article 16.",
      "CD III-IV.1, the Canons of Dort III/IV, article 4, CD I.7, CD V–3 and the CD Conclusion.",
    ].join("\n")
    expect([...namedArticles(answer)].sort()).toEqual([
      "BC Art. 1",
      "BC Art. 16",
      "CD Conclusion",
      "CD I.7",
      "CD III-IV.1",
      "CD III-IV.4",
      "CD V.3",
      "HC Q1",
      "HC Q21",
      "HC Q86",
    ])
  })

  it("does not read a year before Christ as a Belgic article", () => {
    for (const answer of [
      "Jerusalem fell in 586 BC, 2 Kings 25 records it.",
      "Jerusalem fell in 586 BC 2 Kings 25 records it.",
    ])
      expect([answer, [...namedArticles(answer)]]).toEqual([answer, []])
  })

  it("does not read a confession's year as an article", () => {
    for (const answer of [
      "The Heidelberg Catechism 1563 was written at Heidelberg.",
      "The Canons of Dort, 1619, answer the Remonstrants.",
    ])
      expect([answer, [...namedArticles(answer)]]).toEqual([answer, []])
    expect([
      ...namedArticles("The Belgic Confession (1561), Article 37, and HC (1563) Q. 52."),
    ]).toEqual(["HC Q52", "BC Art. 37"])
  })

  it("reads a Lord's Day followed by its question as that question", () => {
    expect([...namedArticles("The Heidelberg Catechism, Lord's Day 32, Q&A 87.")]).toEqual([
      "HC Q87",
    ])
  })

  it("reads the Canons of Dort's heads written out and a comma before the article", () => {
    const answer = [
      "The Canons of Dort, First Head of Doctrine, Article 7.",
      "The Canons of Dort, Third and Fourth Heads of Doctrine, Article 4.",
      "The Canons of Dort III/IV, 12.",
    ].join("\n")
    expect([...namedArticles(answer)].sort()).toEqual(["CD I.7", "CD III-IV.12", "CD III-IV.4"])
  })
})

describe("articleProblems", () => {
  it("passes an answer naming only returned articles, each credited", () => {
    expect(articleProblems(transcript(`WCF 5.7 cites the verse.\n\n${CREDIT}`))).toEqual([])
  })

  it("passes Heidelberg, Belgic and Dort articles the tools returned, each credited", () => {
    const credits = {
      "HC Q1": {
        author: "Zacharias Ursinus and Caspar Olevianus",
        work: "The Heidelberg Catechism",
        edition: "Schaff, The Creeds of Christendom, vol. 3 (1877)",
        license: "CC-PDM-1.0",
      },
      "BC Art. 1": {
        author: "Guido de Brès",
        work: "The Belgic Confession",
        edition: "Schaff, The Creeds of Christendom, vol. 3 (1877)",
        license: "CC-PDM-1.0",
      },
      "CD III-IV.1": {
        author: "Synod of Dort",
        work: "The Canons of Dort",
        edition: "Schaff, The Creeds of Christendom, vol. 3 (1877)",
        license: "CC-PDM-1.0",
      },
    }
    const found: ToolCall = {
      ...articles,
      structured: {
        items: Object.entries(credits).map(([citation, attribution]) => ({
          value: { citation },
          attribution,
        })),
      },
    }
    const answer = [
      "Heidelberg Catechism Q1, Belgic Confession Art. 1 and Canons of Dort III-IV.1 all speak to it.",
      ...Object.values(credits).map(
        (credit) =>
          `— ${credit.author}, ${credit.work} (${credit.edition}). License: ${credit.license}.`,
      ),
    ].join("\n")
    expect(articleProblems(transcript(answer, [found]))).toEqual([])
  })

  it("flags an article no tool returned and a credit missing its edition", () => {
    const answer = `WCF 5.7 and WCF 1.1 cite it. — ${WCF.author}, ${WCF.work}. License: ${WCF.license}.`
    expect(articleProblems(transcript(answer))).toEqual([
      `WCF 5.7 is not credited with its edition: ${WCF.edition}`,
      "WCF 1.1 is named but no tool returned it.",
    ])
  })

  it("flags an answer that names no article", () => {
    expect(articleProblems(transcript("Calvin comforts the afflicted."))).toEqual([
      "The answer names no confession article.",
    ])
  })
})

describe("missingCalls", () => {
  it("lists expected tools that were not called successfully", () => {
    const failed = { ...articles, isError: true }
    expect(
      missingCalls(transcript("", [commentary, failed]), [
        "get_commentary",
        "find_confession_articles",
      ]),
    ).toEqual(["find_confession_articles"])
  })
})

describe("saysNotCovered", () => {
  it("recognises an answer saying the source or passage is not there", () => {
    for (const answer of [
      "Calvin's commentary on Genesis 1:1 is not yet covered in this dataset.",
      "Matthew Henry's commentary isn't available from these tools.",
      "The resources don't include Matthew Henry.",
      "Matthew Henry's commentary is not in this dataset.",
      "Calvin never wrote on Revelation.",
      "Calvin did not write a commentary on Revelation, so there is nothing to quote.",
      "Calvin did not comment on Revelation.",
      "Revelation falls outside Calvin's work.",
      "The 1689 London Baptist Confession is not part of this library.",
      "There is no commentary from Spurgeon in these tools.",
    ])
      expect([answer, saysNotCovered(answer)]).toEqual([answer, true])
  })

  it("rejects an answer that simply answers", () => {
    expect(saysNotCovered("Calvin says that God created the heavens out of nothing.")).toBe(false)
  })

  it("rejects an answer that answers anyway with a negation elsewhere in the sentence", () => {
    for (const answer of [
      "Matthew Henry argues that God does not abandon his people, and his commentary has a lovely section on providence.",
      "Calvin says creation is not an accident; the commentary includes a long discussion of it.",
      "Calvin says Christ suffered outside the gate, and his comment on Hebrews 13:12 follows.",
    ])
      expect([answer, saysNotCovered(answer)]).toEqual([answer, false])
  })
})
