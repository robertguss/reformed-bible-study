# Content survey prompts for outside research agents

Each prompt below is self-contained. Paste one prompt per research session, and
keep the shared context inside each, since the agent sees nothing else.

---

## Prompt 1: The whole landscape

```text
I'm building a free, open-source Reformed Bible study web app, with a public
API and an MCP server for AI agents. Every piece of content hangs off a Bible
passage (verse, verse range or chapter) or a confession article (for example
Westminster Confession 1.6 or Heidelberg Catechism Q21). There is no topic or
author directory, no AI chat inside the app, and no revenue.

Already shipped:
- Bible text: KJV, ASV, BSB, WEB.
- Original languages: SBLGNT, STEPBible tagged Greek and Hebrew with lexicons.
- Cross-references: OpenBible.
- Commentary: Calvin's commentaries, Matthew Henry, Jamieson-Fausset-Brown,
  Matthew Poole's Annotations, John Owen on Hebrews 6 to 10.
- Confessions: the Westminster Confession and the Larger and Shorter
  Catechisms; the Heidelberg Catechism, Belgic Confession and Canons of Dort,
  each with proof texts.

Hard rules for any candidate:
1. Theologically Reformed or Presbyterian, or historically central to the
   Reformed tradition. Nothing Baptist: no 1689 Confession, Gill, Spurgeon or
   Bunyan.
2. Redistributable. Every resource needs license evidence quoted word for word
   from the specific edition's own source page: public domain, CC0, CC BY,
   CC BY-SA, or an explicit permission. An aggregator saying "public domain" is
   not enough, and a blank rights field fails.
3. Clean digital text: TEI, OSIS, SWORD modules, ThML, USFM, structured HTML,
   EPUB or plain text. Scan-only or raw OCR of page images does not count.
4. It can be anchored to a passage or a confession article, ideally with
   explicit verse or section markers in the source.

Research question: what other content exists that meets these rules? Survey
widely: commentaries, annotated Bibles and study notes, expositions of
confessions and catechisms, further confessions and creeds, sermons keyed to a
text, reading plans, harmonies, maps or historical data keyed to passages,
and structured open datasets (JSON or CSV) built by others. Look beyond English
too, for example Dutch, German, French, Latin and Hungarian Reformed sources,
and note the language.

Sources worth checking include CCEL (check each work's rights field), the
CrossWire SWORD module repository (check each module's .conf
DistributionLicense), the Text Creation Partnership's EEBO-TCP and ECCO-TCP
transcriptions, Project Gutenberg, Wikisource, Internet Archive (text-layer
quality matters), the Post-Reformation Digital Library, Digitale Bibliotheek
voor de Nederlandse Letteren (DBNL), Monergism, Reformed.org, GitHub, and
academic digital-edition projects.

For each candidate, give: title, author and date; tradition; the best clean
source URL; format; the license statement quoted exactly with its URL, or
"none found"; coverage (which books, chapters or articles); how it maps to
verses or articles; size; known problems such as spelling, illegible
characters or modernised copyrighted editions; and a verdict of strong,
possible or blocked, with the reason. End with your top ten ranked by value
to a Reformed reader multiplied by ease of ingesting. Mark every claim you did
not verify on a live page.
```

---

## Prompt 2: Expositions of the confessions and catechisms

```text
I'm building a free, open-source Reformed Bible study app. Its content hangs
off Bible passages or confession articles. It already ships the Westminster
Confession, Larger and Shorter Catechisms, Heidelberg Catechism, Belgic
Confession and Canons of Dort, each with proof texts. I want commentary that
explains those documents article by article or question by question, so a
reader viewing Heidelberg Q1 or Westminster Shorter Catechism Q4 sees a
classic exposition beside it.

Rules: Reformed or Presbyterian only, nothing Baptist. License evidence must be
quoted word for word from the specific edition's own source page (public
domain, CC0, CC BY or CC BY-SA). Aggregator claims and blank rights fields do
not count. The text must be clean digital text, not scan-only page images.

Candidates to check, plus any others you find:
- Ursinus, Commentary on the Heidelberg Catechism.
- Olevianus on the Creed.
- Thomas Watson, A Body of Divinity.
- Thomas Vincent, The Shorter Catechism Explained from Scripture.
- Fisher and Erskine, The Assembly's Shorter Catechism Explained.
- John Brown of Haddington on the Shorter Catechism.
- A.A. Hodge, Commentary on the Confession of Faith.
- Robert Shaw, An Exposition of the Confession of Faith.
- Thomas Ridgley, A Body of Divinity (on the Larger Catechism).
- John Flavel on the Shorter Catechism.
- Matthew Henry's Scripture Catechism.
- Dutch expositions of the Heidelberg Catechism and the Belgic Confession,
  for example Kersten, Comrie, à Brakel, Van der Kemp and Bavinck. Note any
  English translations still under copyright.
- Expositions of the Canons of Dort.

For each, give: the best clean source URL and format; the license statement
quoted exactly with its URL; whether the text is divided per question or
article, so it can be keyed to one; the Scripture references it contains;
size; and a verdict of strong, possible or blocked, with the reason. End with
the top five ranked. Mark every claim you did not verify on a live page.
```

