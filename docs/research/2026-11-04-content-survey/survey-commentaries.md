# Survey: additional verse-keyed Reformed commentaries

Date: 2026-11-04. Scope: commentaries beyond Calvin (CrossWire), Henry, JFB,
Poole, Owen Heb 6-10. Status legend: VERIFIED = fetched source page this
session; UNVERIFIED = from memory/secondary.

## Method notes (VERIFIED)

- CrossWire main/beta/attic repos (mods.d.tar.gz fetched 2026-11-04) list only
  these commentaries not yet shipped that are plausibly in scope: `lightfoot`
  (Lightfoot, Horae Hebraicae, zCom ThML, "DistributionLicense=Public Domain",
  TextSource=http://philologos.org), `burkitt` (William Burkitt, Expository
  Notes NT, zCom OSIS, "DistributionLicense=Public Domain"), `barnes` (zCom
  ThML, PD), `kd` (zCom4 OSIS, PD, TextSource Wikisource). No
  Dickson/Hutcheson/Durham/Gouge/Haldane/Hodge/Brown/Manton modules exist in any
  CrossWire repo.
- EEBO-TCP: master catalogue
  https://raw.githubusercontent.com/textcreationpartnership/Texts/master/TCP.csv.
  Its "Restricted" status column is STALE: Phase II texts were released in 2020,
  and every Phase II repo checked (e.g. A45241, A77979, A17640) is on GitHub
  with this exact README statement:
  > To the extent possible under law, the Text Creation Partnership has waived
  > all copyright and related or neighboring rights to this keyboarded and
  > encoded edition of the work described above, according to the terms of the
  > CC0 1.0 Public Domain Dedication
  > (http://creativecommons.org/publicdomain/zero/1.0/). Phase I repos carry the
  > statement already used for Owen/Poole: "This Phase I text is available for
  > reuse, according to the terms of Creative Commons 0 1.0 Universal." (note:
  > in the README it is line-wrapped; the shipped quote normalizes whitespace).
  > So for every EEBO-TCP candidate below the license evidence URL is
  > https://github.com/textcreationpartnership/<ID> and the quote is one of
  > these two sentences (Phase I vs Phase II).
- Structure probe: I downloaded each TEI file and counted divs, verse labels,
  and `<gap reason="illegible">` marks (each is one or more unreadable
  characters, usually a single letter shown as a bullet).
- The Scottish "brief exposition" series (Dickson, Hutcheson, Fergusson, Durham)
  shares one layout: CHAP div -> chapter argument -> the verse text quoted in
  `<q>`/`<epigraph>` labelled "Ver. 1." / "Vers. 1." / "Verſe 1." (often inside
  `<bibl>` or `<hi>`) -> exposition paragraphs. Alignment = regex on that label,
  same approach as the Owen adapter. Hutcheson John/Job even wrap each verse
  unit in `<div type="verse">`.

## EEBO-TCP candidates (all VERIFIED: repo exists, README carries CC0 statement, TEI downloaded and probed)

Metrics: words in body; illeg = `<gap reason="illegible">` count (rate per 100
words); nonLatin = Greek/Hebrew gaps; labels = "Ver./Vers./Verse N" labels found
in bibl/hi/head. Baselines for shipped works: Owen A53678 = 0.00 illeg/100w
(3,192 Greek gaps); Poole A55363 = 0.67/100w. "Phase I" quote = "This Phase I
text is available for reuse, according to the terms of Creative Commons 0 1.0
Universal." "Phase II" quote = the CC0 waiver sentence above. Phase II texts
keep long-s (ſ) and need ſ->s normalization; Phase I texts checked are already
normalized except where noted. Adapter for all: existing EEBO-TCP TEI adapter,
with a per-work verse-label pattern.

