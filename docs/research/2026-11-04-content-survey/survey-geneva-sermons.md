# Survey: Geneva Bible notes, Reformed annotated Bibles, and passage-keyed sermons

Researched 2026-11-04 for the Reformed Bible study app. The repo was only read,
not changed. Rules applied (dataset/AGENTS.md and
docs/plans/2026-11-04-0307-feat-widen-reformed-content-plan.md):

- License evidence must be an exact quote from the specific edition's own page.
- An aggregator's claim, or a blank rights field, does not count as evidence.
  The plan's Hodge precedent is that a blank CCEL `DC.Rights` blocks a text.
- Clean digital text is required. Scan-only or raw OCR fails.
- Evidence quotes must not contain URLs.
- Every item must hang off a passage or a confession article.

Existing adapters: CrossWire SWORD (zCom, zCom4, OSIS Bible text), EEBO-TCP TEI,
USFM, BSB USJ. There is no CCEL ThML adapter and no SWORD RawGenBook adapter.

Verification legend: **[verified]** means I fetched the file or page and checked
it today. **[unverified]** means it is inferred or comes from secondary reports.

---

## Part A: Geneva Bible and other Reformed Bibles with notes

### A1. 1561 Geneva Bible with its marginal notes, EEBO-TCP A10675 (best Geneva-notes candidate)

- **Source:** https://github.com/textcreationpartnership/A10675 (TEI P5 XML,
  A10675.xml, 16 MB). STC 2095, "The Bible and Holy Scriptures conteyned in the
  Olde and Newe Testament ... VVith moste profitable annotations vpon all the
  hard places". This is the 1561 printing of the 1560 Geneva, including the
  Apocrypha. **[verified]**
- **License quote** (README "Availability" and TEI `<availability>`): "This
  Phase I text is available for reuse, according to the terms of Creative
  Commons 0 1.0 Universal." This is the same sentence Poole's record already
  uses. **[verified]**
- **Coverage:**
  - The whole Bible: 78 book divs and 1,203 chapter divs, Psalms separate.
  - 22,626 `<note place="margin">` elements. This total includes cross-reference
    notes, alternative-reading notes (n="“") and day markers.
  - Verses are encoded as
    `<p n="1">1 IN the<note n="a" place="margin">…</note> beginning …</p>`.
  - These are the original 1560 notes, not the 1599 Tomson New Testament and
    Junius Revelation notes. **[verified]**
- **Quality:**
  - 32,096 `<gap reason="illegible" extent="1 word">` marks. That is far denser
    than Poole (Genesis 1 alone has about 8 gaps, most of them in notes).
  - Original spelling: vpon, heauen, ſ. Abbreviation strokes use
    `<g ref="char:cmbAbbrStroke">`. **[verified]**
- **Passage per item:** Yes. Each note sits inside its verse paragraph, and the
  book, chapter and verse come from div/@n and p/@n. The KJV-numbering mapping
  is the same problem Poole had. Psalm titles and verse splits need checking.
  **[verified structure; mapping unverified]**
- **Adapter fit:** The EEBO-TCP TEI adapter, extended. Notes would be pulled out
  of each verse paragraph to make a "Geneva notes" commentary. The 1561 Bible
  text could become a translation too, but it has heavy gaps.
- **Verdict: POSSIBLE, leaning strong on license and structure.** The license is
  clean CC0 and the notes are keyed per verse. Gap density is the risk. Sample a
  few books for readability before committing. The notes are the 1560 set, not
  the better-known 1599 set.

### A2. CrossWire `Geneva1599` (Bible text, no notes)

- **Source:**
  https://www.crosswire.org/ftpmirror/pub/sword/packages/rawzip/Geneva1599.zip.
  zText, OSIS source, NRSV versification, version 2.0 (2012-08-30).
  **[verified]**
