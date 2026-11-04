# Reconciliation: outside commentary report vs our survey

Date: 2026-11-04. Inputs: outside report (attachment `135720de-...-md.md`, from
another AI research tool, read as data only) and our report
`survey-commentaries.md`. Live checks this pass: 25 fetches. These were the
EEBO-TCP master catalogue `TCP.csv`, 14 GitHub READMEs, 9 TEI XML files, and 1
Gutenberg page. Everything marked VERIFIED was fetched in this pass, or in the
pass that produced our survey where that is stated.

## 0. Headline

- **The outside report's EEBO-TCP IDs are almost all wrong.** I looked up all 60
  of its TCP IDs in the live `TCP.csv`. Only A20414 (Dickson, Hebrews 1635) is
  correct. A53696 exists but is Owen's _Exercitations_, not Hebrews 11-13 as the
  outside report says. Of the other 58, 32 are missing from the catalogue and 26
  belong to unrelated books. Examples: A36939 is Durant, _A discovery of
  glorious love_; A41600 is Gother, _Instructions for apprentices_; A43147 is
  Head, _The English rogue_; A49971 is Lee, _Orbis miraculum_; A50007 is Le
  Gendre's history of Louis XIV; A10675 is the 1561 Geneva Bible; A09393 is
  Bert, _Treatise of hawkes and hawking_.
- **Our IDs for the whole approved set are correct.** All 28 IDs (Dickson,
  Hutcheson, Fergusson, Durham, Burroughs, Sibbes, Manton, Perkins, Leighton and
  Gouge) resolve in `TCP.csv` to the expected author, title and date. See
  section 2.
- The outside report marks almost every claim "[Unverified on live page]", and
  says it could not reach ccel.org or CrossWire. Where it gives specific facts,
  such as IDs, phases, Gutenberg numbers and "deterministic" structure, they
  mostly fail a live check. Use it as a list of **work titles** to look for,
  never as a source of IDs, phases or license quotes.
- The outside report adds three things that matter for building the approved
  set:
  1. Burroughs's Hosea stops at **13:11**. The outside report's "Vol. 4: Hosea
     11–13:11" is right, and I confirmed it live.
  2. A second Hosea 14 candidate: Reynolds. I found its real ID, **A57143**.
  3. Some new single-book candidates worth adding. The best are Nisbet on 1-2
     Peter (real ID A52355), Manton on Psalm 119 (A51842) and Durham on Isaiah
     53 (A81890).

## 1. Agreements (brief)

The two reports agree on these points, so they need no further checking:

- EEBO-TCP is the right source for the 17th-century Scottish and Puritan set.
  The texts are hand-keyed TEI and licensed CC0, with spelling that needs
  normalizing.
- Dickson, Hutcheson, Durham (Song of Songs and Revelation), Fergusson,
  Leighton, Manton on Jude, Perkins (Galatians, Hebrews 11, Sermon on the
  Mount), Burroughs on Hosea and Gouge on Hebrews are good fits for a Reformed
  app and exist in EEBO-TCP. The two reports disagree on their IDs; see
  section 2.
- Durham's Revelation aligns by lecture or passage, with digressions attached to
  the lecture's verse range. It does not align verse by verse.
- Perkins on Galatians covers chapters 1-5. Chapter 6 was written by Ralph
  Cudworth and is in the same volume.
- These are blocked because no clean, licensed text exists: Haldane (who is also
  Baptist after 1808, which matters under the no-Baptist rule), John Brown of
  Edinburgh, the Westminster Assembly _Annotations_ (also redundant with Poole),
  Edwards's _Notes on Scripture_, and the Yale WJE edition.
- Barnes (New School) and Keil & Delitzsch (Lutheran) need the owner's approval.
  CrossWire marks both "DistributionLicense=Public Domain".
- Calvin on Isaiah 49-66 is the obvious gap-filler, from the Calvin Translation
  Society (CTS) volume 4, which is CCEL `calcom16`.
- Lightfoot is philological rather than doctrinal and is low priority.
  Lightfoot's _Acts_ covers only the first part of the book; the two reports
  disagree on where it ends (see 2b).
- PRDL and the Internet Archive offer scans only, so they cannot be text
  sources.
