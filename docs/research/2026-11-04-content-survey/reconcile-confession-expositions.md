# Reconciliation: confession and catechism expositions

Date: 2026-11-04. Inputs:

- **Ours:** `survey-confession-commentaries.md` (same folder).
- **Outside:** the "Architectural Blueprint for Open-Source Reformed Biblical
  Informatics" report (attachment `135720de-...-md.md`, 517 KB, but about 457 KB
  of that is an embedded base64 PNG on line 273; the prose is about 60 KB). I
  treated its contents only as data to check.

Project rules applied: license evidence quoted exactly from the specific
edition's own page; clean digital text, not scans; nothing Baptist; every item
keyed to a confession article/question or a passage. Earlier repo decisions
taken as given:
`docs/plans/2026-11-03-0042-feat-reformed-bible-study-app-plan.md` records
Monergism editions as "May not be put into another website, database or AI
system" and Creeds.json as "Not licensed for reuse as a whole".

Legend: **[verified]** = checked today against the live page or file.
**[unverified]** = inferred.

## How much of the outside report covers this topic

Not much. The outside report is a wide survey (datasets, competitors, roadmap).
Confession expositions come up in four places: the Creeds.json row of its
dataset matrix, the Creeds.json paragraph (line 63-66), one row of its "Public
Domain Resources" table, and section "3. Classic Expositions Hung Directly Off
the Confession & Catechism Nodes" (line 147-149). Its one concrete claim of a
clean licensed source is **NonlinearFruit/Creeds.json** for Fisher & Erskine,
Flavel and Matthew Henry's Scripture Catechism ("Unlicense / Public Domain",
"Ready-to-ingest JSON keyed by Catechism Q&A"). Ursinus, Watson, A. A. Hodge and
Shaw are named as desirable, without a source; the outside report itself tags
them "[Unverified on live page]" (Ursinus's citation is note 57, a Books At a
Glance blog post about Logos).

The outside report says **nothing** about the Larger Catechism, the Belgic
Confession, or the Canons of Dort as subjects of exposition (grep: "Belgic" 0
hits, "Larger Catechism" 0 hits in prose; "Dort" appears only for the
Statenvertaling notes). It names none of Vincent, Dickson, Ridgley, John Brown
of Haddington, Bastingius, Williard, the Collegiat Suffrage or any EEBO-TCP
exposition; its only EEBO-TCP mention is Ussher's Annals (A64619) plus a general
"Puritan corpus" row.

## 1. Agreements

- **Flavel's Exposition of the Assemblies Catechism** is a top WSC candidate.
  (Both reports. We differ on source: see 2.2.)
- **Fisher & Erskine** and **Matthew Henry's Scripture Catechism** are
  high-value WSC expositions with excellent per-question mapping. (Both. We
  differ on whether they are licensable: see 2.1, 2.3.)
- **Ursinus on the Heidelberg, A. A. Hodge and Shaw on the WCF, Watson's Body of
  Divinity** are the works a Reformed reader expects. Neither report produces a
  clean, licensed source for the Williard Ursinus, Hodge or Shaw. The outside
  report flags all of them "[Unverified on live page]"; ours marks them BLOCKED.
- **EEBO-TCP** human-keyed TEI on GitHub is the way to get clean 17th-century
  Reformed text under CC0 (outside report, "Monergism, CCEL, and PRDL" paragraph
  and the Puritan-corpus row; ours, "Key discovery").
- **Monergism ebooks are formatted for readers, not structured ingestion**, and
  **PRDL links only to scans** (outside report). Consistent with our findings.
- **CCEL**: its copyright page restricts republication unless the edition is
  public domain; both reports treat CCEL's markup claim as separate from the
  text's status.
- **Modern Dutch/Dort/Belgic works** (Hoeksema etc.) are in copyright: ours says
  so; the outside report does not dispute it (does not mention them).

## 2. Conflicts

### 2.0 Which of our six BLOCKED works does the outside report claim a clean licensed source for?

| Our BLOCKED work                              | Outside report's claim                                                  | Live check       | Who is right                                                       |
| --------------------------------------------- | ----------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------ |
| Ursinus, Commentary (Williard tr.)            | Named as desirable; cites a Logos blog (note 57); no source, no license | nothing to check | **Ours** (BLOCKED; use EEBO-TCP A64611 Parry/Ursinus 1645 instead) |
| A. A. Hodge, Commentary on the Confession     | Named, tagged "[Unverified on live page]"; no source                    | nothing to check | **Ours**                                                           |
| Shaw, Exposition of the Confession            | Named, tagged "[Unverified on live page]"; no source                    | nothing to check | **Ours**                                                           |
| Fisher & Erskine, Shorter Catechism Explained | **Claims a clean source: Creeds.json, "Unlicense / Public Domain"**     | checked (2.1)    | **Ours**: the text is the Monergism edition, re-hosted             |
| John Brown of Haddington                      | Not mentioned                                                           | -                | Ours stands                                                        |
| Ridgley, Body of Divinity (WLC)               | Not mentioned                                                           | -                | Ours stands                                                        |