- **License quote**
  (https://www.crosswire.org/ftpmirror/pub/sword/raw/mods.d/geneva1599.conf):
  "DistributionLicense=Public Domain". The conf also says "About=1599 Geneva
  Bible\par Electronic edition edited by Mark Langley." **[verified]**
- **Coverage:**
  - 66 books in original spelling ("The booke of the generation of Jesus Christ
    the sonne of Dauid").
  - **No notes:** the decoded module has 0 `<note>` elements and no footnote
    filter.
  - Markup is limited to `<lb>`, `<chapter>`, `<div>` and `<closer>`.
    **[verified]**
- **Adapter fit:** The existing SWORD zText/OSIS Bible adapter. NRSV
  versification has to be mapped to KJV numbering.
- **Verdict: STRONG as a fifth translation (text only).** It does not provide
  the notes. Mark Langley's own source page was not checked **[unverified]**,
  and the conf is the module's own page.

### A3. eBible.org `enggnv` (Bible text, no notes)

- **Source:** https://ebible.org/find/details.php?id=enggnv. USFM zip at
  https://ebible.org/Scriptures/enggnv_usfm.zip. USFX and a SWORD build are also
  offered. **[verified]**
- **License quote** (copr.htm inside the zip, and the details page): "This
  digital copy is freely available world-wide, with no copyright restrictions,
  courtesy of eBible.org and many others." The page is also headed "Public
  Domain". **[verified]**
- **Coverage:** 66 canonical books. **No footnotes:** 0 `\f` markers across all
  USFM files. Same original-spelling text as Langley. Source files are dated 12
  Dec 2025. **[verified]**
- **Adapter fit:** The existing USFM adapter. KJV-like numbering, so mapping is
  easier than Geneva1599's NRSV.
- **Verdict: STRONG as a translation (text only). Prefer it to A2** because USFM
  fits an existing adapter and the versification is closer to KJV.

### A4. CrossWire `Geneva` ("Geneva Bible Translation Notes", zCom)

- **Source:**
  https://www.crosswire.org/ftpmirror/pub/sword/packages/rawzip/Geneva.zip.
  zCom, ThML markup, version 1.1, dated 2001-11-28. **[verified]**
- **License:** **None.**
  - The conf has no `DistributionLicense` line.
  - https://www.crosswire.org/sword/modules/ModInfo.jsp?modName=Geneva shows
    "Distribution License null". **[verified]**
- **Coverage:** 14,791 verse entries (10,530 OT, 4,261 NT) and about 18,300 note
  markers. These are the 1599 notes in modernized spelling. **[verified]**
- **Quality problem:**
  - Each entry interleaves a non-Geneva verse text with the notes. Matthew 1
    reads "Now the birth of (2) Jesus Christ was thus: His mother, Mary, that
    is, having been betrothed to Joseph…", which looks like Darby's wording
    **[my identification, unverified]**.
  - Who modernized the notes is not recorded.
- **Verdict: BLOCKED.** The rights field is blank, the modernization has no
  recorded provenance, and the verse text comes from a different translation.
  The same modernized notes circulate on StudyLight, Blue Letter Bible and
  SwordSearcher, but those are aggregators and do not count.

### A5. Tolle Lege Press 1599 Geneva (modernized spelling, with notes)

- **License quote**
  (https://www.biblegateway.com/versions/1599-Geneva-Bible-GNV/, as reported by
  WebFetch): "Geneva Bible, 1599 Edition. Published by Tolle Lege Press. All
  rights reserved." It continues, "No part of this publication may be reproduced
  or transmitted in any form or by any means, electronic or mechanical, without
  written permission from the publisher…". The print edition carries "Copyright
  © 2006-2007 by Tolle Lege Press" **[secondary report, unverified]**.
- **What is free and what is not:**
  - The 1599 words and notes are public domain.
  - Tolle Lege's modernized spelling, punctuation, typesetting and digital text
    are claimed by Tolle Lege.
  - Bible Gateway's GNV is the Tolle Lege text.
  - Do not ingest Bible Gateway's GNV, Tolle Lege's CD-ROM, or any "modern
    spelling 1599 Geneva" whose source you cannot trace to a PD transcription.
- **Verdict: BLOCKED** (copyright).

### A6. Statenvertaling with Kanttekeningen (Dutch, 1637 text, about 1888 spelling)

Two clean sources exist.

**(a) Isidore-Guild OSIS: STRONG on license and format, but Dutch.**

- **Source:** https://github.com/Isidore-Guild/statenvertaling, file STV.xml (31
  MB OSIS). **[verified]**
- **License:**
  - The repo's LICENSE file begins "CC0 1.0 Universal", and GitHub detects the
    license as cc0-1.0.
  - STV.conf in the repo says "DistributionLicense=Public Domain".
  - **[verified]**
- **Coverage:**
  - 31,102 verses.
  - 59,385 `<note>` elements with `<catchWord>` and OSIS `<reference osisRef>`,
    keyed per verse, with Strong's numbers.
  - The README says the notes "supersede the commentary module DutKant". The
    text "corresponds to a text stemming from the 1888 edition". Versification
    is KJV. **[verified]**
  - Sample note:
    `<verse osisID="Matt.1.1">…<note><catchWord>boek des geslachts</catchWord> Dit is geslachtregister…`
- **Caveat:** The repo was last pushed 2021-01-01. The README does not say where
  the Kanttekeningen transcription came from, beyond its being merged from
  DutKant.

**(b) CrossWire `DutKant` (zCom, ThML): possible.**

- **Source:**
  https://www.crosswire.org/ftpmirror/pub/sword/packages/rawzip/DutKant.zip.
- **License:** the conf says "DistributionLicense=Public Domain". **[verified]**
- **Coverage:** 25,263 verse entries (18,775 OT, 6,488 NT), modernized Dutch.
  **[verified]**
- **Adapter fit:** The existing zCom adapter, with ThML inline markup (`<b>`,
  `<scripRef>`).

The related CrossWire DutSVV and DutSVVA text modules both say
"DistributionLicense=Public Domain". DutSVVA was built from the Isidore-Guild
source. **[verified]**

**Verdict: STRONG for license and structure, but it is Dutch.** It only helps if
the app takes on a first non-English reading resource. The app now ships English
plus Greek and Hebrew tools. That is the owner's call.

### A7. 1657 English "Dutch Annotations upon the Whole Bible" (Theodore Haak)

- **EEBO-TCP:** Not present. The TCP catalog has no Haak entry and no "Dutch
  annotations" title. **[verified against TCP.csv, 61,315 rows]**
- **Internet Archive:**
  - Item https://archive.org/details/dutch-annotations: a 231 MB PDF scan with
    Tesseract OCR (djvu.txt).
  - Metadata licenseurl is the Public Domain Mark. The uploader is a private
    individual. **[verified]**
- **Other copies:** An e-Sword or BibleSupport module is reported but its
  license was not checked **[unverified]**. Reformation Heritage Books sells a
  print facsimile.
- **Verdict: BLOCKED.** The only digital text is uncorrected OCR of a 1657
  print, which fails the clean-text rule, and the archive.org PDM is an
  uploader's claim.

### A8. Adjacent finds (not asked for, worth noting)

- **Diodati, _Pious Annotations upon the Holy Bible_ (1643), EEBO-TCP A36033**,
  922 pages.
  - README: "This Phase I text is available for reuse, according to the terms of
    Creative Commons 0 1.0 Universal." **[verified]**
  - Diodati was the Genevan Reformed annotator. Same TEI adapter path as Poole.
    Structure not inspected **[unverified]**.
  - Commentator approval is the owner's call.
- **EEBO-TCP A11299 (1591):** "The third part of the Bible … expounded with most
  profitable annotations", a Geneva-tradition Job to Song of Songs. The catalog
  lists 1 page, so it may be a stub **[unverified]**.
- **No 1599 Geneva or Tomson New Testament edition is in EEBO-TCP.** The only
  Geneva Bible there is A10675. **[verified against catalog]**

---

## Part B: Sermons keyed to a text passage

### How passages are recorded in the sources

- **EEBO-TCP TEI:**
  - Most sermons are `<div type="sermon">` with `<head>` and an `<epigraph>`.
  - Manton and the American Edwards imprints put the text in
    `<epigraph><bibl>PSAL. CXIX. 1.</bibl><q>…</q></epigraph>`. That is
    machine-readable after a small 17th-century-citation parser (roman-numeral
    chapters, abbreviations such as MATTH., "v.", "ver.").
  - Calvin's Golding translations have no `<bibl>`. The head gives the chapter
    ("The ſecond Sermon vpon the firſt Chapter."), and the epigraph quotes the
    verses as `<p n="3">3 And it came to passe…</p>`, often with the first verse
    unnumbered. That is derivable, but needs a parser plus a hand-checked table.
  - The TEI header `<keywords>` carries LCSH terms such as "Bible. -- N.T. --
    Hebrews XI, 7 -- Sermons.", but only at whole-book level.
  - Catalog stats (TCP.csv, EEBO A and B ids): 4,688 sermon-tagged items, 2,054
    with a "Bible … Sermons" term, and 1,941 of those at verse level (730 Phase
    I, 1,324 Phase II).
- **CCEL ThML:** Some volumes carry `<scripRef osisRef=…>` for each sermon's
  text on the title page (Edwards _Select Sermons_). But every ThML I checked
  except Boston's has a blank `<DC.Rights />`.
- **SWORD JESermons:** An OSIS genbook whose TOC entries carry `osisRef` for
  each sermon text, for example `osisRef="Deut.32.35"`.

### EEBO-TCP license sentences (both verified in the READMEs)

- **Phase I** ("Free" in TCP.csv): "This Phase I text is available for reuse,
  according to the terms of Creative Commons 0 1.0 Universal."
- **Phase II** ("Restricted" in the old TCP.csv, now released): "To the extent
  possible under law, the Text Creation Partnership has waived all copyright and
  related or neighboring rights to this keyboarded and encoded edition of the
  work described above, according to the terms of the CC0 1.0 Public Domain
  Dedication". The sentence goes on to a parenthesised URL. Stop the quote
  before it, because evidence quotes may not contain URLs. Verified on A17722
  and A44565.

### B1. Calvin's sermons, Golding and others, EEBO-TCP

All of these are Elizabethan translations, so the translators are long dead and
the texts are public domain. All are CC0 per the sentences above. "Sermons"
counts the `<div type="sermon">` elements I counted. "Gaps" counts `<gap>`
elements.

| Text                                                                                                                                                  | TCP id                                         | Phase | Sermons                                                               | Passage                                           | Gaps / size            |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ----- | --------------------------------------------------------------------- | ------------------------------------------------- | ---------------------- |
| Job (Golding 1574)                                                                                                                                    | A69056                                         | I     | 159 (3 prayers)                                                       | Job 1–42, chapter from head, verses from epigraph | 697 / 7.3 MB           |
| Deuteronomy (Golding 1583)                                                                                                                            | A17698                                         | I     | 190 sermon divs (heads run to "CC.", so some are nested or mis-typed) | Deut, epigraph `<p n=>` verses, dated heads       | 2,321 / 11 MB          |
| Ephesians (Golding 1577)                                                                                                                              | A17705                                         | I     | 48                                                                    | Eph 1–6                                           | 2,910 / 2.4 MB (dense) |
| Galatians (1574)                                                                                                                                      | A17706                                         | I     | 43                                                                    | Gal 1–6                                           | 551 / 2.0 MB           |
| Isaiah 38, Hezekiah's song (1560)                                                                                                                     | A17716                                         | I     | not counted                                                           | Isa 38                                            | not checked            |
| Ten Commandments (1579)                                                                                                                               | A17717                                         | I     | not counted                                                           | Deut 5 (expected)                                 | not checked            |
| Election, Jacob and Esau (1579)                                                                                                                       | A17722                                         | II    | 12 (+ texts), with `<bibl>` "Geneſ. Chap. 25. verſ. 12."              | Gen 25–27                                         | 33 / 0.7 MB            |
| Psalm 119, 22 sermons (1580)                                                                                                                          | A17724                                         | II    | 22 (no epigraph)                                                      | Ps 119, one per 8-verse section                   | 23 / 0.9 MB            |
| Melchizedek (1592), Four sermons (1579), Diverse sermons on the nativity (1581), Psalm 87 (1581), Four godly sermons (1561), Two godly sermons (1560) | A17696, A17694, A17690, A17693, A17692, A69062 | II    | small                                                                 | mixed                                             | not checked            |

- **Source URL pattern:** https://github.com/textcreationpartnership/A69056 (and
  so on). Raw XML is on raw.githubusercontent.com, which is already an approved
  host. **[verified for the downloaded ids]**