- A CCEL ThML file with a blank `<DC.Rights>` field fails the license rule.

## 2. Conflicts

### 2a. Conflicts touching the approved set (all checked live)

Evidence source for IDs:
https://raw.githubusercontent.com/textcreationpartnership/Texts/master/TCP.csv
(fetched 2026-11-04). "Free" in its Status column = Phase I; "Restricted" =
Phase II (stale label; Phase II was released 2020, see license row below).

| Work                              | Ours                                                                                                    | Outside                                                                                                                                                                                                                                        | Live evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Who is right                                                                                                         |
| --------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Dickson Psalms                    | A35941 (1-50), A35945 (51-100), A35943 (101-150)                                                        | A35935, A35937, A35938                                                                                                                                                                                                                         | TCP.csv: A35941 "A brief explication of the first fifty Psalms by David Dickson." 1655; A35945 "...other fifty Psalmes, from Ps. 50 to Ps. 100" 1653; A35943 "...last fifty Psalmes from Ps. 100 to the end" 1654. A35935 absent; A35937 = James Dickinson (Quaker), A35938 = Jonathan Dickinson                                                                                                                                                                  | **Ours**                                                                                                             |
| Dickson Matthew                   | A35949 (1651)                                                                                           | A35934 (1647/1651)                                                                                                                                                                                                                             | A35949 "A brief exposition of the evangel of Jesus Christ according to Matthew" 1651; A35934 absent                                                                                                                                                                                                                                                                                                                                                               | **Ours**                                                                                                             |
| Dickson Epistles                  | A35951 (1659), includes Hebrews                                                                         | A35940                                                                                                                                                                                                                                         | A35951 "An expositon of all St. Pauls epistles together with an explanation of those other epistles of the apostles St. James, Peter, John & Jude ... Expositio analytica omnium Apostolicarum Epistolarum. English"; author field also lists "Retchford, William." and "Dickson, David ... Epistle of Paul to the Hebrews." A35940 absent                                                                                                                        | **Ours**                                                                                                             |
| Hutcheson John / Job              | A45241 / A45240, Phase II                                                                               | A45269 / A45270, Phase I                                                                                                                                                                                                                       | A45241 "An exposition of the Gospel of Jesus Christ, according to John by Geo. Hutcheson." 1657 Restricted(=Phase II); A45240 Job 1669 Restricted. Outside IDs absent. README A45241 carries the Phase II CC0 waiver (quoted below)                                                                                                                                                                                                                               | **Ours** (IDs and phase)                                                                                             |
| Hutcheson Minor Prophets          | A86936, A86934, A86932 (Phase II, all 1654)                                                             | A45266-A45268, Phase I, 1654-57                                                                                                                                                                                                                | All three of ours present, 1654, Restricted; outside IDs absent                                                                                                                                                                                                                                                                                                                                                                                                   | **Ours**                                                                                                             |
| Fergusson                         | A41197, A41199, A41200                                                                                  | A39997-A39999                                                                                                                                                                                                                                  | Ours present (Gal-Eph 1659, Phil-Col 1656, Thess 1674). A39997-9 are Thomas Forrester pamphlets                                                                                                                                                                                                                                                                                                                                                                   | **Ours**                                                                                                             |
| Durham Revelation / Song          | A37035 (1658) / A37032 (1668)                                                                           | A36942 / A36939 (1669)                                                                                                                                                                                                                         | A37035 "A commentarie upon the book of the Revelation" 1658; A37032 "Clavis cantici" dated **1668**, not 1669. A36942 absent; A36939 = John Durant                                                                                                                                                                                                                                                                                                                | **Ours**                                                                                                             |
| Burroughs Hosea                   | A30572 (1-3, 1652 ed.), A77979 (4-7, Phase II), A30574 (8-10), A30575 (11-13)                           | A30567-A30570 (vol 1 dated 1643)                                                                                                                                                                                                               | Ours present with matching titles. A30567 = Burroughs "spots of the godly", A30570 = "excellency of holy courage", A30568/9 absent. TCP has no 1643 first edition of vol 1; A30572 is the 1652 printing                                                                                                                                                                                                                                                           | **Ours**                                                                                                             |
| Hosea 14 companion                | Sibbes A12190                                                                                           | Reynolds A57175                                                                                                                                                                                                                                | A12190 "The returning backslider, or, A commentarie upon the whole XIIII. chapter of ... Hosea" dated **1639** (Phase II). A57175 absent; Reynolds's Hosea 14 is really **A57143** (1649, Phase I)                                                                                                                                                                                                                                                                | **Ours** on the ID; the outside report's _work_ is real and is a valid alternative (section 4)                       |
| Manton Jude                       | A89503 (1657)                                                                                           | A50007 (1658)                                                                                                                                                                                                                                  | A89503 "A practical commentary, or An exposition with notes on the Epistle of Jude" 1657 Free. A50007 = Le Gendre, history of Louis XIV                                                                                                                                                                                                                                                                                                                           | **Ours**                                                                                                             |
| Perkins                           | A09432 (Matt 5-7), A09383 (Gal), A09376 (Heb 11)                                                        | A09391, A09352, A09349                                                                                                                                                                                                                         | Ours present with matching titles. A09391 = Perkins "government of the tongue", A09349 = _Armilla aurea_, A09352 absent                                                                                                                                                                                                                                                                                                                                           | **Ours**                                                                                                             |
| Leighton 1 Peter                  | A47642 (1693), A47643 (1694), both Phase I                                                              | A49971 (I), A49972 (II)                                                                                                                                                                                                                        | Both ours "Free" (Phase I). A49971 = Samuel Lee _Orbis miraculum_; A49972 absent. A47643 lists "Fall, James" as editor                                                                                                                                                                                                                                                                                                                                            | **Ours**                                                                                                             |
| Gouge Hebrews                     | A41670, Phase I                                                                                         | A41600, Phase II                                                                                                                                                                                                                               | A41670 "A learned and very useful commentary on the whole epistle to the Hebrews" 1655 Free; author field adds "Gouge, Thomas" (son, editor). A41600 = John Gother                                                                                                                                                                                                                                                                                                | **Ours**                                                                                                             |
| Gouge Hebrews alignment           | Topical § sections; verse mapping laborious (POSSIBLE)                                                  | Each § head "explicitly names the verse", "deterministic"                                                                                                                                                                                      | Downloaded A41670.xml (11.5 MB) live: 1,989 `§` heads; only 267 contain any verse reference ("Of the meaning of the first Verse", "Of the resolution of Heb. 8. 3, 4, 5."), 28 use a "Ver. N" form. The rest are topical ("§. 12. Of Prophets.")                                                                                                                                                                                                                  | **Ours**. Alignment = carry forward the last verse-naming § (or "resolution of Heb. x. y" §) to following topical §s |
| EEBO-TCP Phase II license wording | CC0 waiver sentence                                                                                     | "This Phase II text is available for reuse, according to the terms of Creative Commons 0 1.0 Universal..."                                                                                                                                     | Live READMEs and TEI `<availability>` of A45241, A77979, A12190 (all approved Phase II) say: "To the extent possible under law, the Text Creation Partnership has waived all copyright and related or neighboring rights to this keyboarded and encoded edition of the work described above, according to the terms of the CC0 1.0 Public Domain Dedication (http://creativecommons.org/publicdomain/zero/1.0/)." No "Phase II text is available" sentence exists | **Ours**. The outside quote is fabricated; do not use it as license evidence                                         |
| EEBO-TCP Phase I license wording  | "This Phase I text is available for reuse, according to the terms of Creative Commons 0 1.0 Universal." | Same sentence inside the full paragraph ("This keyboarded and encoded edition ... co-owned by the institutions ... The text can be copied, modified, distributed and performed, even for commercial purposes, all without asking permission.") | A35941 README and TEI `<availability>` contain the full paragraph (README line-wrapped)                                                                                                                                                                                                                                                                                                                                                                           | **Both** correct; outside quotes the full paragraph, ours the operative sentence. Either is a faithful quote         |
| Line-break hyphen handling        | (adapter already handles)                                                                               | Strip "∣" (U+2223) bars                                                                                                                                                                                                                        | A35941.xml from GitHub has **0** "∣" characters and 2,142 `<g ref="char:EOLhyphen"/>` elements; the "∣" form is the quod.lib HTML rendering. Repo `tei-commentary.ts:81` already has `LINE_BREAK_GLYPHS = new Set(["char:EOLhyphen", "char:EOLunhyphen"])`                                                                                                                                                                                                        | **Ours / repo**. Ignore the outside "∣" advice for GitHub sources                                                    |

