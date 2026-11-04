# Survey: additional confessions, creeds, catechisms, and cheap structured additions

Scope: candidates beyond WCF/WLC/WSC/HC/BC/CD. Baptist material excluded.
Researched 2026-11-04. Items marked UNVERIFIED were not confirmed against a
fetched page.

## How the repo ingests confessions today

- `packages/dataset-tools/src/ingest/confession.ts` does no scraping. It decodes
  a hand-curated `dataset/confessions/<id>/confession.json` (schema `Confession`
  in `@reformed-bible/core`: resourceId, abbreviation, title, divisions[] ->
  articles[] with question/paragraphs/proofs[{refs: OSIS}]), writes normalized
  output, and `indexProofTexts` builds verse -> article index from OSIS proof
  refs (KJV versification).
- The "Schaff path" is therefore: download
  `https://www.ccel.org/ccel/schaff/creedsN.xml` (ThML), extract the English
  section, hand-correct against the archive.org scan, record each correction in
  `source.md`, convert any printed Scripture citations to OSIS. License evidence
  used for cd/bc/hc: CCEL ThML `DC.Rights` = "Public Domain" plus the
  archive.org scan item page "NOT_IN_COPYRIGHT".
- When the text edition lacks proofs, R15 lets a second PD edition supply them
  (hc uses the 1879 Tiffin edition via Wikisource). R16: a confession with no PD
  proofs ships browsable by outline but reports "no proof texts" on verse
  lookup.
- Any new Schaff confession fits this path IF Schaff prints it in English.
  Latin/German/French-only sections in Schaff do not fit (no English text to
  transcribe).

## Candidates

### Key finding about the CCEL Schaff files (affects every Schaff candidate)

- `creeds2.xml` and `creeds3.xml` both carry
  `<DC.Rights>Public Domain</DC.Rights>` (checked 2026-11-04).
- The CCEL ThML is NOT the 1877 first edition. Its title page reads "FOURTH
  EDITION—REVISED AND ENLARGED ... BAKER BOOK HOUSE ... Paperback edition issued
  April 1977 ... Copyright, 1877, by Harper & Brothers Copyright, 1905, 1919, by
  David S. Schaff" (vol. 3; vol. 2 reads the same copyright lines). The
  `<printSourceInfo><published>` field says "1889 (Baker reprint)". All dated
  copyrights are pre-1931, so US public domain holds, but resource.json
  `edition` strings for cd/bc/hc say "(Harper, 1877)". Material added after 1877
  (e.g. the Second Helvetic English appendix "added in the third edition", Part
  Fourth 1919 additions) must cite a later-edition scan, not archive.org
  `creedsofchriste03scha` (1877), for verification.
- ThML marks Scripture citations as
  `<scripRef passage=... parsed="|Rom|1|2|0|0">`, so inline/margin citations are
  already machine-parsed — counts below are scripRef tags.

### Schaff vol. 3 Reformed section profile (from creeds3.xml)

| Section                    | id      | English in Schaff?                                                       | scripRef count / where             |
| -------------------------- | ------- | ------------------------------------------------------------------------ | ---------------------------------- |
| Zwingli 67 Articles        | iv.ii   | No (German/Latin)                                                        | 0                                  |
| Ten Theses of Berne        | iv.iii  | No (German/Latin; English only in vol. 1 p.365 history)                  | 0                                  |
| First Helvetic             | iv.iv   | No (German/Latin)                                                        | 245, German/Latin only             |
| Second Helvetic (Latin)    | iv.v    | No                                                                       | 364 in Latin                       |
| Second Helvetic in English | v.ix    | YES (appendix, 3rd ed.)                                                  | 406 inline in English              |
| French (Gallican) 1559     | iv.vii  | YES, French/English parallel                                             | 305 in French column, 1 in English |
| Scots 1560                 | iv.ix   | Old Scots spelling + Latin parallel                                      | 365 in Scots column                |
| National Covenant 1580     | iv.x    | Yes                                                                      | 0                                  |
| Thirty-Nine Articles       | iv.xi   | Latin 1563 + English 1571 (old spelling) + American 1801 notes           | 0                                  |
| Anglican Catechism         | iv.xii  | Yes                                                                      | 0                                  |
| Lambeth Articles           | iv.xiii | Latin + English                                                          | 0                                  |
| Irish Articles 1615        | iv.xiv  | Yes (English only)                                                       | 0                                  |
| Savoy 1658                 | v.i.i   | Preface + Platform full; Confession ONLY the chapters differing from WCF | ~4                                 |