| Work                                                                                                                      | TCP ID (phase) | Coverage                                                                       | Words | Illeg /100w                    | Verse alignment                                                                                                                                                                             | Verdict                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------ | ----- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| David Dickson, Brief explication of the first fifty Psalms (1655)                                                         | A35941 (I)     | Ps 1-50                                                                        | 129k  | 0.18                           | verse text in `<q>` with `<hi>Ver. 1.</hi>`, numbered `<p n=2>` for following verses, exposition after; 277 labels                                                                          | STRONG                                                                                                                             |
| Dickson, ...other fifty Psalmes, 51-100 (1653)                                                                            | A35945 (I)     | Ps 51-100                                                                      | 167k  | 1.31 (poor)                    | `section` divs, only 35 labels; needs closer look                                                                                                                                           | POSSIBLE (legibility)                                                                                                              |
| Dickson, ...last fifty Psalmes, 101-150 (1654)                                                                            | A35943 (I)     | Ps 101-150                                                                     | 144k  | 0.32                           | 457 labels                                                                                                                                                                                  | STRONG                                                                                                                             |
| Dickson, Brief exposition of Matthew (1651)                                                                               | A35949 (I)     | Matt 1-28                                                                      | 156k  | 0.38                           | `<epigraph><q>Vers. 1. ...` 598 labels                                                                                                                                                      | STRONG                                                                                                                             |
| Dickson, Exposition of all St Paul's epistles + James, Peter, John, Jude (1659; English of his Latin Expositio analytica) | A35951 (I)     | Rom-Jude (no Heb? his Hebrews was separate; UNVERIFIED which books inside)     | 406k  | 0.14                           | `<q><hi>Vers. 1.</hi>`, 2,625 labels                                                                                                                                                        | STRONG (analytic, terse)                                                                                                           |
| George Hutcheson, Exposition of John (1657)                                                                               | A45241 (II)    | John 1-21                                                                      | 474k  | 0.17                           | each unit is `<div type="verse">` with `<bibl>Verſe 1.</bibl>`; 549 labels                                                                                                                  | STRONG                                                                                                                             |
| Hutcheson, Exposition of Job (1669)                                                                                       | A45240 (II)    | Job 1-42                                                                       | 695k  | 0.24                           | `div type=verse/verses`, 599 labels                                                                                                                                                         | STRONG                                                                                                                             |
| Hutcheson, Hosea, Joel, Amos (1654)                                                                                       | A86936 (II)    | Hos, Joel, Amos                                                                | 219k  | 0.06                           | 305 labels                                                                                                                                                                                  | STRONG                                                                                                                             |
| Hutcheson, Obadiah-Zephaniah (1654)                                                                                       | A86934 (II)    | Obad-Zeph                                                                      | 139k  | 0.10                           | `<q><bibl><hi>Verſ. 1.</hi>`, 260 labels                                                                                                                                                    | STRONG                                                                                                                             |
| Hutcheson, Haggai, Zechariah, Malachi (1654)                                                                              | A86932 (II)    | Hag-Mal                                                                        | 120k  | 0.13                           | 200 labels                                                                                                                                                                                  | STRONG                                                                                                                             |
| James Fergusson, Galatians & Ephesians (1659)                                                                             | A41197 (I)     | Gal, Eph                                                                       | 293k  | 0.03                           | `<div type="verse_and_explication"><head><hi>Vers.</hi> 1. ...` (254 units)                                                                                                                 | STRONG                                                                                                                             |
| Fergusson, Philippians & Colossians (1656)                                                                                | A41199 (I)     | Phil, Col                                                                      | 94k   | 0.11                           | `verse_and_commentary` divs (162)                                                                                                                                                           | STRONG                                                                                                                             |
| Fergusson, 1-2 Thessalonians (1674)                                                                                       | A41200 (I)     | 1-2 Thess                                                                      | 127k  | 0.15                           | only chapter divs, 0 labels found: inline verse markers, needs a closer look                                                                                                                | POSSIBLE                                                                                                                           |
| James Durham, Commentarie upon Revelation (1658)                                                                          | A37035 (I)     | Rev 1-22                                                                       | 684k  | 0.20                           | 94 lectures; each opens with the passage quoted `<epigraph><q><bibl>Vers. 1.</bibl>...<bibl>2.</bibl>` then lecture plus long digressions; aligns at passage (lecture) level, not per verse | STRONG-POSSIBLE (passage-level; digressions are essays)                                                                            |
| Durham, Clavis Cantici, Song of Solomon (1668)                                                                            | A37032 (I)     | Song 1-8                                                                       | 192k  | 0.15                           | `<div type="verse"><epigraph><bibl>Vers. 1.</bibl>`; 118 labels                                                                                                                             | STRONG                                                                                                                             |
| William Gouge, Commentary on the whole Epistle to the Hebrews (1655)                                                      | A41670 (I)     | Heb 1-13                                                                       | 1.15M | 1.26 (poor) + 5,432 Greek gaps | 1,992 numbered § sections; 295 "Vers./Verse N" labels (Hebrews has 303 verses)                                                                                                              | POSSIBLE (big, legibility weakest of the set)                                                                                      |
| Thomas Manton, Practical commentary on Jude (1657)                                                                        | A89503 (I)     | Jude                                                                           | 235k  | 0.47; long-s kept              | `div type=verse` (24) with "Verſe N." labels                                                                                                                                                | STRONG (single book, cheap)                                                                                                        |
| Robert Leighton, Practical commentary on 1 Peter, vol 1 ch 1-2 (1693)                                                     | A47642 (I)     | 1 Pet 1-2                                                                      | 145k  | 0.18                           | `<head>Verse. 3, 4.</head>` in `div type=verse`                                                                                                                                             | STRONG                                                                                                                             |
| Leighton, vol 2 ch 3-5 (1694)                                                                                             | A47643 (I)     | 1 Pet 3-5                                                                      | 160k  | 0.39                           | 43 verse divs                                                                                                                                                                               | STRONG                                                                                                                             |
| William Perkins, Commentarie upon Galatians 1-5 (1604)                                                                    | A09383 (I)     | Gal 1-5 (ch 6 by Ralph Cudworth, in same volume)                               | 298k  | 0.17                           | verse text in `<q>` with bare leading numbers ("1 Then 14. yeares after..."); only 4 labels                                                                                                 | POSSIBLE (numbers-only pattern; 1604 spelling u/v, ē abbreviations)                                                                |
| Perkins, Cloud of faithful witnesses, Hebrews 11 (1607)                                                                   | A09376 (I)     | Heb 11                                                                         | 209k  | 0.09                           | divided by person (Abel, Enoch...), 3 labels                                                                                                                                                | POSSIBLE (map headings to verses by hand)                                                                                          |
| Perkins, Exposition of Christ's Sermon in the Mount (1608)                                                                | A09432 (I)     | Matt 5-7                                                                       | 291k  | 0.61                           | `div type=verse` + `<bibl>Vers. 1.</bibl>` (85 units)                                                                                                                                       | STRONG-POSSIBLE (1608 spelling)                                                                                                    |
| Jeremiah Burroughs, Hosea 1-3 (1652)                                                                                      | A30572 (I)     | Hos 1-3                                                                        | 325k  | 0.25; long-s                   | 29 lecture divs, 3 labels; lecture-level                                                                                                                                                    | POSSIBLE                                                                                                                           |
| Burroughs (cont.), Hosea 4-7 (1650)                                                                                       | A77979 (II)    | Hos 4-7                                                                        | 249k  | 0.47                           | 61 verse divs                                                                                                                                                                               | STRONG                                                                                                                             |
| Burroughs (cont.), Hosea 8-10 (1650; T. Goodwin & W. Greenhill eds)                                                       | A30574 (I)     | Hos 8-10                                                                       | 181k  | 0.10                           | `<div type=verse><head>VERS. 1.</head>` (45)                                                                                                                                                | STRONG                                                                                                                             |
| Burroughs/Reynolds/Sibbes cont., Hosea 11-13 (1651)                                                                       | A30575 (I)     | Hos 11-13                                                                      | 187k  | 0.16                           | 37 verse divs                                                                                                                                                                               | STRONG (note: ch 11-13 partly by Thomas Hall/Reynolds per later editions — UNVERIFIED)                                             |
| Calvin, Commentary upon Isaiah, tr. Clement Cotton from French (1609)                                                     | A17640 (II)    | Isa 1-66 incl. 49-66                                                           | 699k  | 0.13; long-s                   | `<div type="verse"><epigraph><q><bibl>Verſ. 1.</bibl>`: 1,131 verse divs                                                                                                                    | STRONG as gap-filler for Isa 49-66 (but a different, older, French-based translation than CTS; and possibly abridged — UNVERIFIED) |
| John Lightfoot, Commentary upon the Acts, chronicall and criticall (1645)                                                 | A48432 (I)     | Acts 1-12 only (UNVERIFIED end point)                                          | 107k  | 0.24 + 235 Greek/Hebrew gaps   | `<div type="verse"><head>Vers. 1. ...` (116)                                                                                                                                                | POSSIBLE (philological/chronological, not doctrinal)                                                                               |
| Giovanni Diodati, Pious annotations upon the Holy Bible (1643)                                                            | A36033 (I)     | whole Bible, 66 books (Isa shows 65 chapter divs, Ps 149: small gaps to check) | 793k  | 0.73                           | Poole-like lemma notes: "V. 4. Amasa] ..." under chapter divs; 1,027 chapter divs                                                                                                           | STRONG-POSSIBLE (whole Bible: ~1,189 files; reuse Poole lemma logic)                                                               |
| Edward Leigh, Annotations upon all the New Testament (1650)                                                               | A50050 (I)     | Matt-Rev                                                                       | 349k  | 0.19 + 1,777 Greek gaps        | chapter divs only (258), lemma notes inline; UNVERIFIED pattern                                                                                                                             | POSSIBLE (philological; Leigh sat in the Westminster Assembly as a lay member)                                                     |
| Henry Ainsworth, Annotations on Pentateuch, Psalms, Song (1627)                                                           | A11649 (I)     | Gen-Deut, Ps, Song                                                             | 1.24M | 0.62                           | chapter/psalm divs + annotations divs; lemma style UNVERIFIED                                                                                                                               | POSSIBLE but EXCLUDE-REVIEW: Ainsworth was a Separatist (Brownist), not Baptist; Hebraist, doctrinally Reformed. Owner call        |
| John Trapp, Commentary on the four Evangelists and Acts (1647)                                                            | A63067 (I)     | Matt-Acts                                                                      | 353k  | 3.79 (very poor)               | 1,916 verse divs                                                                                                                                                                            | BLOCKED-ish: legibility worst in survey                                                                                            |
| Trapp, Commentary on all the Epistles and Revelation (1647)                                                               | A63065 (II)    | Rom-Rev                                                                        | 304k  | 0.84                           | chapter divs, 5 labels                                                                                                                                                                      | POSSIBLE                                                                                                                           |
| Richard Sibbes, Commentary on 2 Corinthians 1 (1655, ed. Manton & Ashe)                                                   | A60194 (I)     | 2 Cor 1                                                                        | 365k  | 0.04                           | `commentary_on_verse` divs (21)                                                                                                                                                             | STRONG (single chapter; sermonic)                                                                                                  |
| Owen, Exercitations on Hebrews (1668)                                                                                     | A53696 (I)     | prolegomena only                                                               | -     | -                              | not verse commentary                                                                                                                                                                        | SKIP                                                                                                                               |