Phase-by-work (live TCP.csv; matters for which license sentence to quote): Phase
I = Dickson (all 5), Fergusson (3), Durham (2), Burroughs A30572/A30574/A30575,
Sibbes A60194, Manton A89503, Perkins (3), Leighton (2), Gouge A41670. Phase
II = Hutcheson (5), Burroughs A77979, Sibbes A12190. Live README checks this
pass: A35941 (Phase I sentence), A30575 (Phase I sentence), A45241/A77979/A12190
(CC0 waiver). Other approved IDs: phase from TCP.csv, README quote not
re-fetched this pass (our survey reported all approved READMEs checked).

### 2b. Conflicts outside the approved set

| Item                           | Ours                                                                          | Outside                                                               | Resolution                                                                                                                                                                                                                                                                                                |
| ------------------------------ | ----------------------------------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Owen Hebrews 1-5, 11-13        | Not in EEBO-TCP (VERIFIED absent)                                             | In TCP as A53693/A53694/A53696; "single highest-value gap-fill"       | **Ours** (live TCP.csv): Owen + "Hebrew" finds only A53678 (ch 6-10, shipped) and A53696 (_Exercitations_, 1668). A53694 = Owen on the Sabbath (1671); A53693/A53695 absent. Still BLOCKED (scan only)                                                                                                    |
| Manton James (1651)            | Absent from TCP                                                               | A50009                                                                | **Ours**: Manton has no James entry in TCP.csv; A50009 absent                                                                                                                                                                                                                                             |
| Hodge Ephesians on Gutenberg   | Gutenberg has no Hodge commentary                                             | Gutenberg #25128, PG license                                          | **Ours**: live https://www.gutenberg.org/ebooks/25128 is "孽海花 by Pu Zeng" (Chinese novel). Hodge stays BLOCKED (CCEL Ephesians `<DC.Rights />` empty per our survey)                                                                                                                                   |
| Hodge Romans / 1-2 Cor on CCEL | CCEL 404                                                                      | CCEL romans/corinthians1/corinthians2 exist, rights pending           | Ours checked live in the survey pass; outside admits it could not reach CCEL. Ours stands (not re-fetched)                                                                                                                                                                                                |
| Diodati                        | 1643 ed. A36033                                                               | 1651 3rd ed. A36044                                                   | **Ours**: only A36033 (1643, "Pious annotations, upon the Holy Bible") in TCP; A36044 absent                                                                                                                                                                                                              |
| Dutch Annotations (Haak 1657)  | Not covered                                                                   | EEBO-TCP Phase II A43147, Strong                                      | **Not in TCP**: A43147 = Richard Head, _The English rogue_; no "Haak" author or "Dutch annotations" title in TCP.csv. BLOCKED unless another clean source turns up                                                                                                                                        |
| Beza/Tomson NT notes           | = Geneva 1599 notes, other survey                                             | EEBO-TCP A10675                                                       | A10675 = 1561 Geneva Bible (Whittingham/Gilby), not the Tomson NT. No Tomson NT in a Beza/Tomson author search. Ours stands                                                                                                                                                                               |
| Goodwin Ephesians / Revelation | Only A85442 tract                                                             | A41528 / A41529                                                       | **Ours**: both IDs absent; Goodwin+Ephes/Revelation finds only A85442                                                                                                                                                                                                                                     |
| Lightfoot                      | Acts A48432 covers ch 1-11 (heads end "Acts XI.")                             | A48449 Acts 1-12; Horae Hebraicae in 1684 Works A48466/7              | A48449/A48466/A48467 are Lilburne/Quaker pamphlets. Real IDs: Acts = A48432 (1645), 1684 _Works_ = **A48431** (2,607 pp, Phase I). Whether A48431 contains the English Horae Hebraicae: UNVERIFIED. Acts end point: ours probed the TEI; title says "the first part, from the beginning of the Boo[k]..." |
| Calvin Isa 49-66 source        | CCEL calcom16 ThML (needs ThML adapter); shipped CrossWire Calvin lacks 49-66 | Comes via CrossWire CalvinCommentaries module, "zero schema friction" | Not re-checked live this pass. If the shipped module had Isa 49-66 there would be no gap to fill, so the outside claim is internally inconsistent; ours (based on our survey's live calcom16 check) stands                                                                                                |
| Barnes conf                    | PD, zCom ThML                                                                 | "TextSource=OLB", OT Job/Ps/Isa/Dan in module                         | Not re-checked (not approved set). Note the outside's OLB TextSource as a lead for the owner-approval write-up                                                                                                                                                                                            |
| Durham Job                     | n/a                                                                           | Durham _Exposition of Job_ (Glasgow 1659) A36946                      | **No such work in TCP** (Durham author search returns no Job); A36946 = Refuge/Walsingham. Hutcheson is the Scottish-series Job. Likely confabulated                                                                                                                                                      |

## 3. New candidates from the outside report that ours missed and that meet the rules

The outside report names these _works_; every outside ID was wrong, so the IDs
below are the real ones found in TCP.csv. All are EEBO-TCP (clean hand-keyed
TEI, CC0), none Baptist. "README VERIFIED" = the GitHub README for that ID was
fetched this pass and carries the quoted license; "probed" = TEI downloaded and
counted (words, `<gap reason="illegible">` per 100 words, divs).

| Work                                                               | Real ID (phase)                                   | Coverage                       | License evidence                                                                                                                                                                                                                                                                                                                                                          | Structure / quality (live)                                                                                                                                                                                           | Verdict                                                                                                                                                                                                           |
| ------------------------------------------------------------------ | ------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Alexander Nisbet, Brief exposition of 1-2 Peter (1658)**         | **A52355** (II)                                   | 1 Pet 1-5, 2 Pet 1-3 (8 files) | README VERIFIED: "To the extent possible under law, the Text Creation Partnership has waived all copyright and related or neighboring rights to this keyboarded and encoded edition of the work described above, according to the terms of the CC0 1.0 Public Domain Dedication (http://creativecommons.org/publicdomain/zero/1.0/)." (same text in TEI `<availability>`) | probed: 126k words, 0.16 illeg/100w; 135 `div type="verse_and_commentary"` with `n`=verse and "Verſ. 1." heads, under 8 chapter divs. Same layout as Fergusson                                                       | **STRONG**. Same Scottish "brief exposition" series as Dickson/Hutcheson/Fergusson; fits the planned adapter config. Overlaps Leighton on 1 Peter (fine: different voice)                                         |
| Nisbet, Ecclesiastes (1694)                                        | **A52356** (II)                                   | Eccl 1-12                      | UNVERIFIED (README not fetched; TCP.csv lists it Restricted = Phase II, so expect the CC0 waiver)                                                                                                                                                                                                                                                                         | not probed                                                                                                                                                                                                           | LIKELY STRONG; fills a book with no Reformed commentary in the app beyond Henry/JFB/Poole                                                                                                                         |
| **Thomas Manton, 190 sermons on Psalm 119 (1681)**                 | **A51842** (I)                                    | Ps 119:1-176                   | README VERIFIED: "This Phase I text is available for reuse, according to the terms of Creative Commons 0 1.0 Universal."                                                                                                                                                                                                                                                  | probed: 1.12M words, **0.04** illeg/100w (cleanest probed anywhere); 190 `div type="sermon"`, each opens "SERMON I. PSAL. CXIX. 1." ... "SERMON CXC. PSALM CXIX. VER. 176." so one verse per sermon, regex-alignable | **STRONG on text and alignment; owner call on size**: Ps 119 is one chapter file holding ~1.1M words (several MB). Needs either a per-verse split inside the chapter file or an exception to the file-size budget |
| **James Durham, Christ Crucified: 72 sermons on Isaiah 53 (1683)** | **A81890** (II)                                   | Isa 53:1-12                    | README VERIFIED: CC0 waiver sentence (as above)                                                                                                                                                                                                                                                                                                                           | probed: 419k words, 0.53 illeg/100w; 71 sermon divs (title says LXXII), each head "SERMON XX. ISAIAH LIII.IV, V. Verſ. 4."                                                                                           | **STRONG** (one chapter file, ~419k words; sermon-level, verse-keyed)                                                                                                                                             |
| Edward Reynolds, Explication of Hosea 14 in seven sermons (1649)   | **A57143** (I)                                    | Hos 14                         | README VERIFIED: "This Phase I text is available for reuse, according to the terms of Creative Commons 0 1.0 Universal."                                                                                                                                                                                                                                                  | probed: 114k words, **1.18** illeg/100w (poor; 1,351 gaps); 7 sermons, heads give verse ranges matching KJV numbering ("HOSEA Chap. 14. ver. 8.")                                                                    | POSSIBLE, as an alternative to Sibbes for Hos 14 (see section 4)                                                                                                                                                  |
| Thomas Hall, Samaria's downfall: commentary on Hos 13:12-16 (1660) | **A45340** (I)                                    | Hos 13:12-16                   | README VERIFIED: Phase I sentence                                                                                                                                                                                                                                                                                                                                         | probed: 74k words, 0.82 illeg/100w; 5 `div type="verse"` + "OBSERVATIONS" divs; heads "HOSEA 13. 12."                                                                                                                | **STRONG as gap-filler** (not in either report's candidate list; found while checking the outside report's "13:11" claim). Completes Burroughs                                                                    |
| Perkins, Exposition of Jude, 66 sermons (1606)                     | **A09434** (I)                                    | Jude                           | README VERIFIED: Phase I sentence                                                                                                                                                                                                                                                                                                                                         | README tag table: 21 `div type="verse"` (n=1,4,5...21, "22,23", "24,25"); 1,031 illegible gaps over 200 pp (likely ~1/100w, poor)                                                                                    | POSSIBLE (legibility); Manton already covers Jude                                                                                                                                                                 |
| Perkins, Revelation 1-3 (1606)                                     | **A09443** (I)                                    | Rev 1-3                        | README VERIFIED: Phase I sentence                                                                                                                                                                                                                                                                                                                                         | README tag table: 3 chapter divs only, 1,202 illegible gaps over 238 pp                                                                                                                                              | POSSIBLE (legibility poor, needs inline verse parsing); Durham covers Revelation                                                                                                                                  |
| Reynolds, Explication of Psalm 110 (1632)                          | **A10650** (I)                                    | Ps 110                         | README VERIFIED: Phase I sentence                                                                                                                                                                                                                                                                                                                                         | README tag table: 6 `div type="verse"` (n=1,2,3,4,"5,6",7); 452 illegible + 153 foreign gaps over 546 pp                                                                                                             | STRONG-POSSIBLE (single chapter, verse divs)                                                                                                                                                                      |
| Gouge, The saints sacrifice: Psalm 116 (1632)                      | **A01981** (I)                                    | Ps 116                         | README VERIFIED: Phase I sentence                                                                                                                                                                                                                                                                                                                                         | README tag table is suspicious: divs include `dramatis_personae`, `act` (5), `scene` (35) next to 84 `section`s, and one gap of extent "80+ pages". The repo may bundle a play, or have a large missing span         | NEEDS INSPECTION before any use                                                                                                                                                                                   |
| Durham, Practical exposition of the Ten Commandments (1675)        | A37049 (I) (also _The law unsealed_ 1676, A37046) | Exod 20:1-17                   | UNVERIFIED (README not fetched)                                                                                                                                                                                                                                                                                                                                           | not probed; topical treatise more than verse commentary                                                                                                                                                              | LOW (better as a catechism or confession cross-reference than a verse commentary)                                                                                                                                 |
| Dickson, Short explanation of Hebrews (Aberdeen 1635)              | A20414 (I)                                        | Heb 1-13                       | UNVERIFIED live README (only outside ID that is right; TCP.csv "Free")                                                                                                                                                                                                                                                                                                    | not probed                                                                                                                                                                                                           | SKIP: redundant with the Hebrews section inside approved A35951                                                                                                                                                   |
| Burroughs, Four books on the eleventh of Matthew (1659)            | A77983 (II)                                       | Matt 11:28-30                  | UNVERIFIED                                                                                                                                                                                                                                                                                                                                                                | not probed; treatise                                                                                                                                                                                                 | LOW                                                                                                                                                                                                               |
| Byfield, 1 Peter ch 2 sermons (1623)                               | A17384 (I)                                        | 1 Pet 2                        | UNVERIFIED                                                                                                                                                                                                                                                                                                                                                                | not probed                                                                                                                                                                                                           | LOW (ours already lists Byfield A17385/A17389; outside IDs A17456/A17451 wrong)                                                                                                                                   |

Rejected outside "new" candidates (do not meet rules or do not exist): Owen Heb
1-5/11-13 (not in TCP), Manton James (not in TCP), Dutch Annotations/Haak (not
in TCP), Goodwin Ephesians/Revelation (not in TCP), Diodati 1651 (only 1643 in
TCP; ours already has A36033), Beza/Tomson NT as A10675 (wrong book; Tomson
notes = Geneva 1599 notes), Hodge Ephesians on Gutenberg (#25128 is a Chinese
novel), Durham Job (no such work), DutKant (Dutch-language; owner call on
non-English, CrossWire conf line not re-checked).

No modern-spelling transcription with a valid license appears in the outside
report. It offers only the same EEBO-TCP originals (and quod.lib.umich.edu HTML
views of them).

## 4. What changes how the approved set should be built

1. **Burroughs's Hosea stops at 13:11** (VERIFIED). A30575 (live TEI) has
   chapter divs 11, 12 and 13. Chapter 13's verse divs run from 1 to **11**
   only, and are followed by two `section` divs, which are not verse divs. The
   outside report's "Vol. 4: Hosea 11–13:11" is correct. Our survey's note that
   the continuation was "partly by Thomas Hall/Reynolds" was the right idea but
   put it in the wrong place. Corrected picture:
   - **Authorship.** TCP.csv credits A77979, A30574 and A30575 to "Burroughs,
     Jeremiah" plus "Goodwin, Thomas" (and, for A30574, "Cross, Thomas"). The
     title pages say "by Jeremiah Burroughs ; being the [fifth/seventh] book
     published by Thomas Goodwin ... [et al.]". So Goodwin, Greenhill, Simpson,
     Bridge, Yates and Adderly are the **publishers** of Burroughs's posthumous
     lectures, not co-authors. Attribution should read "Jeremiah Burroughs
     (published posthumously by Thomas Goodwin et al.)". The outside report's
     suggestion that Reynolds or Sibbes co-wrote chapters 11-13 is wrong.
   - **Hos 13:12-16** is a separate work: Thomas Hall, _Samaria's downfall_
     (1660), **A45340**, Phase I, VERIFIED. If the owner wants all of Hosea, add
     it as its own resource with Hall as creator, or as a separate attributed
     segment.
   - **Hos 14** is also a separate work: Sibbes A12190 (already approved) or
     Reynolds A57143 (alternative).
2. **Sibbes on Hosea 14 (A12190) has a versification trap** (VERIFIED, live
   TEI). Neither report caught this. There are 16 sermons, and the verse labels
   in their heads do not match KJV numbering:
   - Sermons 10-13 are labelled "HOS. 14.8/14.9" but quote "Ephraim shall say,
     what have I any more to do with idols", which is KJV 14:8.
   - Sermons 14-16 are labelled "HOS. 14.10" and quote "Who is wise...", which
     is KJV 14:9. That reflects a 10-verse chapter numbering.
   - Sermon 9 is labelled "14.6" but quotes KJV 14:7.

   So key each Sibbes sermon by **matching its quoted text against the KJV**, or
   by a hand-made map from the 16 sermons to verses. Do not trust the numeric
   label. Reynolds A57143 uses KJV numbering but is far less legible (1.18 vs
   0.14 illegible gaps per 100 words). Recommendation: keep Sibbes with a hand
   map.

3. **Hosea 14 date.** Sibbes A12190 is dated **1639** in TCP.csv. It is Phase
   II, so quote the CC0 waiver, not the Phase I sentence.
4. **Quote the right license sentence for each phase.** Hutcheson (A45241,
   A45240, A86936, A86934, A86932), Burroughs A77979 and Sibbes A12190 are Phase
   II. Their evidence quote is the CC0 waiver sentence. Do **not** use the
   outside report's invented "This Phase II text is available..." wording. Every
   other approved ID is Phase I and uses the "This Phase I text is available for
   reuse..." sentence. A license-quote check in the build, matching the quote
   against the fetched README, would catch any mix-up.
5. **Attribution details visible in the catalogue** (from TCP.csv author fields;
   how prominent these are in the volumes themselves is UNVERIFIED):
   - **Dickson A35951** is the English version of his Latin _Expositio
     analytica_. TCP.csv lists "Retchford, William." as a contributor,
     presumably the translator, and lists Dickson's _Epistle of Paul to the
     Hebrews_ as included. The resource's `edition` field should say it is a
     translation and name Retchford if the title page confirms it.
   - **Leighton A47643** lists James Fall as editor.
   - **Gouge A41670** lists Thomas Gouge, his son, as editor.
   - **Perkins A09383** credits Galatians 6 to Ralph Cudworth. Label chapter 6
     as Cudworth, not Perkins. TCP.csv gives the dates 1617-1688, which belong
     to the younger Cudworth. The supplement was by the elder Ralph Cudworth (d.
     1624), so check the title page and do not copy the catalogue dates.
   - **Sibbes A60194** was edited by Ashe and Manton.
6. **Gouge Hebrews (A41670) cannot be aligned "deterministically by section"**,
   contrary to the outside report. Live probe: only 267 of 1,989 § headings name
   a verse. Use the carry-forward approach our survey proposed. Gouge's text
   quality is also the weakest in the approved set (1.26 illegible gaps per 100
   words, plus 5,432 Greek gaps). The approved plan should expect visible gap
   markers and possibly a policy for rendering Greek gaps.
7. **Hyphens and glyphs.** The outside report's advice to strip "∣" does not
   apply to the GitHub TEI. Those files encode line-break hyphens as
   `<g ref="char:EOLhyphen"/>`, which `tei-commentary.ts` already handles. The
   outside report's other spelling notes stand and match ours:
   - u/v and i/j forms
   - long-s (ſ), heavy in Phase II files and also present in Phase I files:
     A30575 has ~26k (and our survey already noted it in A30572 and A89503)
   - `<gap reason="foreign">` for Greek and Hebrew

   Normalize ſ→s for every file, not just Phase II. Our survey said "Phase I
   texts checked are already normalized except where noted", but A30575 (Phase
   I) has ~26k ſ characters.