---

## Prompt 3: Further confessions, creeds and catechisms

```text
I'm building a free, open-source Reformed Bible study app. Readers can look up
which confession articles cite a verse, and read an article with its proof
texts. It ships the Westminster Standards, Heidelberg Catechism, Belgic
Confession and Canons of Dort, in public domain English (mostly Philip Schaff's
Creeds of Christendom, 1877). Nothing Baptist, so the 1689 London Baptist
Confession is excluded.

Find other Reformed or catholic creeds and confessions I could add, each with a
public domain or openly licensed English text and, ideally, proof texts.
Candidates:
- The ecumenical creeds: Apostles', Nicene, Athanasian and the Chalcedonian
  Definition.
- The Second Helvetic Confession, First Helvetic Confession, Scots Confession
  of 1560, French (Gallican) Confession of 1559, Savoy Declaration of 1658,
  Thirty-Nine Articles, Irish Articles of 1615, Lambeth Articles, Tetrapolitan
  Confession, Consensus Tigurinus and Helvetic Consensus Formula.
- Calvin's Geneva Catechism, Craig's Catechism, the Westminster Sum of Saving
  Knowledge, the Directory for Public Worship, the Compendium of the Heidelberg
  Catechism, and the Dutch liturgical forms.
- Others you find.

For each, give: the best clean source URL and format; the license statement
quoted exactly from that page; the edition and translator; its structure
(chapters, articles or questions); whether a public domain edition with proof
texts or Scripture references exists, and where; any existing structured
datasets (JSON or YAML on GitHub, such as Creeds.json) with their license; and
a verdict of strong, possible or blocked, with the reason. Flag confessions
that have no proof texts in any free edition. Mark every claim you did not
verify on a live page.
```

---

## Prompt 4: More verse-keyed Reformed commentaries

```text
I'm building a free, open-source Reformed Bible study app. Its content hangs
off Bible verses and confession articles. It already ships Calvin's
commentaries, Matthew Henry, Jamieson-Fausset-Brown, Matthew Poole's
Annotations and John Owen on Hebrews 6 to 10. Content is stored one file per
chapter, and the static-file budget is tight, so single-book works are cheap
to add and another whole-Bible work is expensive.

Find further verse-keyed Reformed or Presbyterian commentaries with clean
digital text and verifiable licenses. Nothing Baptist (no Gill or Spurgeon).
Report on Barnes and Keil-Delitzsch, but flag them as needing the owner's
approval. Candidates:
- Thomas Manton, David Dickson, George Hutcheson, James Durham, William Gouge,
  Robert Haldane, John Brown of Edinburgh, Charles Hodge, Thomas Goodwin,
  Jeremiah Burroughs, William Perkins, Robert Leighton, John Lightfoot and
  Jonathan Edwards's notes on Scripture.
- The Dutch Annotations (Haak's English, 1657) and the Westminster
  Annotations (1645 and 1651).
- Owen on Hebrews 1 to 5 and 11 to 13.
- Calvin on Isaiah 49 to 66.
- Theodore Beza's New Testament annotations.
- Others you find, including non-English works such as the Dutch
  Statenvertaling Kanttekeningen.

Rules: license evidence must be quoted word for word from the specific
edition's own source page. CCEL works with a blank rights field fail, and an
aggregator claim is not enough. Clean digital text is required, not raw OCR of
page images. Good sources: CrossWire SWORD modules (check the .conf
DistributionLicense), EEBO-TCP (CC0 TEI, pre-1700 only), ECCO-TCP, CCEL,
Project Gutenberg, Wikisource and the Post-Reformation Digital Library.

For each, give: the source URL and format; the license statement quoted
exactly; books and chapters covered; whether the source marks verses or
sections so comments can be aligned to verses; spelling or legibility
problems; and a verdict of strong, possible or blocked, with the reason. End
with the top ten ranked by value to a Reformed reader multiplied by ease of
ingesting. Mark every claim you did not verify on a live page.
```