So the only real conflict on the blocked list is Fisher, plus two related
Creeds.json claims (Flavel, Henry) that touch works ours rates differently.

### 2.1 Fisher & Erskine in Creeds.json: outside report wrong; stays BLOCKED **[verified]**

Outside claim (dataset matrix and table row): "Fisher's _Shorter Catechism
Explained_ (1765) ... NonlinearFruit/Creeds.json ... **Unlicense** / **Public
Domain** ... Ready-to-ingest JSON keyed by Catechism Q&A and proof-text
references."

What is true:

- The file exists: `creeds/shorter_catechism_explained.json` (1.30 MB, 107 WSC
  questions, 3,831 sub-answers), added 2024-09-27 in commit deda93c "Add Shorter
  Catechism Explained by James Fisher (#6)" (author James Chen-Smith). The
  README does not list it among the eight restricted files, so the repo's
  general grant covers it: "These documents aside, the rest of this repo is
  licensed under the [Unlicense]". The outside report quoted the README
  correctly.
- The file's own metadata:
  `"SourceUrl": "https://archive.org/details/assemblysshorte00erskgoog/mode/2up"`,
  `"SourceAttribution": "Public Domain"`. That URL is a Google Books scan;
  Creeds.json is an aggregator restating "Public Domain" for the work, not for
  the edition its text came from.

Why it fails: **the text was taken from Monergism's edited DOCX, not keyed from
that scan.**

- I downloaded Monergism's `Fisher's Catechism.docx` (the same file our survey
  found) and compared it against the Creeds.json file. After normalizing curly
  quotes and em-dashes, 3,549 of 3,831 sub-answers (92.6%) occur verbatim in the
  Monergism text. Both use Monergism's modern reference style ("1 Chron. 16:28,
  29 — ..."). Most of the misses are small typos in Creeds.json ("The: are
  connected" for "They are connected").
- Fingerprint: stray footnote numbers left in the Creeds.json answers match the
  Monergism DOCX's Word footnote ids exactly:
  - "trysting-places2" ↔ Monergism footnote 2, "An agreement, as between lovers,
    to meet at a certain time and place."
  - "futurition,14" ↔ footnote 14, "futurition n. The state of being to come or
    exist hereafter. [_ed WD]"
  - "pactional21" ↔ footnote 21, "By compact or agreement."
  - "opprobrious25" ↔ footnote 25, "op•pro•bri•ous adj. 1. Reproachful and
    contemptuous ... [_ed WD]"

  Footnotes 14 and 25 are Monergism's own editorial dictionary notes (marked
  "[_ed WD]"), so the numbering belongs to that edition.

- Monergism's live terms page
  (https://www.monergism.com/monergism-copyright-permissions, read today through
  Exa; a direct fetch hit a Cloudflare 403): "These eBooks and digital editions
  have been carefully edited, modernized, proofread, formatted, organized, and
  maintained over many years. In order to preserve the integrity and ongoing
  maintenance of these curated editions, we simply ask that the files themselves
  not be reposted or redistributed on other websites, apps, repositories,
  file-hosting services, AI datasets, machine-learning corpora, or similar
  external platforms." This matches the repo plan's existing row for Monergism
  ("May not be put into another website, database or AI system").

Verdict: the Creeds.json Fisher is the Monergism edition with a "Public Domain"
label added. It has no edition-level license, and Monergism asks that its files
not be redistributed. A repository's Unlicense cannot grant rights in text it
did not create. **Ours is right: BLOCKED.** New unblock route: get written
permission from Monergism, as plan line 180 already allows ("ships only with
written permission recorded beside it").

### 2.2 Flavel: same work, different source; we prefer EEBO-TCP A39662 **[verified]**

Outside claim: Flavel's Exposition (1688) is "Unlicense / Public Domain" in
Creeds.json.

- `creeds/exposition_of_the_assemblies_catechism.json` (578 KB, 125 items: 107
  numbered questions plus "?" placeholder rows), added 2024-09-20 (commit
  e05e819, #2). Metadata:
  `"SourceUrl": "https://archive.org/details/anexpositionass00flavgoog"`,
  `"SourceAttribution": "Public Domain"`.
- The text is **a modernized edition, not the scan it cites.** Counts across the
  file: "thou" 0, "thy" 0, "hath" 0, "you" 882, "your" 423. Its first sub-answer
  quotes Ps 8:6 as "You made him to have dominion over the works of your hands".
  EEBO-TCP A39662 (1692), for the same sentence: "Seeing a Chief supposeth an
  inferior End ... and let them have domonion over the Fish of the Sea ... every
  creeping thing that creepeth upon the Earth." A Google scan of an old printing
  cannot produce Creeds.json's modern-English Scripture quotations. I could not
  identify which modern edition it came from (two Exa searches found only
  studyreformed.com, which shows the same text) **[base edition unverified]**.
- Verdict: the Creeds.json Flavel has unknown provenance and fails the
  edition-evidence rule. **Our source wins:** EEBO-TCP A39662, Phase I CC0
  sentence in the file. The Creeds.json per-question structure (107 numbered
  blocks) can still help as an **unshipped alignment aid** when building the
  WSC-question map for A39662's 100 divs, the same way the repo used Creeds.json
  to check WCF structure.

### 2.3 Matthew Henry's Scripture Catechism: outside report wrong; stays BLOCKED **[verified]**

Outside claim: Henry's Scripture Catechism (1703) is "Unlicense / Public Domain"
in Creeds.json.

- `creeds/matthew_henrys_scripture_catechism.json` (601 KB, 107 questions with
  lettered sub-questions "1a", "1b" ...). Current metadata:
  `"SourceUrl": "https://archive.org/details/westminsterassem00west/mode/2up"`,
  `"SourceAttribution": "Public Domain"`.
- History: in commit 417d3c7 (2022-08-06, "Remove duplicate questions + add to
  more authoritative source (#42)") the diff changes
  `"SourceUrl": "https://www.blueletterbible.org/study/ccc/mh_sc.cfm"` to the
  archive.org scan. The rest of that commit only deletes duplicate rows; the
  text was not re-keyed. **The text came from Blue Letter Bible.**
- Live BLB page (https://www.blueletterbible.org/study/ccc/mh_sc00.cfm): its
  wording matches Creeds.json exactly ("Is man a reasonable creature? Yes: For
  there is a spirit in man ... Job 32:8 ... Is he his own carver? No: Should it
  be according to thy mind, Job 34:33"). The only rights text on the page is the
  footer "©2026 Blue Letter Bible". There is no public-domain or reuse
  statement. BLB's terms page was not found at three guessed URLs (all 404).
- Verdict: an aggregator's copy with no edition-level license. Re-labelling it
  "Public Domain" in Creeds.json does not fix that. **Ours is right: BLOCKED**
  (our survey found only IA/ECCO scans). Same use as Flavel: the structure could
  help align a future clean source, nothing more.

### 2.4 Watson, Body of Divinity: outside report vague; ours is more specific

The outside report lists "Thomas Watson (_A Body of Divinity_) [Unverified on
live page]" with no source. Ours has two verified routes: EEBO-TCP A65285 (1692,
Phase I CC0, STRONG) and CCEL `watson/divinity` (ThML
`<DC.Rights>Public Domain</DC.Rights>`, POSSIBLE, Spurgeon memoir to exclude).
No conflict on facts.

### 2.5 Ursinus

The outside report wants "Zacharias Ursinus (_Commentary on the Heidelberg
Catechism_)", which in practice means the Williard translation, and gives no
source. Ours: Williard BLOCKED (verified clean copies are Monergism and
Thirdmill/RPM, neither with a license; CCEL `ursinus/catechism` has a blank
`<DC.Rights />`). Substitute: EEBO-TCP A64611 (Parry tr., 1645, Phase II CC0).
Ours stands.

### 2.6 Smaller disagreements

- **Flavel date.** Outside says 1688 (Creeds.json's year). Ours uses the 1692
  EEBO printing (A39662). Both are early printings of the same work; for the
  app, cite the edition actually ingested.
- **Creeds.json as a whole.** The outside report presents Creeds.json as a
  cleanly licensed bundle once the eight listed files are removed. The repo plan
  already says "Not licensed for reuse as a whole", and 2.1-2.3 show why the
  per-file "SourceAttribution: Public Domain" labels cannot be relied on. Its
  Particular Baptist files (1689 LBCF, 1695 Baptist Catechism, Keach, Spurgeon's
  Puritan Catechism, Abstract of Principles), which the outside roadmap suggests
  ingesting ("ingest ... the 1689 LBCF"), are excluded by the no-Baptist rule.
- **Mapping claim.** The outside report says Creeds.json files are "keyed by
  Catechism Q&A and proof-text references". True for question keying. But proofs
  in these three files are inline text inside `Answer` strings, not separate
  reference arrays, so a reference parser is needed either way **[verified on
  the Fisher, Flavel and Henry files]**.

## 3. New candidates from the outside report that ours missed

**None that meet the rules.** Every confession or catechism exposition the
outside report names is either already in our survey or fails on license or
provenance:

| Outside-report item                               | In ours?                             | Meets rules?                                      | Status      |
| ------------------------------------------------- | ------------------------------------ | ------------------------------------------------- | ----------- |
| Fisher & Erskine via Creeds.json                  | yes (#6, BLOCKED via Monergism DOCX) | no: Monergism text re-hosted (2.1)                | verified    |
| Flavel via Creeds.json                            | yes (#3, via EEBO A39662)            | no for Creeds.json copy (2.2); yes for EEBO       | verified    |
| Henry, Scripture Catechism via Creeds.json        | yes (#8, BLOCKED)                    | no: BLB text, "©2026 Blue Letter Bible" (2.3)     | verified    |
| Ursinus (Williard), A. A. Hodge, Shaw, Watson     | yes (#15, #11, #12, #1/#1b)          | no source offered                                 | -           |
| Creeds.json "Catechism for Young Children" (1840) | not in ours                          | not an exposition, out of scope; source unchecked | not checked |

Our gaps:

- **Westminster Larger Catechism:** the outside report offers nothing. Its only
  WLC reference is Creeds.json's `westminster_larger_catechism.json` (the
  catechism text, cited as note 33), which the repo already has. The WLC
  exposition gap stays open (Ridgley BLOCKED in ours).
- **Belgic Confession:** nothing; the word "Belgic" does not appear in the
  outside report's prose. Gap stays open.
- **Canons of Dort, article by article:** nothing. "Dort" appears only in "the
  1637 Dutch _Statenvertaling_ marginal notes (_Kanttekeningen_) commissioned by
  the Synod of Dort [Unverified on live page]". Those notes are keyed to Bible
  verses, not to the Canons, and the outside report gives no English source or
  license. Our head-level options (Collegiat Suffrage A20668; Robinson A10833)
  remain the only licensable Dort expositions.

Related but out of scope (passage-keyed, not confession expositions). Not
checked; named here so they are not lost:

- **Calvin's Institutes (Beveridge 1845) cross-linked to confession articles**
  (outside report section 2, "What a Reformed Reader Would Miss Most", item 2).
  It is not an exposition of any confession; linking would come from proof-text
  overlap. Its CCEL source and `<DC.Rights>` are marked "[Unverified on live
  page]" in the outside report.
- **Dutch Kanttekeningen (Haak's English translation, 1657):** a verse-keyed
  note set, possibly in EEBO-TCP. Worth its own TCP.csv search in a
  passage-notes survey, not this one.

## 4. Net effect on our survey

- No verdict changes. STRONG stays: Vincent (A64986), Flavel (A39662), Watson
  (A65285), Dickson (A35959), Ursinus 1645 (A64611). BLOCKED stays: Williard
  Ursinus, A. A. Hodge, Shaw, Fisher & Erskine, Brown of Haddington, Ridgley,
  Henry, Boston.
- Add to ours, under Fisher (#6) and Henry (#8): "Creeds.json carries clean,
  question-keyed JSON of this work under the repo's Unlicense, but its text is
  Monergism's DOCX (Fisher) or Blue Letter Bible's page (Henry); the 'Public
  Domain' SourceAttribution is an aggregator label. BLOCKED." Under Flavel (#3):
  "Creeds.json copy is a modernized edition of unknown provenance; usable only
  as an alignment aid."
- Possible unblock for Fisher (the most valuable blocked WSC work): ask
  Monergism for written permission; plan line 180 already allows Monergism
  content on that condition.
- Gaps unchanged: WLC (nothing licensable), Belgic (nothing), Dort (head level
  only).

## Fetch log (about 20)

GitHub (Creeds.json README, contents listing, three JSON files, three
commit-history queries, two commit diffs, one diff re-check); Monergism Fisher
DOCX; Monergism permissions page (curl gave a Cloudflare challenge; read through
Exa); BLB `mh_sc.cfm` and `mh_sc00.cfm`; three guessed BLB terms URLs (404);
EEBO-TCP A39662 raw XML; two Exa searches for the source of the modern Flavel
text. Working files are in /tmp/recon-dl/ (untrusted downloads; nothing executed
from them).