Not in EEBO-TCP (searched TCP.csv by author and title, VERIFIED absent): Owen's
Hebrews vols on ch 1-2 (1674), 3-5 (1680) and 11-13 (1684); Manton on James
(1651), Isaiah 53, John 17; Thomas Goodwin on Ephesians (only a 40-page 1655
tract on Eph 1:21-22, A85442); Westminster Assembly "Annotations upon all the
books of the Old and New Testament" (1645/1651/1657) absent; Beza Latin
annotations and Tomson NT (Tomson's notes = Geneva 1599 NT notes, already
covered by the other survey); Hutcheson's Minor Prophets are present (above).
Also present but not reviewed in depth: Joseph Caryl Job (12 vols, mostly Phase
II), William Greenhill Ezekiel (5 vols, Phase II), William Jenkyn Jude
(A87554/A87557, Phase II), Nicholas Byfield Colossians (A17389) and 1 Peter 1-3
(A17385), John Cotton Canticles (A34663)/1 John (A34689)/Ecclesiastes (A34666),
Robert Rollock Thessalonians/Colossians/John 17, William Ames 1-2 Peter
(A25280), Arthur Hildersham John 4 & Ps 51 lectures, David Pareus Revelation
(A55917), Marlorat Gospels, Calvin English 16th-c translations (Acts A17642,
Romans A17643, Hebrews A17650, Joshua A17638, Harmony A16078 etc.; redundant
with CrossWire Calvin).

