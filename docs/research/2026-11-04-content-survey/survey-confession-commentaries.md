# Survey: commentaries and expositions keyed to confession and catechism articles

Researched 2026-11-04 for the Reformed Bible study app. The repo was only read,
not changed. Scope: works that explain the Heidelberg Catechism, Westminster
Confession, Larger or Shorter Catechism, Belgic Confession or Canons of Dort
question by question or chapter by chapter.

Rules applied (dataset/AGENTS.md,
docs/plans/2026-11-04-0307-feat-widen-reformed-content-plan.md):

- License evidence must be quoted exactly from the specific edition's own
  source. For CCEL the plan's precedent is the ThML `<DC.Rights>` element (Hodge
  on Ephesians was rejected for a blank one). An aggregator's "public domain"
  claim does not count.
- Clean digital text required; scan-only or raw OCR fails.
- Nothing Baptist.
- Every item must hang off a passage or a confession article (shipped: WCF, WLC,
  WSC, hc, bc, cd).

Existing adapters: CrossWire SWORD (zCom/zCom4/OSIS), EEBO-TCP TEI, USFM, BSB
USJ, Schaff Creeds. There is no CCEL ThML adapter yet, so every CCEL candidate
below needs one.

Verification legend: **[verified]** = fetched and checked today.
**[unverified]** = inferred or secondary.

How CCEL rights were checked: I downloaded each book's ThML
(`https://ccel.org/ccel/<a>/<b>.xml`, the same file CCEL links as "XML") and
read `<DC.Rights>` inside `<electronicEdInfo>`. The ThML file also carries the
comment "Copyright Christian Classics Ethereal Library", which is CCEL's markup
claim, not a rights statement; flag it for the maintainer.

---

## Key discovery: EEBO-TCP holds several of the best candidates as clean CC0 TEI

Searched TCP.csv (textcreationpartnership/Texts, 61,315 rows) by author and
title, then fetched each `<id>.xml` from GitHub and read its `<availability>`.
**[verified]**

License quotes (copied from each file's TEI `<availability>`):

- Phase I ("Free"): "This Phase I text is available for reuse, according to the
  terms of Creative Commons 0 1.0 Universal." (the same sentence Poole's record
  uses)
- Phase II ("Restricted" in old TCP.csv, now released on GitHub): "To the extent
  possible under law, the Text Creation Partnership has waived all copyright and
  related or neighboring rights to this keyboarded and encoded edition of the
  work described above, according to the terms of the CC0 1.0 Public Domain
  Dedication" (stop before the parenthesised URL).

Gap density below = `<gap>` elements per 1,000 words of body text, as a rough
cleanliness measure.

---

## Westminster Shorter Catechism

### 1. Thomas Watson, A Body of Practical Divinity (1692), EEBO-TCP A65285 — STRONG (mapping work needed)

- **Source:** https://github.com/textcreationpartnership/A65285 (TEI P5, 3.4
  MB). Catalog date 1692, 604 pages; 1692 first edition: "A body of practical
  divinity consisting of above one hundred seventy six sermons on the lesser
  catechism composed by the reverend assembly of divines". **[verified]**
- **License:** Phase I CC0 quote above, present in the file. **[verified]**
- **Size:** about 521,000 words; 881 gaps (1.7 per 1,000 words, good). 70 notes.
  **[verified]**