---

## Prompt 5: Reformed Bibles with notes, and sermons keyed to a text

```text
I'm building a free, open-source Reformed Bible study app. Its content hangs
off Bible verses and confession articles. It ships the KJV, ASV, BSB and WEB
translations and several classic Reformed commentaries. Nothing Baptist (no
Spurgeon).

Part A. Find public domain or openly licensed Reformed Bibles that carry
notes:
- The 1560 and 1599 Geneva Bible with its marginal notes, including the
  Tomson New Testament and Junius's Revelation notes. Check the CrossWire SWORD
  modules and whether their notes are included, ebible.org, EEBO-TCP
  transcriptions, and any clean OSIS or USFM with notes. Confirm that modern
  modernised editions such as Tolle Lege's are copyrighted.
- The Dutch Statenvertaling with its Kanttekeningen.
- The Bishops' Bible is out of scope unless its notes are Reformed.
- Others you find.
For each, give: the source, format and the license quoted exactly; whether
notes are keyed to verses; how complete it is; and a verdict.

Part B. Find sermons that state their text passage, so each sermon can hang
off that passage:
- Calvin's sermons in English (on Job, Deuteronomy, Ephesians, Galatians, 1
  and 2 Timothy, Titus, Micah and others).
- Jonathan Edwards. Check the Works of Jonathan Edwards Online terms of use
  for redistribution.
- Robert Murray M'Cheyne, Thomas Manton, Samuel Rutherford, Thomas Boston,
  Ebenezer and Ralph Erskine, and Puritan sermons in EEBO-TCP.
- Others you find.
For each, give: the source, format and the license quoted exactly; the number
of sermons; whether each sermon's text reference is recorded in a
machine-readable way; and a verdict of strong, possible or blocked, with the
reason.

License evidence must come from the specific edition's own page. Aggregator
claims and blank rights fields do not count. Mark every claim you did not
verify on a live page.
```

---

## Prompt 6: Open datasets and what comparable apps offer

```text
I'm building a free, open-source Reformed Bible study web app with a public
API and an MCP server for AI agents. Its content hangs off Bible passages or
confession articles. It already ships four translations, Greek and Hebrew with
lexicons, OpenBible cross-references, five classic Reformed commentaries, and
the Westminster Standards and Three Forms of Unity with proof texts.

Two questions.

1. Which open, structured datasets keyed to Bible passages could add value,
   with licenses that allow redistribution (public domain, CC0, CC BY or
   CC BY-SA)? Look for:
   - Treasury of Scripture Knowledge.
   - Theographic and other people, place and event data.
   - OpenBible geocoding.
   - The STEPBible data beyond lexicons, such as proper names and morphology.
   - Clear.Bible and Macula Greek and Hebrew syntax trees.
   - Gospel harmonies and parallel-passage tables.
   - Chronologies, such as Ussher's Annals, which are public domain.
   - Structured confession and catechism data on GitHub, such as Creeds.json.
   - Reading plans, including M'Cheyne's.
   - Others you find.
   For each, give: the URL, the license quoted exactly, the format, the
   coverage, how it keys to verses, and a verdict.

2. What content do comparable Reformed or classic-theology study tools offer?
   Look at Logos (Reformed bundles), Accordance, e-Sword, theWord, MySword,
   Bible Analyzer, the Reformation Study Bible app, Ligonier, Monergism, CCEL,
   STEP Bible, BibleHub, Blue Letter Bible and PRDL. List which of their
   public domain resources are also freely and cleanly available elsewhere,
   with a source and license I can verify myself, and say which ones a Reformed
   reader would miss most in a new app.

Mark every claim you did not verify on a live page.
```