- **1 Timothy and Titus sermons (1579, L.T. translation): not in EEBO-TCP.** I
  checked STC 4441 and title searches. Only scans exist, and Banner of Truth's
  1983 facsimile is a modern product. **BLOCKED.**
- **Modern Calvin sermon translations are all in copyright.** These include
  Banner of Truth's revised Ephesians (1973), Micah, 2 Samuel, Acts, Genesis,
  Isaiah 53 and the Beatitudes.
- **CCEL `calvin/sermons`** is "Three Volumes of Sermons" (VOLUMEN LXI–LXIII),
  the Corpus Reformatorum French and Latin texts, not English, and
  `<DC.Rights />` is blank. **BLOCKED.**
- **Adapter fit:** The EEBO-TCP TEI adapter, plus a new "sermon" resource kind
  with one item per sermon whose `ref` is a range. The adapter would need an
  epigraph-verse parser and a manual override table for Calvin, because the
  first verse is unnumbered and some heads are misnumbered.
- **Verdict: STRONG for Job, Deuteronomy and Galatians. POSSIBLE for Ephesians**
  because of its gap density. **STRONG for the Election and Psalm 119 sets**
  (Phase II CC0, few gaps). The Ephesians, Job and Deuteronomy sets the brief
  asked about are all here, but in 16th-century spelling. Calvin's sermons are
  outside the current plan's scope ("Calvin's Institutes, sermons and letters"
  are excluded there), so the owner has to bring them in.