- **Mapping:** heads are topical and follow WSC order, not numbered ("Man's
  Chief End TO GLORIFIE GOD", "Of the SCRIPTVRES", "That there is a GOD", "GOD
  is a SPIRIT", ... "The Covenant of Works", "Concerning SIN", "ADAM's SIN").
  112 heads; 72 `div type="sermon"` plus parts. Several WSC questions get
  multiple sermons (God's attributes under Q4), so a hand-built
  WSC-question-to-div map is needed. The 1692 edition also contains the Ten
  Commandments and Lord's Prayer sermons, plus some appended sermons ("Against
  being weary in well-doing") that are not catechism-keyed and must be dropped.
  **[structure verified; full coverage of Q1-107 not verified]**
- **Proofs:** Scripture citations are inline in running text (not marked up);
  they would need reference parsing.
- **Spelling:** original 1692 (vs/u, long s mostly absent in this file's body;
  "SCRIPTVRES").

### 1b. Thomas Watson, A Body of Divinity (CCEL, 1890 Spurgeon-era edition) — POSSIBLE (needs ThML adapter; Baptist-edited apparatus)

- **Source:** https://ccel.org/ccel/watson/divinity ; ThML at
  https://ccel.org/ccel/w/watson/divinity.xml (1.3 MB). Also TXT and PDF.
  **[verified]**
- **License:** ThML `<DC.Rights>Public Domain</DC.Rights>`. **[verified]** No
  `<published>` / print source recorded (empty `<printSourceInfo>`). File also
  carries the comment "Copyright Christian Classics Ethereal Library".
- **Size:** about 161,000 words; 10 div1, 42 div2; **2,025 `<scripRef>`
  elements** (parsed Scripture references, a real advantage over EEBO).
  **[verified]**
- **Mapping:** topical chapters following WSC order; only the doctrinal part
  (CCEL splits commandments and Lord's Prayer into separate books
  `watson/commandments` and `watson/prayer`).
- **Baptist concern:** the CCEL edition opens with "Brief Memoir Of Thomas
  Watson ... Compiled by C. H. Spurgeon". Watson was not Baptist, but the memoir
  (and any Spurgeon editorial matter) must be excluded. **[verified that the
  memoir is present]**
- **Verdict:** POSSIBLE; better references but needs a new ThML adapter and
  front-matter exclusion. EEBO A65285 is the cleaner licensing path with the
  existing adapter.

### 2. Thomas Vincent, An Explicatory Catechism (1675), EEBO-TCP A64986 — STRONG

- **Source:** https://github.com/textcreationpartnership/A64986 (534 KB). "An
  explicatory catechism: or, An explanation of the assemblies shorter
  catechism". **[verified]**
- **License:** Phase I CC0 quote. **[verified]**
- **Size:** about 61,000 words; 395 gaps (6.4 per 1,000, moderate).
  **[verified]**
- **Mapping:** excellent. Each WSC question is a paragraph
  `<hi>Quest.</hi> 1. WHat is the chief end of Man?` followed by
  `<hi>Answ.</hi>` and then "Explicat." sub-questions. 78 numbered "Quest. N."
  paragraphs matched my pattern, running through Q107; the rest use slightly
  different markup and need a looser parser. Questions are not wrapped in their
  own divs, so split on the numbered paragraphs. **[verified]**
- **Proofs:** 687 `<note place="margin">` elements holding Scripture proofs
  ("Hos. 10. 1. Isa. 5. 2.") attached to individual answers. **[verified]**
- **Verdict:** STRONG. Clean CC0, near one-to-one with WSC questions, proof refs
  in margin notes.

### 3. John Flavel, An Exposition of the Assemblies Catechism (1692), EEBO-TCP A39662 — STRONG

- **Source:** https://github.com/textcreationpartnership/A39662 (704 KB).
  **[verified]**
- **License:** Phase I CC0 quote. **[verified]**
- **Size:** about 89,000 words; 361 gaps (4.1 per 1,000). **[verified]**
- **Mapping:** very good. 100 `<div type="questions">` blocks, one per WSC
  question (heads like "1 Question. Of Man's Chief End.", "Of the Scriptures as
  our Rule", "God is a Spirit"), each holding numbered sub-questions with
  answers and "Inference" applications. 100 divs vs 107 WSC Qs, so a few divs
  cover two questions or some are untitled; needs a checked map. **[verified]**
- **Proofs:** Scripture refs inline in answers ("2 Pet. 1.21"), no note markup.
- **Verdict:** STRONG.

### 4. Joseph Alleine, A Most Familiar Explanation of the Assemblies Shorter Catechism (1674), EEBO-TCP A26693 — POSSIBLE

- **Source:** https://github.com/textcreationpartnership/A26693 (310 KB).
  **[verified]**
- **License:** Phase I CC0 quote. **[verified]**
- **Size:** about 31,000 words; 42 gaps (1.3 per 1,000, very clean). 55 notes.
- **Mapping:** only 6 `part` divs; WSC question numbers are not consistently
  marked (my pattern found only 9). Breaks each WSC answer into small yes/no
  questions. Needs closer parsing. **[partly verified]**
- **Verdict:** POSSIBLE; small, clean, but the question boundaries need work.
  Lower priority than Vincent/Flavel.

### 5. Thomas Lye, The Assemblies Shorter Catechism Drawn Out into Distinct Propositions (1674), EEBO-TCP A49498 — POSSIBLE (small)

- **Source:** https://github.com/textcreationpartnership/A49498 (179 KB), Phase
  II CC0 quote. **[verified]**
- **Size:** about 16,000 words; 71 gaps. Only a few divs ("The CATECHISM." as
  one block); propositions proved "by plain and pertinent texts of Scripture at
  large". Mapping would need text parsing.
- **Verdict:** POSSIBLE, low value relative to Vincent.

### 6. Fisher and Erskine, The Assembly's Shorter Catechism Explained ("Fisher's Catechism") — BLOCKED (no licensed clean text)

- **Clean text found:** Monergism DOCX,
  https://www.monergism.com/thethreshold/sdg/fisher/Fisher's%20Catechism.docx
  (790 KB, about 200,000 words, about 3,900 "Q. N." sub-questions, Parts I and
  II, starts with the Preface to the First Edition). **[verified download]** The
  DOCX contains **no** copyright, license or public-domain statement (searched
  the text), and the Monergism page has none either; the source edition is not
  named. Monergism's related ebook files are titled "Copyright © Monergism
  Books" (seen in search results for its Shaw ebook) **[unverified for
  Fisher]**. Aggregator, no evidence: fails.
- **Other copies:** Internet Archive scans only (OCR text):
  `westminsterassem00fish_1` (1850, possible-copyright-status "The Library of
  Congress is unaware of any copyright restrictions for this item."), and ECCO
  page-image items `bim_eighteenth-century_..._fisher-james_1792` / `_1800` (no
  rights field). Not in EEBO-TCP or ECCO-TCP (checked TCP.csv). **[verified]**
- **Mapping (if a source appears):** excellent; one block per WSC question with
  numbered sub-questions and inline proofs.
- **Verdict:** BLOCKED on license evidence and clean-text source. Could be
  unblocked by an explicit permission from Monergism or by keying text from a
  scan (out of scope).

### 7. John Brown of Haddington, An Essay towards an Easy, Plain ... Explication of the Assembly's Shorter Catechism — BLOCKED

- Internet Archive scans only:
  `bim_eighteenth-century_an-help-for-the-ignorant_brown-john_1761` (ECCO
  images), `essaytowardseasy1845brow`, `essaytowardseasy00brow` (1854), no
  rights field on the items I listed. Not in TCP. No clean text found.
  **[verified search; text not opened]**
- **Verdict:** BLOCKED (scan/OCR only, no license statement).

### 8. Matthew Henry, A Scripture-Catechism in the Method of the Assemblies (1703) — BLOCKED

- Only IA scans:
  `bim_eighteenth-century_a-scripture-catechism-i_henry-matthew_1703` (ECCO
  images), and 1846 Google scans `westminsterasse00henrgoog`
  (possible-copyright-status NOT_IN_COPYRIGHT). Not in ECCO-TCP (TCP.csv has
  only a 1690 Henry tract). **[verified]**
- Mapping would be excellent (each WSC answer broken into scripture-answered
  sub-questions), but there is no clean licensed text. **BLOCKED.**

### 9. Thomas Boston, Illustration of the Doctrines of the Christian Religion (on the WSC) — BLOCKED

- IA Google scans only (`anillustrationd01bostgoog`, 1773; 1812 vols), OCR. Not
  in TCP. **BLOCKED.** Added as an extra candidate; same status as Brown.

---

## Westminster Confession of Faith

### 10. David Dickson, Truths Victory over Error (1684, tr. George Sinclair), EEBO-TCP A35959 — STRONG

- **Source:** https://github.com/textcreationpartnership/A35959 (628 KB). Wing
  D1412. "Truths victory over error, or, An abridgement of the chief
  controversies in religion". This is Dickson's Latin Edinburgh lectures on the
  WCF, chapter by chapter. **[verified]**
- **License:** Phase I CC0 quote. **[verified]**
- **Size:** about 79,000 words; only 13 gaps (0.2 per 1,000; the cleanest file
  in this survey). **[verified]**
- **Mapping:** very good. Heads "CHAP. I. Of the Holy SCRIPTURE." then "Question
  I.", "Quest: II." ... through "CHAP. XXXIII. Of the Last IUDGEMENT", i.e. the
  33 WCF chapters, each split into numbered questions ("Do not the Socinians
  err, who ..."). 31 "CHAP." strings matched my pattern; two need a looser
  match. Questions map to a WCF chapter, not to a section. **[verified]**
- **Proofs:** inline ("Matth. 25. 31, to the end; Rom. 9. 22, 23"). Unmarked;
  needs a reference parser.
- **Content note:** polemical: each question names an error party (Papists,
  Socinians, Arminians, Anabaptists, Quakers...). Not Baptist itself; it argues
  against Anabaptists.
- **Verdict:** STRONG. Fills the WCF gap that Hodge and Shaw cannot.

### 11. A. A. Hodge, A Commentary on the Confession of Faith (1869) — BLOCKED

- Not on CCEL (no Hodge_aa books listed), not on Gutenberg or Wikisource.
  **[verified searches]**
- Internet Archive scans with OCR: `acommentaryonthe00hodguoft` (1869,
  NOT_IN_COPYRIGHT), `commentaryonconf1901hodg` (1901). HathiTrust full-view
  page images. Monergism offers ePub, .mobi and PDF ("The Westminster
  Confession: A Commentary") with **no** rights statement on the page (fetched);
  the title matches the Banner of Truth reprint title, so the Monergism file's
  base may be a modern edited reprint **[unverified]**.
- **Mapping:** excellent in principle (per WCF chapter and section, with review
  questions).
- **Verdict:** BLOCKED: no clean text with license evidence. Same pattern as the
  Hodge-on-Ephesians precedent.

### 12. Robert Shaw, An Exposition of the Confession of Faith (1845) — BLOCKED

- IA scans: `expositionofconf00shaw_0` (1846) and `expositionofconf00shaw_1`
  (1847), whose possible-copyright-status reads "The Library of Congress is
  unaware of any copyright restrictions for this item." Princeton Theological
  Seminary Commons scan (`expositionofconf1850shaw`), whose page warns the
  derived text is automated with an estimated 9% error rate **[from search
  snippet, unverified]**. Monergism ebook "The Reformed Faith" is the Christian
  Focus modern edition title; its file is labelled "Copyright © Monergism Books"
  **[search-result title, unverified]**.
- **Verdict:** BLOCKED: OCR only; the one rights statement belongs to a scan and
  is "unaware of restrictions", not a grant on clean text.

---

## Westminster Larger Catechism

### 13. Thomas Ridgley, A Body of Divinity (1731-33) — BLOCKED

- IA scans only (`bodyofdivinitywh01ridg`, `bodyofdivinityw02ridg`,
  `bodyofdivinityw04ridg`, 1814, NOT_IN_COPYRIGHT). Not on CCEL, Gutenberg,
  Wikisource, or in ECCO-TCP. **[verified searches]**
- **Note:** Ridgley was an Independent (Congregational) divine, not Baptist.
- **Verdict:** BLOCKED (OCR only). I found **no** clean, licensed WLC exposition
  anywhere; the WLC stays uncovered.

---

## Heidelberg Catechism

### 14. Ursinus, The Summe of Christian Religion (Parry tr., 1645 ed. with Pareus), EEBO-TCP A64611 — STRONG

- **Source:** https://github.com/textcreationpartnership/A64611 (5.3 MB). Wing
  U142. "The summe of Christian religion, delivered by Zacharias Ursinus first,
  by way of catechism, and then afterwards more enlarged by a sound and
  judicious exposition". This is the English (Parry) form of the same lectures
  Williard translated in 1851; Williard's preface says he "constantly consulted"
  this 1645 printing. **[verified]**
- **License:** Phase II CC0 quote above. **[verified]**
- **Size:** about 664,000 words; 1,122 gaps (1.7 per 1,000). 5,164 notes (mostly
  marginal Scripture and source refs). **[verified]**
- **Mapping:** excellent. Heads carry Lord's Day and question: "On the firſt
  Sabbath.Queſt. 1. What is thy only comfort in life and de...", "Queſt. 2.",
  "On the ſecond Sabbath.Queſt. 3." ... 126 distinct question numbers in heads,
  max 129 (three questions are probably grouped under a neighbour; check). 115
  `div type="commentary"` ("The Explication."), plus "Scriptural_testimonies",
  "objections", "animadversion" divs. **[verified]**
- **Proofs:** heavy, in margin notes and "Scriptural testimonies" divs.
- **Spelling:** long s and original orthography ("Queſt"); needs normalization
  for display.
- **Verdict:** STRONG. This is the licensable substitute for the Williard
  Ursinus.

### 14b. Ursinus, The Summe of Christian Religion (Parry tr., 1587 first ed.), EEBO-TCP A14216 — POSSIBLE (prefer A64611)

- https://github.com/textcreationpartnership/A14216 (3.4 MB), STC 24532, Phase
  II CC0. About 458,000 words, 535 gaps, 1,484 notes. Heads "OF THE FIRST
  QVESTION.", "OF THE SECOND QVESTION.", then topical common places ("THE COMMON
  PLACE OF SINNE"). Mapping is less regular than 1645. **[verified]**
- Use only if the 1645 edition fails a quality check.

### 15. Ursinus, Commentary on the Heidelberg Catechism (G. W. Williard tr., 1851/1852/1888) — BLOCKED

- Not on CCEL in full (CCEL's `ursinus/heidelberg` and `heidelberg1` are
  work-info stubs with no ThML body; `ursinus/catechism` is a 3,900-word piece
  "What is Catechism?" with **blank** `<DC.Rights />`). **[verified]**
- Clean copies: Monergism ePub/PDF (page fetched: **no** rights statement);
  Reformed Perspectives Magazine (Thirdmill) HTML serialisation (fetched one
  part: footer "This article is provided as a ministry of Third Millennium
  Ministries (Thirdmill)", no license). IA scans: `commentaryofdrza00ursi`
  (1851), `commdrza00ursi` (1852), `commentaryofzach00ursiuoft` (1888,
  NOT_IN_COPYRIGHT), OCR only. **[verified]**
- **Verdict:** BLOCKED (no clean text with license evidence). Use A64611
  instead.

### 16. Jeremias Bastingius, A Catechisme of Christian Religion ... with the Arguments (1591), EEBO-TCP A05494 — POSSIBLE/STRONG (small)

- **Source:** https://github.com/textcreationpartnership/A05494 (247 KB).
  STC 1562. "A catechisme of Christian religion taught in the schooles and
  churches of the Low-countries, and dominions of the countie Palatine: with the
  arguments". Phase II CC0. **[verified]**
- **Size:** about 26,000 words; 38 gaps. 405 margin notes (Scripture proofs:
  "Luk. 24.47. 1. Cot. 6.11. Rom. 8.16. Tit. 3.4..."). **[verified]**
- **Mapping:** perfect: 129 `div type="question"` + 129 `div type="answer"` with
  `<p n="2">`, 52 "part" divs and 41 "application" divs. **[verified]** Whether
  the "arguments/applications" are Bastingius's exposition or just HC
  proof-arguments: the content is short per question, so this is light
  commentary at best **[judgement]**. Bastingius's full "Exposition or
  commentarie vpon the catechisme" (1589) is **not** in TCP.
- **Verdict:** POSSIBLE: trivially mappable and clean, but thin as commentary.

### 17. Dutch Heidelberg/Belgic expositions (Van der Kemp, Kersten, Hoeksema, etc.) — BLOCKED

- 20th-century English translations (G. H. Kersten, Heidelberg Catechism
  sermons, NRC; Herman Hoeksema, Triple Knowledge, RFPA) are in copyright.
  **[known; not re-fetched]**
- Older English translations (J. Van der Kemp, The Christian Entirely the
  Property of Christ, 1810) exist only as scans **[unverified]**. No Belgic
  Confession commentary in English was found in TCP (the only Belgic item,
  A34245, is the 1689 confession text itself).
- **Verdict:** BLOCKED / not found.

---

## Canons of Dort

### 18. The Collegiat Suffrage of the Divines of Great Britaine (1629), EEBO-TCP A20668 — POSSIBLE

- **Source:** https://github.com/textcreationpartnership/A20668. Carleton,
  Davenant, Balcanquhall et al. "The collegiat suffrage of the divines of Great
  Britaine, concerning the five articles controverted in the Low Countries",
  i.e. the British delegation's written judgment delivered at Dort. Phase I CC0;
  the file's `<availability>` carries the Phase I sentence. **[verified]**
- **Size:** about 33,000 words; 22 gaps. 89 heads: per Article, "THE FIRST
  ORTHODOXALL POSITION.", "THE EXPOSITION AND CONFIRMATION OF THE POSITION.",
  then "Erroneous Opinions..." per article. **[verified]**
- **Mapping:** to the five heads of doctrine (cd 1-5), not to individual canon
  articles; the British positions predate the final Canons wording. Good fit at
  head level.
- **Verdict:** POSSIBLE. The only pre-modern English Dort exposition found that
  is licensable.

### 19. John Robinson, A Defence of the Doctrine Propounded by the Synode at Dort (1624), EEBO-TCP A10833 — POSSIBLE (low)

- https://github.com/textcreationpartnership/A10833, Phase I CC0 (availability
  sentence verified). About 80,000 words, 192 gaps. Chapters of "ADVERSARIES." /
  "DEFENCE." exchanges answering the General Baptist John Murton. **[verified]**
- Robinson was a Separatist (Congregational) pastor, not Baptist; the book
  refutes a Baptist. It is keyed to the five Dort heads by chapter **[unverified
  mapping detail]**. Polemical in form.
- **Verdict:** POSSIBLE, low priority.

### 20. Modern Dort/Belgic expositions (Hoeksema, Voice of Our Fathers; Feenstra; Hyde, With Heart and Mouth) — BLOCKED (copyright)

---

## Summary table

| #      | Work                                                  | Keyed to       | Best source                          | License evidence                                          | Mapping                                                              | Verdict                                                    |
| ------ | ----------------------------------------------------- | -------------- | ------------------------------------ | --------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------- |
| 2      | Vincent, Explicatory Catechism (1675)                 | WSC            | EEBO-TCP A64986                      | Phase I CC0 sentence                                      | one block per Q1-107 (split on "Quest. N." paras); 687 margin proofs | STRONG                                                     |
| 3      | Flavel, Exposition of the Assemblies Catechism (1692) | WSC            | EEBO-TCP A39662                      | Phase I CC0                                               | 100 per-question divs (107 Qs; map needed)                           | STRONG                                                     |
| 1      | Watson, Body of Practical Divinity (1692)             | WSC            | EEBO-TCP A65285                      | Phase I CC0                                               | topical sermons in WSC order; hand map; drop appended sermons        | STRONG (mapping work)                                      |
| 1b     | Watson, Body of Divinity (CCEL)                       | WSC Q1-38ish   | CCEL ThML                            | `<DC.Rights>Public Domain</DC.Rights>`                    | topical chapters; 2,025 scripRefs                                    | POSSIBLE (needs ThML adapter; Spurgeon memoir must be cut) |
| 10     | Dickson, Truths Victory over Error (1684)             | WCF ch. 1-33   | EEBO-TCP A35959                      | Phase I CC0                                               | per chapter, numbered questions; 13 gaps total                       | STRONG                                                     |
| 14     | Ursinus, Summe of Christian Religion (1645)           | HC Q1-129      | EEBO-TCP A64611                      | Phase II CC0                                              | heads "On the Nth Sabbath. Quest. N"; 126 of 129 Q numbers in heads  | STRONG                                                     |
| 14b    | Ursinus, Summe (1587)                                 | HC             | EEBO-TCP A14216                      | Phase II CC0                                              | "OF THE FIRST QVESTION" + common places                              | POSSIBLE                                                   |
| 16     | Bastingius, Catechisme ... with the arguments (1591)  | HC Q1-129      | EEBO-TCP A05494                      | Phase II CC0                                              | 129 question/answer divs; thin                                       | POSSIBLE                                                   |
| 18     | Collegiat Suffrage of the British divines (1629)      | Dort heads 1-5 | EEBO-TCP A20668                      | Phase I CC0                                               | per head of doctrine (positions + errors)                            | POSSIBLE                                                   |
| 19     | Robinson, Defence of the Doctrine of Dort (1624)      | Dort heads     | EEBO-TCP A10833                      | Phase I CC0                                               | chapters, polemical                                                  | POSSIBLE (low)                                             |
| 4      | Alleine, Most Familiar Explanation (1674)             | WSC            | EEBO-TCP A26693                      | Phase I CC0                                               | question markup irregular                                            | POSSIBLE                                                   |
| 5      | Lye, Shorter Catechism drawn out (1674)               | WSC            | EEBO-TCP A49498                      | Phase II CC0                                              | one block, needs parsing                                             | POSSIBLE (low)                                             |
| 15     | Ursinus/Williard Commentary (1851)                    | HC             | Monergism, RPM, IA scans             | none found                                                | per question                                                         | BLOCKED                                                    |
| 11     | A. A. Hodge, Commentary on the Confession (1869)      | WCF            | IA/HathiTrust scans; Monergism ebook | none on clean text                                        | per section                                                          | BLOCKED                                                    |
| 12     | Shaw, Exposition of the Confession (1845)             | WCF            | IA scans                             | LoC "unaware of any copyright restrictions" on scans only | per section                                                          | BLOCKED                                                    |
| 6      | Fisher and Erskine, Shorter Catechism Explained       | WSC            | Monergism DOCX (clean)               | none found                                                | per question                                                         | BLOCKED                                                    |
| 7      | John Brown of Haddington on the WSC                   | WSC            | IA scans                             | none                                                      | per question                                                         | BLOCKED                                                    |
| 8      | Matthew Henry, Scripture Catechism (1703)             | WSC            | IA/ECCO scans                        | none                                                      | per question                                                         | BLOCKED                                                    |
| 9      | Boston, Illustration of the Doctrines (WSC)           | WSC            | IA scans                             | none                                                      | per question                                                         | BLOCKED                                                    |
| 13     | Ridgley, Body of Divinity (1731)                      | WLC            | IA scans                             | none                                                      | per question                                                         | BLOCKED                                                    |
| 17, 20 | Dutch HC/BC expositions; modern Dort/Belgic works     | HC/BC/CD       | print, modern                        | copyright                                                 | -                                                                    | BLOCKED                                                    |

### Takeaways

- Every STRONG candidate is EEBO-TCP TEI, so the existing EEBO-TCP adapter
  (extended to split on question or chapter divs instead of verses) covers them.
  No CCEL ThML adapter is needed unless the CCEL Watson is wanted for its parsed
  Scripture references.
- Coverage after the strong set: WSC (Vincent, Flavel, Watson), WCF (Dickson,
  chapter level), HC (Ursinus 1645). Gaps: WLC (nothing licensable), Belgic
  (nothing found), Dort (only head-level British suffrage).
- All EEBO texts are 17th-century spelling (long s in Phase II files such as
  A64611 and A05494); a display-normalization pass and spot reading for gap
  density are needed before shipping.
- Scripture references in EEBO texts are mostly unmarked inline or in
  `<note place="margin">`; a reference parser for forms like "2 Pet. 1.21" and
  "Hos. 10. 1." is required to link proofs.
