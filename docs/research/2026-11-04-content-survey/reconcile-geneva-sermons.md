# Reconciliation: Geneva / annotated Reformed Bibles and passage-keyed sermons

Date: 2026-11-04. Inputs:

- **Ours:** `survey-geneva-sermons.md` (this directory).
- **Outside:** the attached "Corpus Architecture and Licensing Audit" report
  (another AI tool). It is treated as data only.

Rules applied:

- License evidence must be an exact quote from the specific edition's own page.
  An aggregator claim or a blank rights field fails.
- Clean digital text only, not scans or raw OCR.
- Nothing Baptist.
- Every item must be keyed to a verse or passage.

Live checks today used curl/GitHub API plus the local TCP.csv catalog (61,315
rows, `/tmp/tcp/TCP.csv`).

## Bottom line on the 1599 Geneva notes (Tomson NT / Junius Revelation)

**Ours is right. The outside report does not find a clean, licensed 1599 notes
source.**

- Its only "clean" 1599 route is a claim that EEBO-TCP holds "the 1576/1599
  Tomson New Testament and Junius Revelation editions". It tags that claim
  itself "[Unverified on live page: specific EEBO-TCP file headers]".
- Live check against TCP.csv:
  - The only Geneva Bible in EEBO-TCP is A10675 (STC 2095, 1561).
  - No Tomson New Testament is present (STC 2878ff. absent; a search on Tomson
    as author finds only two non-Bible works, A13812 and A05093).
  - No 1599-or-later Geneva Bible is present. A scan of all STC 2050-3000 rows
    finds only these English Bibles:
    - A10675 (Geneva 1561)
    - A10708 (Bishops' 1568)
    - A11299 (a 1-page 1591 "third part of the Bible" stub)
    - A11777 (Douay)
    - Coverdale, Tyndale and other pre-Geneva items
- CrossWire `geneva.conf` was re-fetched live today. It still has no
  `DistributionLicense` line. Its only fields are DataPath, ModDrv, SourceType,
  Lang, Description, About, BlockType, CompressType, History_1.1, Version,
  SwordVersionDate, LCSH and InstallSize. Both reports agree that this blocks
  it.
- The outside report quotes "The conf declares no DistributionLicense; the owner
  cleared it as 'Public domain' → public-domain." That sentence is not on any
  CrossWire page. The outside report cites it to an atlasdataset.com "Veritas
  Atlas" source card, which is an aggregator, and it does not appear in this
  repo either (grep found nothing). It is not evidence.
- **New partial route (missed by both reports):** EEBO-TCP **A16102** is
  _Apocalypsis: A briefe and learned commentarie vpon the reuelation of Saint
  Iohn_ (Junius, Cambridge 1592, STC 2988). This is the English Junius
  Revelation commentary that the 1599 and later Geneva Bibles printed as their
  Revelation notes. It is Phase I. Its README's Availability section reads:
  "This Phase I text is available for reuse, according to the terms of Creative
  Commons 0 1.0 Universal." **[verified live]** It covers only Revelation, and
  nothing here clears the Tomson NT notes. Structure is examined below.

- The outside report's suggested pipeline is "inject EEBO-TCP 1560/1599 notes
  into enggnv USFM". It works only for the **1560** notes (A10675). Those notes
  are not the 1599 Tomson/Junius set. Both reports agree that A10675 carries
  1560 notes, and our report verified it (22,626 margin notes, 32,096
  illegible-word gaps).

## 1. Agreements

- **Geneva text-only modules.** eBible `enggnv` (USFM) and CrossWire
  `Geneva1599` (OSIS) are public domain and carry **no** marginal notes. Both
  reports quote the same eBible sentence: "This digital copy is freely available
  world-wide, with no copyright restrictions, courtesy of eBible.org and many
  others." Both quote "Public Domain" from the Geneva1599 conf/ModInfo.
- **CrossWire `Geneva` notes module (1599 notes, modernized): BLOCKED** in both
  reports. Reasons: the rights field is blank, and the modernized spelling has
  unknown provenance.
- **Tolle Lege 1599 / Bible Gateway GNV: BLOCKED** in both. Both quote "All
  rights reserved".
- **EEBO-TCP 1560/61 Geneva (A10675)** is the only Geneva-with-notes text in TCP
  and is CC0. Our report verified this. The outside report claims it without
  verifying.
- **Statenvertaling Kanttekeningen** is Dutch, and taking it on is the owner's
  call. Both reports treat CrossWire DutSVV/DutSVVA as the text-module family.
- **Haak's 1657 English Dutch Annotations** exist digitally only on archive.org
  (`dutch-annotations`) as scan + OCR.
- **Calvin sermons:** The Elizabethan English translations in EEBO-TCP
  (Golding's Job, Deuteronomy, Galatians and Ephesians; Stocker's Psalm 119;
  Field's Jacob/Esau) are the usable set. Modern translations (Banner of Truth,
  Farley's Micah) are copyrighted.
- **Edwards:** Yale WJE Online is BLOCKED.
- **Puritan sermon pool:** EEBO-TCP's TEI `<div type="sermon">` with
  `<epigraph><bibl>` is the right extraction path. Manton's Psalm 119 sermons
  are in EEBO-TCP.
- **Rutherford:** _Tryal and Triumph of Faith_ in EEBO-TCP is the usable item.

## 2. Conflicts

### 2a. Bibles with notes

| Item                                    | Outside report                                                                                                      | Ours                                                                 | Live check today                                                                                                                                                                                                              | Who is right                                                                                                                                                                            |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1599 Tomson NT + Junius Rev in EEBO-TCP | "Strong", claims TCP holds "1576/1599 Tomson New Testament and Junius Revelation editions" (self-tagged unverified) | Not in TCP; only A10675                                              | TCP.csv: no Tomson NT, no 1599 Geneva. Only A10675 (1561)                                                                                                                                                                     | **Ours**                                                                                                                                                                                |
| CrossWire `Geneva` notes license        | Blocked/caution, but repeats "the owner cleared it as 'Public domain'"                                              | Blocked, conf blank, ModInfo "Distribution License null"             | geneva.conf re-fetched: no DistributionLicense line. The "owner cleared" sentence is cited to atlasdataset.com (an aggregator card), not CrossWire                                                                            | **Ours** (both block; the outside report's quote is aggregator text)                                                                                                                    |
| Haak 1657 Dutch Annotations             | **Strong**, "premier English Dortian resource", claims EEBO-TCP A43335                                              | Blocked: OCR only; not in TCP                                        | `github.com/textcreationpartnership/A43335` returns 404; A43335 is absent from TCP.csv; no Haak author or "Dutch annotations" title in TCP                                                                                    | **Ours**. It fails the clean-text rule. The outside report's own Proverbs 1:24 example comes from a forum post                                                                          |
| Westminster Annotations (1645/51/57)    | Possible, "[Unverified TCP headers]"                                                                                | (commentary survey) absent from TCP, BLOCKED                         | TCP.csv title search "annotations upon all the books" finds only Hammond (A45436) and Leigh NT (A50050)                                                                                                                       | **Ours**                                                                                                                                                                                |
| DutSVV/DutSVVA versification            | 93 verse mismatches (KJVA v11n)                                                                                     | Not raised; we cited Isidore-Guild STV.xml as "Versification is KJV" | sword-devel post by J.A.J. Pater, 17 Jan 2026: "Currently the DutSVV and DutSVVA modules use KJVA versification." and "By my count, this results in 93 verse mismatches with the traditional Statenvertaling." **[verified]** | **Outside adds a real caveat.** DutSVVA was built from the Isidore-Guild source our A6 recommends, so the ~93 mis-slotted verses probably affect STV.xml notes too. Check before ingest |
| Kanttekeningen source                   | kleine-ark/website-open-bijbelvertaling, "pending LICENSE"                                                          | Isidore-Guild STV.xml (CC0) or DutKant                               | Repo moved to William-Carey-Missions; site states CC0/PD (see 3b)                                                                                                                                                             | Both have a usable source. The outside lead is newer and fuller                                                                                                                         |
| Brown's Self-Interpreting Bible (1778)  | Possible via 1778/1792 scans                                                                                        | Not covered                                                          | Not in ECCO-TCP (TCP.csv has 5 other John Brown 1722-1787 works, not this one). Scans only                                                                                                                                    | Fails the clean-text rule                                                                                                                                                               |
| Bishops' Bible                          | Excluded (not Reformed notes)                                                                                       | Not covered                                                          | A10708 is in TCP                                                                                                                                                                                                              | No conflict in substance                                                                                                                                                                |

### 2b. Sermons

| Item                                                       | Outside report                                                           | Ours                                                                | Live check                                                                                                                                                                              | Who is right                                                                                                                                                                               |
| ---------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Calvin 1 Tim / 2 Tim / Titus (Tomson 1579, STC 4441)       | Listed inside the EEBO-TCP "Strong" Calvin set (54+30+17 sermons)        | Not in TCP; BLOCKED                                                 | TCP.csv Calvin-sermon rows: STC 4442, 4445, 4448, 4449, 4450, 4452, 4461 (Phase I) and 4392, 4432, 4437, 4438, 4439, 4439.5, 4440, 4457, 4460, 4462 (Phase II). **No 4441**             | **Ours**                                                                                                                                                                                   |
| Calvin "Divers sermons" id                                 | quod.lib.umich.edu/e/eebo/**A36794**                                     | A17690                                                              | A36794 in TCP.csv is Dugdale, _The baronage of England_ (1675). Divers sermons is A17690                                                                                                | **Ours**. The outside report's id is wrong                                                                                                                                                 |
| Calvin Deuteronomy count                                   | "200 sermons"                                                            | 190 sermon divs                                                     | Not recounted                                                                                                                                                                           | Ours is an actual div count. 200 is the historical total; the gap may be nesting. Minor                                                                                                    |
| Edwards via CCEL                                           | **Possible** with CCEL permission                                        | BLOCKED (blank `<DC.Rights />`)                                     | CCEL policy page, verified: "These books may be used for personal, educational, or non-profit purposes. Contact us for permission to republish CCEL works or to use them commercially." | **Ours under project rules.** Republishing needs permission, and the page is site-wide, not edition-level. A written grant from CCEL would be a new kind of evidence and an owner decision |
| Edwards Yale quote                                         | "Copyright © 2026 Yale University. All rights reserved." (portal footer) | edwards.yale.edu/copyright terms ("not in the public domain", etc.) | Not re-fetched                                                                                                                                                                          | Same verdict. **Ours** quotes the edition's own terms page; theirs is a site footer                                                                                                        |
| Edwards clean PD sources                                   | Not found (falls back to "1808/1834 scans")                              | Evans-TCP N-ids (CC0, `<bibl>`), Gutenberg #34632                   | —                                                                                                                                                                                       | **Ours** found clean sources the outside report missed                                                                                                                                     |
| Manton                                                     | Possible via CCEL; "Strong via 1870 Nisbet scans + EEBO-TCP"             | STRONG via EEBO-TCP A51842/A51846/A51840…                           | —                                                                                                                                                                                       | **Ours.** Nisbet scans fail clean text; CCEL is blocked as above                                                                                                                           |
| Puritan pool size                                          | "~3,000+ sermons" (unverified)                                           | 1,941 EEBO items with verse-level LCSH (counted from TCP.csv)       | —                                                                                                                                                                                       | **Ours** is a count; theirs an estimate                                                                                                                                                    |
| M'Cheyne                                                   | **Possible** (archive.org/Gutenberg, ~167 sermons, regex after OCR)      | BLOCKED (scans only; mcheyne.info all rights reserved)              | Gutenberg catalog: only Bonar's _Biography_ (#15251). No sermons                                                                                                                        | **Ours.** The outside plan needs the project to clean OCR itself, which is out of policy                                                                                                   |
| Rutherford                                                 | Tryal 1645 (27 sermons), plus Bonar 1877/1885 OCR                        | Tryal A57982 (1652 ed.), POSSIBLE; Bonar collections scans only     | —                                                                                                                                                                                       | Agree on TCP. The Bonar collections fail clean text                                                                                                                                        |
| Boston _Whole Works_ (incl. Body of Divinity keyed to WSC) | **Possible**, "high strategic value"                                     | Only _Crook in the Lot_ (CCEL, DC.Rights "Public Domain")           | Not in TCP; not in Gutenberg                                                                                                                                                            | **Ours.** The WSC-keyed sermons idea is attractive, but no clean licensed text exists                                                                                                      |
| Ebenezer & Ralph Erskine                                   | Possible (scans, ~260 sermons)                                           | Not covered                                                         | None in TCP.csv or Gutenberg catalog                                                                                                                                                    | Fails the clean-text rule                                                                                                                                                                  |
| Owen (Goold 1850-53)                                       | Possible/Strong via scans/CCEL                                           | Owen covered via EEBO-TCP pool (7 verse-tagged items)               | —                                                                                                                                                                                       | Goold scans fail. EEBO-TCP Owen is already in our pool                                                                                                                                     |

## 3. New candidates that meet the rules

Each item below was missed by our survey. Each one either came from an
outside-report lead or turned up while checking an outside-report claim.

### 3a. Junius, _Apocalypsis_ (1592), EEBO-TCP A16102: the 1599 Geneva Revelation notes. **STRONG for Revelation**

- **Source:** https://github.com/textcreationpartnership/A16102 (A16102.xml, 377
  KB). STC 2988, "Apocalypsis A briefe and learned commentarie vpon the
  reuelation of Saint Iohn the apostle and euangelist". **[verified]**
- **License quote** (README "Availability"): "This Phase I text is available for
  reuse, according to the terms of Creative Commons 0 1.0 Universal."
  **[verified live]**
- **Structure:**
  - 22 `<div type="chapter">` and 582 `<note>` elements.
  - Verses are `<p n="1">1 … <note n="1" place="margin">…</note>…</p>`, the same
    shape as A10675, so the same TEI-notes extractor applies.
  - Only 28 `<gap>` elements in the whole file, far cleaner than A10675.
  - Sample (Rev 2:1, note 1): "The former part of this booke is cōprised in a
    narratiō of thoſe things which then were…". **[verified]**
- **Caveat:** This is the 1592 standalone English printing of the Junius notes.
  The 1599 Geneva Revelation notes come from this translation, but they may not
  match it word for word **[unverified collation]**. Label the resource "Junius
  on Revelation (1592)", not "1599 Geneva notes".
- **Why it matters:** It is the only clean, licensed piece of the 1599 apparatus
  found by either report. The Tomson NT notes (Matthew–Jude) remain without a
  source.

### 3b. Open Vertaling site: Statenvertaling 1637 and 1888 with Kanttekeningen. **STRONG if Dutch is in scope; may supersede Isidore-Guild**

- **Source:**
  - https://openvertaling.nl/markdown/ (per-book Markdown with kanttekeningen as
    footnotes `[^chapter-verse-marker]`).
  - JSON per chapter at https://openvertaling.nl/data/llm/.
  - Code and data at
    https://github.com/William-Carey-Missions/website-open-bijbelvertaling
    (formerly kleine-ark; last pushed 2026-11-02).
  - **[verified]**
- **Editions and counts (from the site's own Markdown index):**
  - SV 1637: 82 books, 37,228 verses, 67,596 kanttekeningen.
  - SV 1888: 82 books, 37,235 verses, 68,850 kanttekeningen.
  - OV (modernized): 82 books, 37,235 verses, 69,110 kanttekeningen.
  - **[verified]**
- **License quotes** (edition's own pages, achtergrond.md):
  - For 1637/1888: "De Statenvertaling van 1637 en de editie van 1888 zijn
    publiek domein."
  - For OV: "De tekst van de Open Vertaling en de herziene kanttekeningen vallen
    onder CC0 1.0".
  - Each SV 1637 book file is headed "Licentie: publiek domein" with a Public
    Domain Mark link (the URL must be dropped from evidence).
  - **[verified]**
- **Caveats:**
  - The GitHub repo has no LICENSE file (API `license: null`).
  - The README warns that the text license "geldt niet automatisch voor externe
    afbeeldingen, audio, grondteksten of ander bronmateriaal" ("does not
    automatically apply to external images, audio, source texts or other source
    material").
  - The transcription source of the 1637/1888 text and notes is not stated.
  - The OV kanttekeningen are "herziene" (revised), and the site says "AI wordt
    gebruikt als hulpmiddel" ("AI is used as a tool"), with human verse-by-verse
    review. Prefer SV 1637 or SV 1888 for a confessional resource.
  - Versification must be checked against the 93-verse DutSVV issue in 2a.
- **Verdict:** Equal to or better than Isidore-Guild STV.xml. It is maintained,
  includes the 1637 original-spelling notes, and is simple Markdown/JSON. The
  site states the license sentence directly. Its provenance statement is weaker
  than a CC0 LICENSE file. The owner must still decide whether to take on Dutch.

### 3c. Arthur Jackson, _Annotations_ on the OT (1643-1682), EEBO-TCP. **POSSIBLE (verse-keyed Puritan annotations, commentary-shaped)**

Jackson was a Presbyterian Puritan, not Baptist. Neither our Geneva survey nor
our commentary survey listed him. The outside report did, without ids.

| Part                                                                                           | TCP id | Phase | Books               | License quote verified                                                                                                                                                                                                                                                                            |
| ---------------------------------------------------------------------------------------------- | ------ | ----- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A help for the understanding of the Holy Scripture, first part (1643)                          | A46823 | I     | Genesis–Deuteronomy | Phase I sentence, README **[verified]**                                                                                                                                                                                                                                                           |
| Annotations upon the remaining historicall part (1646)                                         | A46811 | II    | Joshua–Esther       | Phase II sentence: "To the extent possible under law, the Text Creation Partnership has waived all copyright and related or neighboring rights to this keyboarded and encoded edition of the work described above, according to the terms of the CC0 1.0 Public Domain Dedication" **[verified]** |
| Annotations upon … Iob, the Psalms, the Proverbs, Ecclesiastes, and the Song of Solomon (1658) | A46807 | I     | Job–Song            | Phase I sentence **[verified]**                                                                                                                                                                                                                                                                   |
| Annotations upon the whole book of Isaiah (1682)                                               | A46816 | II    | Isaiah              | Phase II sentence **[verified]**                                                                                                                                                                                                                                                                  |

- **Structure (A46807, verified):**
  - 4.5 MB, only 220 gaps.
  - 5 `book` divs, 93 `chapter` divs and 149 `Psalm` divs.
  - Notes are lemma-style inside the chapter paragraph: the italic lemma ("There
    was a man in the land of Vz, &c."), then an inline verse numeral, then the
    exposition.
  - Verse keying needs a Poole-style lemma/numeral parser **[unverified across
    volumes]**.
- **Fit:** Same EEBO-TCP adapter path as Poole and Diodati. It belongs in the
  commentary track. It covers Genesis–Song plus Isaiah, about half the OT.

### 3d. George Whitefield, _Works_ vols 5-6 (sermons), Project Gutenberg. **POSSIBLE (owner fit call)**

- **Lead:** The outside report proposed Whitefield via 1825 Tegg scans, which
  fail the clean-text rule. The clean source is Gutenberg.
- **Source:** https://www.gutenberg.org/ebooks/77034 (Vol. 5) and
  https://www.gutenberg.org/ebooks/77041 (Vol. 6), released Oct 2025, plain
  text/HTML. Title: "The works of the Reverend George Whitefield, M.A., Vol. 5
  (of 6): Containing all his sermons and tracts, etc." **[verified]**
- **License quote:** Each ebook page's Copyright field reads "Public domain in
  the USA." **[verified]** This is the same evidence class and the same US-only
  scope as the Edwards Gutenberg #34632 our survey rated POSSIBLE.
- **Structure:**
  - 31 "SERMON N." headings in Vol. 5 and 28 in Vol. 6.
  - Each sermon has a centred text line such as "GENESIS v. 24." followed by the
    italic verse quotation.
  - The reference is regex-parsable. **[verified on sermon II]**
- **Fit:** Whitefield was a Calvinist (Anglican priest; Calvinistic Methodist),
  not Baptist. Whether he counts as "Reformed" for this app is the owner's call.
  Evans-TCP also has about 10 single Whitefield sermon imprints from 1739-40
  (N03637ff., catalog "Free"; READMEs not checked **[unverified]**).

### 3e. Adjacent finds (not from the outside report; noted while checking it)

- **Calvin items missing from our B1 table:**
  - A17683, _The lectures or daily sermons … vpon the prophet Ionas_ (1578,
    Phase II).
  - A17725, _Two godly and learned sermons_ (1584, Phase I).
  - A17636, _Certaine homilies_ (1553, Phase II).
  - All are in TCP.csv. READMEs and structure were not checked **[unverified]**.

### Outside-report candidates rejected under the rules

| Candidate                                                                  | Reason                                                                                        |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Haak 1657 _Dutch Annotations_                                              | No clean text. The archive.org item is a scan + OCR. The claimed TCP id A43335 does not exist |
| Westminster Annotations                                                    | Not in EEBO-TCP; scans only                                                                   |
| Brown's _Self-Interpreting Bible_ (1778/1792)                              | Scans only. The Tolle Lege 2018 edition is "All Rights Reserved"                              |
| 1599 Geneva via "EEBO-TCP Tomson/Junius editions"                          | Not in TCP (Junius only, see 3a)                                                              |
| M'Cheyne _Memoir and Remains_, _Additional Remains_, _Basket of Fragments_ | Scans only. Gutenberg has only the biography                                                  |
| Boston _Whole Works_ (incl. WSC-keyed _Body of Divinity_)                  | Scans only                                                                                    |
| Ebenezer and Ralph Erskine _Works_                                         | Scans only; nothing in TCP or Gutenberg                                                       |
| Owen (Goold 1850-53), Manton (Nisbet 1870), Edwards (1808/1834)            | Scans fail. CCEL needs permission. Use the EEBO-TCP/Evans-TCP equivalents instead             |
| Rutherford Bonar collections (1877/1885)                                   | Scans only                                                                                    |
| SVmodernisatie2026                                                         | Luke only; bundles copyrighted HSV/GBS                                                        |
| Bishops' Bible                                                             | Not Reformed annotation (Parker's "no bitter notes" rule)                                     |

## Live checks performed (about 20 network calls)

- TCP.csv local catalog: Tomson, Junius, STC 2050-3000, Calvin sermons, Jackson,
  Haak, Westminster Annotations, Brown, Boston, Erskine, Whitefield, A36794,
  A43335.
- GitHub raw/API: READMEs for A16102, A46807, A46811, A46816 and A46823;
  A16102.xml and A46807.xml downloaded and parsed; A43335 returned 404; GitHub
  repo search for Geneva-notes repos found nothing licensed.
- CrossWire geneva.conf re-fetched.
- sword-devel 2026-January/050932 fetched.
- CCEL /about/copyright.html fetched.
- Open Vertaling: README, LLM.txt, achtergrond.md, markdown/index.md and one
  SV1637 book file.
- Gutenberg #77034 and #77041 ebook pages, plus the #77034 text.
- Puritan Board thread on Haak online: HTTP 403, not checked.