Vol. 3 does not contain Tetrapolitan, Consensus Tigurinus, Helvetic Consensus
Formula, Geneva Catechism, Craig's Catechism (vol. 1 discusses them historically
only).

### Second Helvetic Confession (1566) — STRONG

- Source: https://www.ccel.org/ccel/schaff/creeds3.xml section `v.ix` ("The
  Second Helvetic Confession in English", Appendix). Latin at `iv.v`.
- License: CCEL file `<DC.Rights>Public Domain</DC.Rights>` (quote: "Public
  Domain"). Scan verification:
  https://archive.org/details/bibliothecasymbo03scha (Harper, 1881, vol. 3,
  title page "THIRD EDITION — REVISED AND ENLARGED"); archive.org metadata
  `possible-copyright-status` = "NOT_IN_COPYRIGHT". The 1881 OCR has the
  appendix at print p. 831ff with the same opening text. The 1877 scan the repo
  uses (`creedsofchriste03scha`) does NOT contain it.
- Edition/translator: Schaff's appendix "added in the third edition. Several
  chapters are taken, with slight changes, from the old English translation in
  The Harmony of Reformed Confessions, Cambridge, 1586" (Schaff's note, quoted).
- Proofs: YES, in the same edition: 406 inline `<scripRef>` citations in the
  English text, e.g. "(Deut. iv. 2; Rev. xxii. 18, 19)".
- Structure: 30 chapters, sections numbered to match the Latin. Long (~250 KB of
  ThML).
- Fit: Exactly the Dort path (inline citations become proofs, text split into
  runs at citation clauses).
- Creeds.json copy (`second_helvetic_confession.json`) cites
  https://www.ccel.org/creeds/helvetic.htm and has modernized wording ("spoke"
  for Schaff's "spake") — provenance unclear; do not use. No proofs in its JSON.
- Verdict: STRONG. Best new Reformed confession by value/effort: one PD edition
  carries text + proofs.

### French (Gallican) Confession 1559 — STRONG

- Source: creeds3.xml section `iv.vii` (French/English parallel table, 40
  articles).
- License: CCEL "Public Domain" DC.Rights; scan check against archive.org
  creedsofchriste03scha (1877, "NOT_IN_COPYRIGHT") — section present there (TOC:
  "CONFESSIO GALLICANA ... French and English 356").
- Translator: "The English translation was kindly prepared for this work by Miss
  Emily O. Butler, of New York" (Schaff's note). Creeds.json's attribution
  "Translated by Emily O. Bulter (1692)" garbles this.
- Proofs: YES, but in the French column only (305 scripRef in French column, 1
  in English) — identical to the Belgic arrangement, so they attach
  article-level, per KTD8's Belgic precedent.
- Fit: Exactly the Belgic path.
- Verdict: STRONG.

### Scots Confession 1560 — POSSIBLE