### B2. Thomas Manton, EEBO-TCP

All Phase I CC0, with the README sentence verified on A51842.

| Text                                                                                                     | TCP id                  | Sermons                                                          | Passage recording                                                                                                |
| -------------------------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 190 sermons on Psalm 119 (1681)                                                                          | A51842                  | 190                                                              | 190 of 190 have `<bibl>`, from "PSAL. CXIX. 1." to "PSALM CXIX. VER. 176."                                       |
| Second volume (1684): Matt 25, John 17, Rom 6, Rom 8, 2 Cor 5                                            | A51846                  | 190 sermon divs                                                  | 184 `<bibl>`. Leading tokens include ROM (71), JOHN (45), MATTH (26) and "2" (40, i.e. 2 Cor)                    |
| Fourth volume, 150 sermons on several texts (1693)                                                       | A51840                  | 156 sermon-type divs (including `sermon_on_Psalms` and the like) | Partial. About 54 of 74 `sermon` divs show a `<bibl>` near the head. The others need the head or div type parsed |
| XVIII sermons on 2 Thess 2 (1679)                                                                        | A51839                  | 18 (not counted)                                                 | 2 Thess 2                                                                                                        |
| Christ's temptation and transfiguration (1685)                                                           | A51838                  | not counted                                                      | Matt 4, Matt 17 (expected)                                                                                       |
| Sermons preached (1678); Christ's eternal existence (1685); single sermons (A89500 Zech 14:9 and others) | A51847, A51837, A89500… | small                                                            | mixed                                                                                                            |