Resolved after deeper probe (VERIFIED): Dickson A35951 covers all 21 epistles
Romans-Jude INCLUDING Hebrews ("The Epistle of Paul to the HEBREWS,
Analytically..."). Lightfoot A48432 covers Acts 1-11 only (chapter heads end at
"Acts XI."). Fergusson 1-2 Thess A41200 has no verse labels in markup:
exposition cites "ver. 1." inline after a chapter analysis, so alignment needs
text parsing (POSSIBLE). Gouge A41670 sections are topical ("§. 24. Of Christs
upholding all things."), with "§. 37. Of the heads of Doctrines raised out of
the first Verse" style sections; per-verse alignment needs mapping of section
titles plus the 295 inline "Vers. N." labels (POSSIBLE, laborious).

## Non-TCP sources (CCEL, CrossWire, Gutenberg, Wikisource, Internet Archive)

CCEL check method (VERIFIED): fetched each work's ThML at
https://ccel.org/ccel/<author>/<work>.xml and read `<DC.Rights>` in the ThML
head. CCEL's HTML info pages no longer show a rights line, so the ThML header is
the only edition-level statement.

- **Calvin, Commentary on Isaiah vol. 4 (Isa 49-66), Calvin Translation Society
  (Pringle)** — https://ccel.org/ccel/calvin/calcom16.xml. Quote:
  `<DC.Rights>Public Domain</DC.Rights>` (exact text "Public Domain"). ThML has
  326
  `<scripCom type="Commentary" passage="Isa 49:1" ... osisRef="Bible:Isa.49.1"/>`
  markers: clean verse alignment. Status line: "Preliminary released version has
  been proofread and is pretty clean." Same translation as the shipped CrossWire
  Calvin, so it fills the Isa 49-66 hole seamlessly. Needs a new ThML adapter
  (small: split on scripCom osisRef). 18 chapters, cheap. VERDICT: STRONG (needs
  ThML adapter). Fallback with existing adapter: EEBO-TCP A17640 (1609 Cotton
  translation from French, full Isaiah, verse divs) — different translation,
  archaic, so only if the ThML adapter is not built.
- **Charles Hodge, Ephesians** — https://ccel.org/ccel/hodge/ephesians.xml:
  `<DC.Rights />` (empty) and no "public domain" anywhere in the head. STILL
  BLOCKED. CCEL Hodge author page lists only Ephesians among commentaries (plus
  Systematic Theology, Darwinism); no Romans/1-2 Corinthians on CCEL (404).
  Gutenberg has only "What is Darwinism?" (#19192). Wikisource: none. Internet
  Archive: scans only (e.g. commentaryepist00hodg Romans 1871,
  anexpositionfir00hodggoog 1 Cor 1857, anexpositionsec00hodggoog 2 Cor 1862),
  metadata "possible-copyright-status: NOT_IN_COPYRIGHT" but text is OCR.
  BLOCKED (no clean text with a declared license).
- **Robert Haldane, Romans** — not on CCEL (404), Gutenberg, Wikisource or
  CrossWire. Internet Archive scans only (expositionofthee00halduoft 1874;
  expositionofepis03hald 1838). BLOCKED (scan only).
- **John Brown of Edinburgh, Galatians / Hebrews / 1 Peter** — not on CCEL,
  Gutenberg, Wikisource, CrossWire. IA scans only (anexpositionepi00browgoog
  Galatians 1853; expositorydisco01browgoog 1 Peter 1848). BLOCKED (scan only).
- **Thomas Manton, James / Isaiah 53 / John 17 (Nichol/Nisbet 1871 Works)** —
  CCEL has manton01-08 and manton20 (vol III = Isaiah 53 exposition + 2 Thess 2
  sermons; vol IV = James; vol V = Jude). Every one checked has `<DC.Rights />`
  empty; comments "Page images provided by Web Archive". BLOCKED on CCEL (blank
  rights). Manton James and Isaiah 53 are not in EEBO-TCP (James 1651 edition
  absent from TCP.csv). Jude IS available clean via EEBO-TCP A89503 (above).
  John 17 (45 sermons) is sermons — out of scope anyway.
- **Owen on Hebrews, other volumes (1674 ch 1-2, 1680 ch 3-5, 1684 ch 11-13)** —
  not in EEBO-TCP (only A53678 ch 6-10 and A53696 Exercitations), not on CCEL
  author page, not on Gutenberg. IA has Goold/Johnstone-Hunter scans only.
  BLOCKED (scan only). VERIFIED absence in TCP.csv; CCEL absence based on author
  page listing.
- **Jonathan Edwards, Notes on Scripture** — CCEL works2 ("XIII. NOTES ON THE
  BIBLE", Hickman edition) has `<DC.Rights />` empty. Yale WJE Online edition
  (vol. 15) is a modern critical edition, copyrighted (UNVERIFIED license page).
  Not in ECCO/Evans TCP as a commentary. BLOCKED. Also: miscellaneous notes,
  thin verse coverage.
- **Thomas Goodwin on Ephesians (Exposition of Eph 1 - 2:10)** — not in TCP
  (only a 40-page 1655 tract A85442 on Eph 1:21-22), CCEL "goodwin" is a
  different Goodwin (Greek grammar). Nichol edition scans on IA only. BLOCKED
  (scan only).
- **Westminster Assembly Annotations (1645/1651/1657)** — absent from EEBO-TCP
  catalogue (title search "annotations upon all the books" finds only Hammond
  and Leigh). BLOCKED (scan only, UNVERIFIED beyond TCP).
- **Theodore Beza NT annotations** — Latin Annotationes: no TCP text; only page
  scans (e-rara, Google Books; UNVERIFIED). English: the Tomson NT notes are the
  1599 Geneva notes (covered by the other survey). BLOCKED.
- **Albert Barnes** (OWNER APPROVAL NEEDED; New School Presbyterian) — CrossWire
  `barnes` module, zCom ThML, conf line "DistributionLicense=Public Domain"; NT
  only; existing zCom adapter fits (ThML-flavoured content inside zCom, check
  whether the zCom adapter handles SourceType=ThML — the shipped JFB/Calvin are
  OSIS? UNVERIFIED). CCEL ThML also declares
  `<DC.Rights>Public Domain</DC.Rights>` for barnes/ntnotes, romans, isaiah1 (OT
  volumes Job, Psalms, Isaiah, Daniel exist on CCEL only). NT = 260 chapter
  files. VERDICT: POSSIBLE pending owner approval.
- **Keil & Delitzsch** (OWNER APPROVAL NEEDED; German Lutheran) — CrossWire
  `kd`, zCom4 OSIS, "DistributionLicense=Public Domain",
  TextSource=https://en.wikisource.org/wiki/Biblical_commentary_the_Old_Testament.
  Whole OT = 929 chapter files. Existing zCom4 adapter fits. VERDICT: POSSIBLE
  pending owner approval; costly on file budget.
- **William Burkitt, Expository Notes with Practical Observations on the NT
  (1700/1703)** — CrossWire `burkitt`, zCom OSIS, "DistributionLicense=Public
  Domain", no TextSource line. Burkitt was a conforming Anglican with
  Puritan/evangelical, broadly Calvinistic sympathies (owner call on fit). NT =
  260 files; existing zCom adapter fits directly. VERDICT: POSSIBLE (fit
  judgment; source provenance thin: conf names no TextSource).
- **John Lightfoot, Horae Hebraicae et Talmudicae (Matt-1 Cor)** — CrossWire
  `lightfoot`, zCom ThML, "DistributionLicense=Public Domain",
  TextSource=http://philologos.org; CCEL lightfoot/talmud ThML
  `<DC.Rights>Public Domain</DC.Rights>` but print basis "Hendrickson
  Publishers, Inc." (a 1989 reprint; CCEL div1 shows Matthew, Mark, Luke, John +
  chorographical sections only). Content is Jewish-background notes by a
  Westminster divine, not doctrinal exposition. VERDICT: POSSIBLE (low priority;
  Hendrickson basis worth a provenance check).
- Gutenberg (pg_catalog.csv searched by author): nothing for Hodge commentaries,
  Haldane, Brown, Manton, Dickson, Hutcheson, Durham, Gouge, Owen, Leighton,
  Diodati, Beza. Only Barnes Revelation (#55228).
- Wikisource search: nothing for Hodge, Haldane, Brown, Leighton, Manton,
  Diodati; has Keil-Delitzsch (source of the CrossWire kd module).

## Adapter notes (VERIFIED against packages/dataset-tools/src/ingest)

- Shipped CrossWire modules (mhc, jfb, calvincommentaries) are all
  `SourceType=OSIS`; no ingest file mentions ThML. So `burkitt` and `kd` (OSIS)
  fit crosswire-zcom.ts + osis-text.ts as-is, but `barnes` and `lightfoot`
  (SourceType=ThML inside zCom) need a ThML content parser. A CCEL ThML adapter
  (Calvin Isa 49-66) would need the same parser, so building one ThML parser
  unlocks all three.
- EEBO-TCP: tei-commentary.ts is shared, with per-work owen.ts / poole.ts. The
  Scottish 1650s "brief exposition" series (Dickson Psalms/Matthew/Epistles,
  Hutcheson John/Job/Minor Prophets, Fergusson, Durham Song) share one shape
  (verse text quoted in `<q>`/`<epigraph>` with a "Ver./Vers./Verſ. N." label in
  `<bibl>`/`<hi>`/`<head>`, then exposition), so one adapter config could cover
  ~12 volumes. Diodati is lemma-style like Poole ("V. 4. Amasa] ..."), so
  poole.ts logic is the starting point.
- Bonus find: Sibbes, "The returning backslider, or, A commentarie upon the
  whole XIIII. chapter of ... Hosea" (A12190, Phase II, listed in TCP.csv but
  not probed) completes Burroughs's Hosea 1-13, giving all of Hosea.

## Top ten, ranked by value to a Reformed reader x ease of ingest

| #   | Work                                                                      | Source                                        | Files | Why                                                                                                       |
| --- | ------------------------------------------------------------------------- | --------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------- |
| 1   | Calvin, Isaiah 49-66 (CTS)                                                | CCEL calcom16 ThML, DC.Rights "Public Domain" | 18    | fills the only gap in shipped Calvin; scripCom osisRef markers; ThML parser also unlocks Barnes/Lightfoot |
| 2   | Dickson, Exposition of all the Epistles, Romans-Jude incl. Hebrews (1659) | EEBO-TCP A35951 (Phase I)                     | ~121  | 21 books in one clean file (0.14 illeg/100w), 2,625 verse labels                                          |
| 3   | Hutcheson, John (1657)                                                    | A45241 (Phase II)                             | 21    | verse-level `<div type="verse">`, low gaps, classic Scottish exposition                                   |
| 4   | Dickson, Psalms 1-50 + 101-150 (and 51-100 with caveat)                   | A35941, A35943, A35945                        | 150   | Psalms coverage beyond Calvin/Henry; vol 51-100 is the weakest (1.31 illeg/100w)                          |
| 5   | Leighton, 1 Peter (1693-94)                                               | A47642, A47643 (Phase I)                      | 5     | much-loved devotional commentary; `<head>Verse. 3, 4.</head>`                                             |
| 6   | Durham, Revelation (1658)                                                 | A37035 (Phase I)                              | 22    | standard Reformed Revelation; passage-level alignment                                                     |
| 7   | Hutcheson, Minor Prophets (3 vols, 1654)                                  | A86936, A86934, A86932 (Phase II)             | 67    | lowest gap rates in survey (0.06-0.13), all 12 books                                                      |
| 8   | Dickson, Matthew (1651)                                                   | A35949 (Phase I)                              | 28    | 598 verse labels; pairs with Hutcheson John                                                               |
| 9   | Fergusson, Galatians-Ephesians + Philippians-Colossians                   | A41197, A41199 (Phase I)                      | 20    | verse-unit divs, 0.03-0.11 illeg/100w (Thess vol needs extra parsing)                                     |
| 10  | Burroughs, Hosea 1-13 (+ Sibbes Hos 14)                                   | A30572, A77979, A30574, A30575 (+A12190)      | 14    | full Puritan Hosea; mixed lecture/verse layout                                                            |

Next tier: Durham Song of Songs (A37032, 8 files), Hutcheson Job (A45240, 42),
Manton Jude (A89503, 1), Perkins Sermon on the Mount (A09432, 3), Diodati whole
Bible (A36033, ~1,189 files: high value, but the budget cost needs an owner
call), Gouge Hebrews (A41670, big and gap-heavy), Burkitt NT (CrossWire, fit
call), Barnes/K&D (owner approval).