8. **No cleaner edition or modern-spelling licensed transcription exists** in
   either report for any approved work. The EEBO-TCP GitHub TEI remains the
   edition to use. The outside report's quod.lib.umich.edu URLs are views of the
   same texts, and all of them carry wrong IDs.
9. **Durham, Song of Songs date.** A37032 is the **1668** _Clavis cantici_,
   not 1669. Use 1668 in the `edition` metadata.

## 5. Verification log (this pass)

Fetches (25):

- **TCP.csv** (1). Resolved all 28 approved IDs, all 60 outside IDs, and author
  and title searches.
- **READMEs** (14): A35941, A45241, A12190, A57143, A45340, A52355, A51842,
  A81890, A77979, A30575, A09434, A09443, A01981, A10650.
- **TEI XML** (9): A35941, A30575, A12190, A57143, A45340, A52355, A51842,
  A81890, A41670.
- **Gutenberg ebook 25128** (1).

Not fetched this pass:

- CCEL (Hodge, Calvin calcom16) and CrossWire confs (barnes, kd, dutkant). These
  only bear on items outside the approved set.
- READMEs for approved IDs other than A35941, A30575, A45241, A77979 and A12190.
  Their phase comes from the live TCP.csv; our survey reports their READMEs as
  checked.

Working files: catalogue at `/tmp/recon-data/TCP.csv`, TEI and READMEs under
`/tmp/recon-data/tei/`, probe scripts in `/tmp/recon-scripts/`.