- **Gaps:** 887 in 7.2 MB for Psalm 119 and 1,821 in 8.5 MB for the second
  volume. Spelling is late 17th century, much easier to read than Calvin's
  Golding translations.
- **CCEL Manton** (Nisbet _Complete Works_, vols 1–8 and 20): `<DC.Rights />` is
  blank in every volume, and the file comment says "Copyright Christian Classics
  Ethereal Library". **BLOCKED** under the Hodge precedent.
- **Adapter fit:** The EEBO-TCP TEI adapter plus a sermon item kind, with a
  `<bibl>` parser.
- **Verdict: STRONG.** This is the best-structured sermon corpus found: about
  550 or more sermons whose text reference is explicit per sermon. **This is my
  top sermon candidate.**

### B3. Jonathan Edwards

- **Yale WJE Online (edwards.yale.edu): BLOCKED.** The
  http://edwards.yale.edu/copyright page says:
  - "Transcripts are the result of countless hours of labor and are not in the
    public domain."
  - "You are not permitted to sell, lease, license, rent, transfer, disassemble,
    modify, post, or publish any aspect of the materials, or authorize others to
    use these materials for commercial purposes."
  - "In the event you wish to use these materials other than as provided above,
    including quoting from or publishing texts in whole or in part, you must
    obtain explicit written permission from the Jonathan Edwards Center at Yale
    University"
  - "All rights reserved."
  - **[verified]** The site's TLS certificate has expired, so I fetched it with
    curl -k.