- Source: creeds3.xml `iv.ix` (Scots original + Latin parallel), 25 chapters.
- License: CCEL "Public Domain"; 1877 scan NOT_IN_COPYRIGHT.
- Edition: Schaff: "The English and Latin texts are an exact reprint from
  (Dunlop's) Collection ... (Edinb. 1719, 1722) ... The English original is
  given in the old spelling ... The Scripture passages are from Tyndale's and
  Coverdale's Version".
- Proofs: YES, inline in the Scots column (365 scripRef), e.g. "Gen. i. 26, 27,
  28, etc.; Col. iii. 10; Eph. iv. 24".
- Concern: the text is Middle Scots spelling ("quhilk", "knawledge", "haill"),
  hard for modern readers. A modern-spelling PD edition was not verified (see
  below). Fits the Dort path mechanically.
- Verdict: POSSIBLE (readability). Strong if the owner accepts old Scots
  spelling or a PD modernized edition is found.

### Thirty-Nine Articles (1563/1571) — POSSIBLE (no proofs)

- Source: creeds3.xml `iv.xi`; Latin 1563 + English 1571 in old spelling
  ("Christe dyd truly aryse agayne"), with the American revision of 1801 in
  notes. Also Anglican Catechism `iv.xii`.
- License: CCEL "Public Domain". (Note: the 1662 BCP text is under Crown letters
  patent in the UK; Schaff's US printing avoids that question for US
  distribution — UNVERIFIED legal nuance, flag for owner.)
- Proofs: NO in Schaff (0 scripRef). No PD proof-text edition found. Would ship
  under R16 (browsable, no verse lookup).
- Verdict: POSSIBLE — but Reformed-Anglican, old spelling, no proofs.

### Irish Articles 1615 — POSSIBLE (no proofs)

- Source: creeds3.xml `iv.xiv`, English only, 104 articles. CCEL "Public
  Domain".
- Proofs: NO (0 scripRef). Historically important as a WCF source. R16 path.
- Verdict: POSSIBLE, low priority.

### Lambeth Articles 1595 — POSSIBLE (tiny, no proofs)

- Source: creeds3.xml `iv.xiii` (Latin + English, 9 articles). CCEL "Public
  Domain". Proofs: NO. R16 path; trivial effort.

### Savoy Declaration 1658 — BLOCKED via Schaff; possible via another source

- Schaff (creeds3.xml `v.i.i`): "The first and last are given in full; of the
  second [the Confession], the chapters and sections in which it differs from
  the Westminster Confession of Faith." So Schaff lacks the full confession.
- Creeds.json copy is marked "Copyright - Reformed Standards" in its README —
  unusable.
- Full text would need another PD edition (see Savoy follow-up below).

### First Helvetic (1536), Zwingli 67 Articles, Ten Theses of Berne — BLOCKED via Schaff

- Schaff vol. 3 prints only German/Latin (`iv.iv`, `iv.ii`, `iv.iii`). Ten
  Theses English is a paraphrase in vol. 1 history (p. 365).
- Creeds.json First Helvetic cites EEBO (quod.lib.umich.edu A13256, George
  Wishart's 1537? translation) — EEBO-TCP phase 1 texts are CC0, but its own
  page statement was not checked (UNVERIFIED). Early Modern English spelling. No
  proofs.

### Ecumenical creeds (Apostles', Nicene, Athanasian, Chalcedonian) — STRONG for text, NO proofs

- Source: https://www.ccel.org/ccel/schaff/creeds2.xml `iv.i.i`–`iv.i.iv`
  (Greek/Latin/English parallel). `<DC.Rights>Public Domain</DC.Rights>`. Vol. 2
  title page: "Copyright, 1877, by Harper & Brothers Copyright, 1905, 1919 by
  David S. Schaff". Scan for vol. 2 not checked (UNVERIFIED).
- English present: Athanasian ("Whosoever will be saved...", 44 numbered
  clauses), Chalcedon ("We, then, following the holy Fathers..."), Nicene ("I
  believe in one God..."), Apostles' (received form).
- Proofs: NO (Apostles' 28 scripRef are in Schaff's notes, not proofs; Nicene 1,
  Chalcedon 3, Athanasian 0). No PD proof-text edition known; Heidelberg LD 7-22
  expounds the Apostles' Creed with proofs, which the app already has.
- Fit: Tiny, one division each; R16 path. Could cross-link Apostles' Creed
  articles to HC Q23-58 (derived, not a source).
- Verdict: STRONG for cheap browsable text (tiny), but verse lookup will report
  "no proof texts".

### Creeds.json (github.com/NonlinearFruit/Creeds.json) — dataset, NOT a usable license source

- GitHub API `license`: null. README quote: "This repo as a whole is not
  licensed for reuse due to the copyright right status of several texts (listed
  below). ... These documents aside, the rest of this repo is licensed under the
  [Unlicense]". Excluded as copyrighted: Helvetic Consensus ("Translation
  Copyright 1990 - Martin Klauber"), Savoy ("Copyright - Reformed Standards").
- Per-file `SourceAttribution` "Public Domain" is an aggregator claim;
  SourceUrls point at PDFs on apostles-creed.org, onthewing.org, wikiwand,
  crcna.org — not edition pages. None of the candidate files carry proofs
  (checked SHC, First Helvetic, Scots, French, Savoy, Consensus Tigurinus,
  Helvetic Consensus, Tetrapolitan, four ecumenical creeds: 0 proofs each).
- Verdict: useful only as a structure reference/cross-check; fails the
  license-evidence rule as a source.

### Westminster Sum of Saving Knowledge (Dickson & Durham, c.1650) — POSSIBLE (source incomplete)

- Wikisource: https://en.wikisource.org/wiki/The_Sum_of_Saving_Knowledge — page
  carries `{{PD-old}}` (renders as a PD-old notice; exact rendered sentence not
  captured — UNVERIFIED quote). Page is ~10 KB of wikitext: Heads I-IV
  propositions only; the long "Practical Use of Saving Knowledge" (the
  citation-dense part) appears absent. No source edition named; not scan-backed.
- Proofs: the work itself cites Scripture inline (e.g. "Hos. xiii. 9."), so
  proofs are intrinsic.
- Other copies: monergism.com PDF/EPUB of an 1871 Edinburgh (Johnstone, Hunter)
  edition — aggregator, no license statement.
- Fit: Would need a PD scan-backed full text; structure (heads + propositions +
  warrants) fits divisions/articles.
- Verdict: POSSIBLE; needs a complete clean PD edition. Not found in Schaff.

### Westminster Directory for Public Worship (1645) — BLOCKED (no clean PD text found)

- archive.org scan https://archive.org/details/directoryfo00west (1640s London
  printing; scan only). EEBO-TCP copy (quod.lib.umich.edu/e/eebo2/A36061)
  reportedly says "permission must be granted for subsequent distribution"
  (search snippet, UNVERIFIED). Not a confession: no article/proof structure,
  and it does not hang off passages. Low fit.

### Calvin's Geneva Catechism (1541/1545) — BLOCKED for clean text (scan only)

- Beveridge translation, Calvin Translation Society, Tracts vol. 2 (Edinburgh,
  1849): https://archive.org/details/tractsre02calvuoft — metadata
  `possible-copyright-status` "NOT_IN_COPYRIGHT". Scan/OCR only.
- CCEL has no Calvin tracts volume (author page lists only commentaries,
  Institutes, sermons, prayer, relics, life). godrules.net / sabda.org (AGES)
  copies exist but carry no edition license statement.
- Proofs: UNVERIFIED (the 1541 text has few marginal citations). 373 Q&A in 55
  Sundays — would fit catechism shape.
- Verdict: BLOCKED until a clean transcription is made from the CTS scan (OCR
  cleanup = real work).
- Same CTS vol. 2 also holds the Consensus Tigurinus ("Mutual Consent ... as to
  the Sacraments") — same status.

### Heidelberg 52 Lord's Day schedule — ALREADY SHIPPED

- `dataset/confessions/hc/confession.json` divisions are titled "Lord's Day 1"
  ... "Lord's Day 52"; `packages/core/src/confessions/identifiers.ts` resolves
  "HC LD n" to its first question. A reading schedule (week n -> LD n) is pure
  derivation; no new source needed.

### M'Cheyne Bible reading calendar (1842) — STRONG

- Work: "Daily Bread" calendar by Robert Murray M'Cheyne, dated "December 1842";
  author died 1843 — PD by age.
- Best machine-readable source: SWORD daily-devotional module source,
  https://github.com/DavidHaslam/MCheyne-Daily-Bread-SWORD (`mcheyne.imp.txt`
  with OSIS `<reference osisRef="Gen.1">` per entry, 366 days incl. leap day,
  family/secret readings; `mcheyne.conf`).
  - License quotes: `mcheyne.conf`: "DistributionLicense=Public Domain". README:
    "The original calendar was published in 1842 and is **Public Domain**. This
    digital rendering for SWORD applications does not change its copyright
    status." GitHub repo license: null.
  - Module v1.4 (2025-03-06); history notes corrections ("Moved Jeremiah 45
    within August", "Five references corrected"). The module is hosted in the
    Xiphos repository per README — could not fetch the Xiphos conf (UNVERIFIED);
    not on CrossWire main (ModInfo: "No module found: MCheyne").
  - Fits the repo's CrossWire evidence style (matthew-henry uses
    "DistributionLicense=Public Domain" from a .conf).
- Alternative: speric/mcheyne-api `plan.json` (date -> family/secret arrays) —
  repo license null, no PD statement, has formatting glitches ("Acts \n4").
  Prefer the SWORD source.
- Hangs off passages: every entry is a chapter reference, so it attaches
  naturally. A 1842/1844 scan (e.g. in Bonar's Memoir and Remains) would
  strengthen evidence — UNVERIFIED which printing.
- Verdict: STRONG (tiny, OSIS-native, PD by age; evidence quote available from
  the module conf).

### Scots Confession — second source checked (CCEL standalone)

- https://www.ccel.org/ccel/anonymous/scotconf.xml — modern spelling,
  `<DC.Rights>Public Domain</DC.Rights>`, 168 scripRef proofs inline after
  clauses (e.g. "...in whom only we must put our trust: Deut. 6:4; 1 Cor. 8:6;
  Deut. 4:35; Isa. 44:5-6."). BUT `<DC.Source />` is blank and the header names
  no print edition (CCEL staff description only, dated 2012-05-01). Fails
  "specific edition" evidence: we cannot say which PD edition the modernized
  text and proofs come from. The Theology in Scotland 2010 modern version is CC
  BY-NC 4.0 (search snippet) — not usable. Dickinson 1949 — in copyright.
- Conclusion: Schaff's old-Scots text (with proofs) is clean on evidence; the
  readable CCEL modern text is unattributed.

### Savoy Declaration — follow-up

- No clean, edition-named PD full text found. reformedstandards.com and
  Creeds.json mark their copies copyrighted. apostles-creed.org EPUB is an
  aggregator copy with no edition license. 1658 printings exist on EEBO
  (facsimile/TCP; TCP phase status UNVERIFIED). Proofs: the 1658 Savoy printed
  no proof texts as far as known (UNVERIFIED).
- A WCF-diff build (WCF text + Schaff's Savoy alterations) is technically
  possible from creeds3.xml v.i.i but is a derived text, not a transcription of
  one edition — conflicts with "transcribed from one named public domain
  edition" (R14).
- Verdict: BLOCKED.

### Heidelberg Compendium ("Compendium of the Christian Religion") — BLOCKED (scan only)

- Library records only: "A compendium of the Christian religion: taken from the
  Heidelberg catechism ... for the use of the Reformed Dutch Church in
  North-America" (1789 Albany 5th ed., Evans digital edition). No clean,
  edition-named digital text found. Evans-TCP licensing UNVERIFIED. Proofs: none
  known. Verdict: BLOCKED (scan/OCR only).

### Dutch liturgical forms (Baptism, Lord's Supper, ordination, etc.) — POSSIBLE / weak evidence

- https://www.ccel.org/creeds/neth-ref-liturgy.txt (plain text; forms for
  Baptism, Public Confession, Lord's Supper, Excommunication, Ordination,
  Marriage...). No edition, translator or rights statement in the file (none
  found). sacred-texts.com/chr/nethlit.htm mirrors it (aggregator).
- Scan-backed PD edition: https://archive.org/details/psadavidwit00refo (1798
  "Psalms of David ... catechism, confession of faith, and liturgy of the
  Reformed Church in the Netherlands; for the use of the Reformed Dutch Church
  in North America") — scan only, rights field not checked (UNVERIFIED).
- Structure: prose forms with embedded Scripture quotations; no article/proof
  structure and they do not hang off passages naturally.
- Verdict: POSSIBLE only if the owner accepts non-article liturgy; evidence
  currently fails (unattributed text).

### Tetrapolitan (1530), Consensus Tigurinus (1549), Helvetic Consensus Formula (1675), Craig's Catechism (1581) — BLOCKED

- None has English text in Schaff (vol. 1 discusses them historically; vol. 3
  omits them).
- Tetrapolitan: English in apostles-creed.org PDF (aggregator, provenance
  unknown) and RHB's modern Dennison anthology (copyrighted).
- Consensus Tigurinus: Beveridge 1849 CTS Tracts vol. 2 (archive.org
  tractsre02calvuoft, NOT_IN_COPYRIGHT) — scan only.
- Helvetic Consensus: Creeds.json copy is Klauber 1990 (copyrighted). A 19th-c.
  PD English translation was not located (UNVERIFIED).
- Craig's Catechism: T. G. Law's 1883 edition exists as scans (not checked,
  UNVERIFIED); Middle Scots; no proofs known.
- None has proof texts in a free edition.

## Summary table

| Candidate                                 | Verdict       | Best source                                                     | License evidence                                                 | Proofs                                                   |
| ----------------------------------------- | ------------- | --------------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------- |
| Second Helvetic                           | STRONG        | creeds3.xml `v.ix` (+ 1881 3rd-ed. scan bibliothecasymbo03scha) | CCEL "Public Domain"; IA "NOT_IN_COPYRIGHT"                      | YES, 406 inline (Dort path)                              |
| French/Gallican                           | STRONG        | creeds3.xml `iv.vii` (Emily O. Butler tr.)                      | CCEL "Public Domain"; IA 1877 "NOT_IN_COPYRIGHT"                 | YES, French column, article-level (Belgic path)          |
| M'Cheyne calendar                         | STRONG        | github DavidHaslam/MCheyne-Daily-Bread-SWORD                    | conf "DistributionLicense=Public Domain"                         | n/a (OSIS refs per day)                                  |
| Ecumenical creeds (4)                     | STRONG (text) | creeds2.xml `iv.i.i`-`iv.i.iv`                                  | CCEL "Public Domain" (vol. 2 scan unchecked)                     | NO (R16)                                                 |
| Scots 1560                                | POSSIBLE      | creeds3.xml `iv.ix` (old Scots)                                 | CCEL "Public Domain"; IA 1877                                    | YES inline (old spelling); modern CCEL text unattributed |
| Thirty-Nine Articles                      | POSSIBLE      | creeds3.xml `iv.xi`                                             | CCEL "Public Domain"                                             | NO                                                       |
| Irish Articles                            | POSSIBLE      | creeds3.xml `iv.xiv`                                            | CCEL "Public Domain"                                             | NO                                                       |
| Lambeth Articles                          | POSSIBLE      | creeds3.xml `iv.xiii`                                           | CCEL "Public Domain"                                             | NO                                                       |
| Sum of Saving Knowledge                   | POSSIBLE      | Wikisource (partial, no edition)                                | {{PD-old}} tag                                                   | intrinsic inline, but source incomplete                  |
| Dutch liturgical forms                    | POSSIBLE/weak | ccel.org/creeds/neth-ref-liturgy.txt                            | none found                                                       | NO                                                       |
| HC 52 Lord's Days                         | SHIPPED       | hc divisions                                                    | —                                                                | —                                                        |
| Savoy                                     | BLOCKED       | Schaff has only WCF diffs                                       | copies marked copyrighted                                        | NO                                                       |
| First Helvetic / 67 Articles / Ten Theses | BLOCKED       | Schaff German/Latin only                                        | —                                                                | (German/Latin only)                                      |
| Directory for Public Worship              | BLOCKED       | scan only                                                       | —                                                                | NO                                                       |
| Geneva Catechism                          | BLOCKED       | CTS 1849 scan only                                              | IA "NOT_IN_COPYRIGHT" (scan)                                     | UNVERIFIED                                               |
| Consensus Tigurinus                       | BLOCKED       | CTS 1849 scan only                                              | IA "NOT_IN_COPYRIGHT" (scan)                                     | NO                                                       |
| Helvetic Consensus                        | BLOCKED       | Klauber 1990 only                                               | copyrighted                                                      | NO                                                       |
| Tetrapolitan                              | BLOCKED       | no PD English located                                           | none found                                                       | NO                                                       |
| Craig's Catechism                         | BLOCKED       | Law 1883 scan (UNVERIFIED)                                      | —                                                                | NO                                                       |
| Heidelberg Compendium                     | BLOCKED       | 1789 scan/Evans                                                 | UNVERIFIED                                                       | NO                                                       |
| Creeds.json                               | not a source  | github NonlinearFruit/Creeds.json                               | README: repo "not licensed for reuse" as a whole; rest Unlicense | 0 proofs in candidate files                              |

## Side finding for existing resources

cd/bc/hc/wcf `edition` strings say Schaff vol. 3 "(Harper, 1877)", but the CCEL
ThML they hash is the fourth (1919-copyright, Baker 1977 reprint) edition per
its own title page. Text checked against the 1877 scan, so content likely
matches for those sections, but the edition statement is not literally what the
file is. Worth a maintainer look.