- **Evans-TCP early American imprints (N-ids): STRONG.**
  - About 19 sermon imprints printed in Edwards's lifetime or soon after. Among
    them:
    - Sinners in the Hands (N03833)
    - God Glorified (N02859)
    - A Divine and Supernatural Light (N03122)
    - Discourses on various important subjects (N03467, 388 pages)
    - Distinguishing Marks (N03831)
    - Farewell Sermon (N05272)
    - True Grace (N05520)
    - A Strong Rod Broken (N04899)
    - Ruth's Resolution (N06770)
    - Sermons on various subjects (N13259, 1780)
    - Justice of God (N37435)
  - License: N03833's TEI `<availability>` carries the same Phase I CC0
    sentence. **[verified]**
  - Passage: `<epigraph><bibl>DEUT. XXXII. 35.</bibl>`, which is
    machine-readable. **[verified on N03833]**
  - The catalog's Terms field has no Bible terms for Edwards, so references come
    from the TEI.
- **Project Gutenberg #34632, _Selected Sermons of Jonathan Edwards_ (ed. H. N.
  Gardiner, Macmillan 1904): POSSIBLE.**
  - https://www.gutenberg.org/ebooks/34632, plain text or HTML.
  - The ebook page's Copyright field reads "Public domain in the USA."
    **[verified]**
  - 7 sermons, each opening with its text line, for example "1 COR. i.
    29-31.--That no flesh…", "RUTH i. 16.", "JOHN xiv. 2.", "DEUTERONOMY xxxii.
    35.".
  - The 1904 introduction and notes are also public domain.
  - Strip the Project Gutenberg licence boilerplate.
  - Needs a small plain-text adapter. The license statement is US-scoped.
- **CCEL `edwards/sermons`, `works1` and `works2`:** `<DC.Rights />` is blank.
  **BLOCKED** under the Hodge precedent, even though the ThML gives per-sermon
  `scripRef osisRef`.
- **CrossWire `JESermons`: POSSIBLE but likely blocked.**
  - The conf says "DistributionLicense=Public Domain" and "TextSource=CCEL".
    **[verified]**
  - It is an OSIS RawGenBook, and the TOC carries an osisRef per sermon
    (Deut.32.35, Matt.16.17, Luke.22.44, Rom.9.18 and others), about 20 sermons.
  - Its CCEL source has a blank rights field. The plan accepted Henry and JFB
    only because both the conf and CCEL declared public domain.
  - It also needs a new RawGenBook adapter.
- **Verdict:** Evans-TCP is **STRONG** and Gutenberg is **POSSIBLE**. Yale, CCEL
  and JESermons are blocked.

### B4. Robert Murray M'Cheyne

- **EEBO and Evans:** None (he was born in 1813).
- **CCEL:** Nothing found (`/ccel/mccheyne` lists no works).
- **Project Gutenberg:** Has only Bonar's _Biography of Robert Murray M'Cheyne_
  (#15251, "Public domain in the USA."), not the sermons.
- **archive.org:** _Memoir and Remains_ (1848, 1878, 1883, 1892), _Additional
  Remains_ (1849, 1854) and _The Sermons of the Rev. Robert Murray McCheyne_
  (1863) are scans with OCR only. **[verified via search API]**
- **mcheyne.info:** Has transcriptions, but its footer says "Copyright © 2019.
  All rights reserved". **[verified]**
- **Banner of Truth:** Its OT, NT and Hebrews sermon books are modern
  transcriptions of his notes and are in copyright.
- **Verdict: BLOCKED.** No clean public-domain text was found. Clean text would
  mean the project transcribing OCR itself, which is out of policy.

### B5. Samuel Rutherford

- **EEBO-TCP, all Phase I CC0** (README sentence verified on A57982):
  - _The Tryal & Triumph of Faith_ (1652 edition), A57982. Sermons on Christ and
    the woman of Canaan (Matt 15:21–28 and Mark 7:24–30). 54 sermon divs (likely
    27 sermons with sub-divisions **[unverified]**). Only 5 carry `<bibl>`, for
    example "Mar. 7.30.". 389 gaps in 1.0 MB.
  - _Christ Dying and Drawing Sinners to Himself_ (1647), A57963, on John
    12:27–33. It has 4 "part" divs and no sermon divs, so it is a treatise built
    from sermons. 3,432 gaps in 2.6 MB (dense).
  - Single sermons: A57979 (Dan 6:26, to the Commons 1644), A92145 (to the Lords
    1645), A57965 _Christ's Napkin_ (communion sermon 1633), A11197 _Christ and
    the Doves_ (communion sermon).
- **CCEL `rutherford/triumph`:** `<DC.Rights />` is blank. **BLOCKED.**
- **Other sources:** _Fourteen Communion Sermons_ (Bonar 1877) and _Quaint
  Sermons_ (1885) exist only as scans **[unverified beyond catalog knowledge]**.
- **Verdict:** **POSSIBLE** for _Trial and Triumph_ (one pericope, so one
  passage covers the set; per-sermon verses need hand-keying). **POSSIBLE** for
  the single sermons. **WEAK** for _Christ Dying_.

### B6. Thomas Boston

- **CCEL `boston/crook`, _The Crook in the Lot_: POSSIBLE.**
  - https://ccel.org/ccel/boston/crook.xml, ThML.
  - The file has `<DC.Rights>Public Domain</DC.Rights>`. **[verified]** It is
    the only CCEL file in this survey with a filled rights field.
  - Discourses on Eccl 7:13, Prov 16:19 and 1 Pet 5:6, in 3 parts with a
    scripture index.
  - Needs a ThML adapter, which the plan has already deferred for Calvin on
    Isaiah.
- **Evans-TCP N34404:** _Human Nature in its Fourfold State_ (American 1787
  printing). Practical discourses arranged by topic, not keyed to a passage.
  **Not a fit.**
- **Boston's _Complete Works_** (12 vols, 1848–52): scans only **[unverified]**.
  No ECCO-TCP Boston texts were found in TCP.csv.
- **Verdict:** **POSSIBLE** (small, needs a ThML adapter). The rest is blocked.

### B7. Other Puritan sermons in EEBO-TCP (general pool)

- **Size:** 1,941 EEBO sermon items carry a verse-level LCSH Bible term in the
  TEI header, for example "Bible. -- O.T. -- Psalms XIII, 1 -- Sermons.". That
  is item-level and machine-readable.
- **Reformed and Puritan authors with such items** (counts are items with a
  "Bible … Sermons" term):

  | Author     | Items |
  | ---------- | ----- |
  | Reynolds   | 18    |
  | Marshall   | 16    |
  | Calamy     | 12    |
  | Watson     | 9     |
  | Case       | 9     |
  | Caryl      | 9     |
  | Goodwin    | 9     |
  | Burgess    | 9     |
  | Manton     | 7     |
  | Owen       | 7     |
  | Baxter     | 7     |
  | Calvin     | 7     |
  | Jenkyn     | 6     |
  | Sibbes     | 5     |
  | Burroughs  | 4     |
  | Perkins    | 4     |
  | Love       | 4     |
  | Durham     | 4     |
  | Henderson  | 3     |
  | Gouge      | 3     |
  | Rutherford | 2     |
  | Gillespie  | 2     |
  | Ussher     | 2     |
  | Flavel     | 1     |
  | Charnock   | 1     |
  | Brooks     | 1     |

- **What the pool contains:** Many of these are single fast-day or parliamentary
  sermons, so the header term is the sermon's own text. The pool also holds many
  Anglican and non-Reformed preachers, so the owner must approve authors, as
  with the commentator list.
- **License:** CC0 (Phase I and Phase II sentences above).
- **Adapter fit:** The EEBO-TCP TEI adapter plus a sermon kind. For
  single-sermon items, the header keyword gives the passage directly.
- **Verdict: STRONG as a pool.** It needs a curation list and a sermon item
  kind. Phase I items are "Free" in TCP.csv. Phase II items show "Restricted" in
  the stale CSV but carry the CC0 waiver in their GitHub READMEs.

---

## Summary table

| #   | Candidate                          | Verdict                                                   | Best source / format                            | License evidence                                              | Coverage                                                          | Passage per item                                            |
| --- | ---------------------------------- | --------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------- |
| A1  | 1561 Geneva Bible + marginal notes | Possible (gaps)                                           | EEBO-TCP A10675, TEI                            | Phase I CC0 sentence                                          | Whole Bible + Apocrypha, 22,626 notes; 32,096 illegible-word gaps | Yes (verse p/@n)                                            |
| A2  | Geneva1599 SWORD text              | Strong (text only)                                        | CrossWire zText/OSIS                            | conf "DistributionLicense=Public Domain"                      | 66 books, no notes                                                | n/a                                                         |
| A3  | eBible enggnv                      | Strong (text only)                                        | USFM zip                                        | "freely available world-wide, with no copyright restrictions" | 66 books, 0 footnotes                                             | n/a                                                         |
| A4  | CrossWire Geneva notes             | Blocked                                                   | zCom ThML                                       | conf blank, ModInfo "null"                                    | 14,791 entries, modernized, Darby-like verse text mixed in        | Yes                                                         |
| A5  | Tolle Lege 1599                    | Blocked                                                   | —                                               | "All rights reserved"                                         | —                                                                 | —                                                           |
| A6  | Statenvertaling + Kanttekeningen   | Strong if Dutch is in scope                               | Isidore-Guild STV.xml (OSIS); alt. DutKant zCom | LICENSE "CC0 1.0 Universal"; DutKant conf "Public Domain"     | 31,102 verses, 59,385 notes                                       | Yes (osisID)                                                |
| A7  | 1657 English Dutch Annotations     | Blocked                                                   | archive.org scan + OCR                          | uploader PDM only                                             | —                                                                 | —                                                           |
| B1  | Calvin sermons (Golding etc.)      | Strong (Job, Deut, Gal, Election, Ps 119); Possible (Eph) | EEBO-TCP TEI                                    | Phase I / II CC0                                              | ~475 sermons in the six main sets, plus small sets                | Derivable (head + epigraph verses); `<bibl>` only in A17722 |
| B1x | Calvin 1 Tim / Titus               | Blocked                                                   | scans only                                      | —                                                             | —                                                                 | —                                                           |
| B2  | Manton                             | Strong (top pick)                                         | EEBO-TCP A51842, A51846, A51840, A51839…        | Phase I CC0                                                   | ~550+ sermons                                                     | Yes, `<epigraph><bibl>`                                     |
| B3  | Edwards (Yale WJE)                 | Blocked                                                   | —                                               | "not in the public domain … All rights reserved"              | —                                                                 | —                                                           |
| B3  | Edwards (Evans-TCP)                | Strong                                                    | Evans-TCP N-ids, TEI                            | Phase I CC0                                                   | ~19 imprints                                                      | Yes, `<bibl>`                                               |
| B3  | Edwards (Gutenberg #34632)         | Possible                                                  | plain text / HTML                               | "Public domain in the USA."                                   | 7 sermons                                                         | Text line per sermon                                        |
| B3  | Edwards (CCEL, JESermons)          | Blocked / likely blocked                                  | ThML; OSIS genbook                              | CCEL blank; conf PD with CCEL source                          | ~20 sermons                                                       | Yes (osisRef)                                               |
| B4  | M'Cheyne                           | Blocked                                                   | scans only; mcheyne.info all rights reserved    | —                                                             | —                                                                 | —                                                           |
| B5  | Rutherford                         | Possible                                                  | EEBO-TCP A57982 and others                      | Phase I CC0                                                   | ~27 sermons + singles                                             | Partial                                                     |
| B6  | Boston, _Crook in the Lot_         | Possible                                                  | CCEL ThML                                       | `<DC.Rights>Public Domain</DC.Rights>`                        | 1 work, 3 parts                                                   | Section-level                                               |
| B7  | EEBO-TCP Puritan sermon pool       | Strong (needs curation)                                   | EEBO-TCP TEI                                    | Phase I / II CC0                                              | 1,941 verse-tagged items                                          | Yes (header LCSH; epigraph)                                 |

## Cross-cutting notes for the plan

1. **A "sermon" resource kind is new.**
   - Items are whole discourses keyed to a passage range, not per-verse
     comments.
   - Coverage semantics differ from commentary: a passage has zero or more
     sermons.
   - The schema needs `refs` as a range, plus title, preacher and date (the
     Calvin Deuteronomy heads give preaching dates).
2. **One TEI parser serves all strong sermon picks.** A `<bibl>` citation parser
   covers Manton, Evans-TCP Edwards and single sermons. Calvin needs head and
   epigraph verse inference with a hand-checked override file.
3. **CCEL rights:** Every CCEL ThML checked here except Boston's has a blank
   `<DC.Rights />`. The plan's Hodge precedent blocks all of them.
4. **Spelling:** 16th-century texts (Calvin's Golding translations, the 1561
   Geneva) use long s, u/v and i/j. The Poole record already keeps original
   spelling, so this is consistent, but readability is lower than Poole's 1680s
   English.
5. **Dutch:** The Kanttekeningen source is clean and CC0, but it would be the
   first Dutch reading resource. That is the owner's decision.
