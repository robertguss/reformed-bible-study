# Belgic Confession: source and verification

## Edition

The Belgic Confession, written in French by Guy de Brès in 1561 and revised at
the Synod of Dort in 1618–1619, as Philip Schaff printed it in The Creeds of
Christendom, vol. 3 (Harper, 1877), pages 383–436, under the heading "The Belgic
Confession. A.D. 1561. Revised 1619." Schaff prints the French text and an
English text in parallel columns. His introduction says the English text "(made
from the Latin) is the one authorized by the 'Reformed (Dutch) Church in
America'". Only the English text is transcribed. The Scripture proofs are the
numbered notes Schaff prints against the French column.

- Scan of the 1877 printing: https://archive.org/details/creedsofchriste03scha
  (the item page states "NOT_IN_COPYRIGHT").
- Schaff's text: https://www.ccel.org/ccel/schaff/creeds3.xml, section iv.viii
  (the file's DC.Rights reads "Public Domain").

## Files used, with the hashes of the copies checked on 2026-11-04

- https://www.ccel.org/ccel/schaff/creeds3.xml  
  SHA-256 `756adf1ddd466d237221c76b99d25d55cab7e83d08914f28a289c3b90dccddf3`
- https://archive.org/download/creedsofchriste03scha/creedsofchriste03scha_djvu.txt  
  SHA-256
  `24e5f7cc9ac84691b1f70ef6f49d5646f72dab5c0adf4030ec799ab141c2d556`

The second file is the OCR text of the 1877 scan. It and the page images of the
scan served only to check the CCEL text; no text was taken from them except
where a correction below says so.

## How the text was made

1. The English column of section iv.viii was extracted from the CCEL file, from
   Article 1 to the line "Even so, come Lord Jesus. Rev. xxii. 20." that closes
   Article 37 across both columns. Page breaks were removed, line breaks were
   joined with single spaces, and a paragraph that runs across a page break was
   joined into one. Italic and small capitals are set as plain text.
2. Each article is one division, titled by the article's English heading set in
   title case, with one article labelled "Article N" and the id `ArtN`. The
   closing line is the last paragraph of Article 37.
3. The extracted text was compared word by word with the OCR of the 1877 scan,
   and each difference that was not an OCR misreading was checked against the
   page image. The CCEL errors this found are corrected below.

## How the proofs were made

Schaff prints the Scripture references only as numbered notes after phrases of
the French text. The English column has no notes, and its clauses do not line up
with the French phrases, so each article's references form one proof marked
`"wholeArticle": true`, which supports the whole article rather than a clause.

The proof lists, in the order the print gives them, the references of every note
in the article's French column, then the citations printed in the text itself:
Romans 1:20 in Article 2 (printed in both columns), Genesis 1:26-27 and Genesis
3:22 in the English of Article 9, and Revelation 22:20 in the closing line of
Article 37. A reference repeated within an article is kept once.

- The references were read from the printed text of each note, not from the CCEL
  file's tags, which misread several of them (for example "Psa. cii. 19" tagged
  as Psalm 2:19 and "Ex. i. 9" tagged as Isaiah 1:9).
- A chapter given with no book continues the book before it; "ver." continues
  the chapter before it. Verse lists such as "10, 11, 12" became one range.
- "etc." after a reference was dropped. Schaff's "[?]" after 1 John 5:7
  (Article 9) was dropped and the reference kept.
- "Jud." and "2 Jean" are Jude and 2 John, books of one chapter, so "Jud. 15" is
  Jude 1:15 and "2 Jean viii." is 2 John 1:8.
- Every reference was checked against the KJV verse-count table.
- References that look misprinted but name an existing verse are kept as
  printed, for example "Gen. i. 3, 7" in Article 14 and "Eccl. xii. 3" in
  Article 9.

Counts: 37 articles. 312 notes, plus the in-text citations, give 806 references
across 34 articles. Articles 4, 5 and 6 have no notes and no proofs.

## French verse numbering

The notes follow a French Bible's numbering. A spot check of every reference
where Hebrew and KJV numbering differ found that the Psalms count each psalm
title as a verse, as Hebrew Bibles do, while the other books follow the KJV
chapters.

Psalms, checked against the clause each note follows:

- Article 3: "Psa. cii. 19" follows "commanded his servants the Prophets ... to
  commit his oracles to writing". KJV Psalm 102:18 reads "This shall be written
  for the generation to come"; KJV 102:19 does not fit.
- Article 21: "Psa. lxix. 5" follows "Il a donc payé ce qu'il n'avait point
  ravi" (he paid what he had not taken). KJV Psalm 69:4 reads "then I restored
  that which I took not away"; KJV 69:5 does not fit.
- Article 14: "Psa. xlix. 21" follows "being in honor, he understood it not".
  KJV Psalm 49 has 20 verses, and 49:20 reads "Man that is in honour, and
  understandeth not".
- Article 21: "Psa. xxii. 2" follows "My God, my God, why hast thou forsaken
  me", which is KJV Psalm 22:1.

So every Psalm reference was renumbered from Hebrew to KJV numbering, using the
verse notes of the STEPBible TAHOT data the dataset already ingests. These
references changed:

| Article | Printed     | KJV               |
| ------- | ----------- | ----------------- |
| 2       | Ps 19:2     | Ps.19.1           |
| 2       | Ps 19:8     | Ps.19.7           |
| 3       | Ps 102:19   | Ps.102.18         |
| 7       | Ps 62:10    | Ps.62.9           |
| 9       | Ps 45:8     | Ps.45.7           |
| 12      | Ps 34:8     | Ps.34.7           |
| 13      | Ps 75:7-8   | Ps.75.6-Ps.75.7   |
| 14      | Ps 49:21    | Ps.49.20          |
| 15      | Ps 51:7     | Ps.51.5           |
| 16      | Ps 65:5     | Ps.65.4           |
| 21      | Ps 22:16    | Ps.22.15          |
| 21      | Ps 69:5     | Ps.69.4           |
| 21      | Ps 22:2     | Ps.22.1           |
| 22      | Ps 51:13    | Ps.51.11          |
| 26      | Ps 44:21    | Ps.44.20          |
| 27      | Ps 46:5     | Ps.46.4           |
| 27      | Ps 102:14   | Ps.102.13         |
| 27      | Ps 89:37-38 | Ps.89.36-Ps.89.37 |
| 28      | Ps 22:23    | Ps.22.22          |
| 37      | Ps 62:13    | Ps.62.12          |

The rule is applied to every Psalm reference. One fits less well than the rest:
in Article 21, "Psa. xxii. 16" follows "condemned as a malefactor by Pontius
Pilate", which KJV Psalm 22:16 ("the assembly of the wicked have inclosed me")
fits as well as KJV 22:15.

Other books, kept as printed because the KJV verse fits the clause:

- Joel 2:32 (Article 28): "whosoever shall call on the name of the LORD shall be
  delivered". Hebrew Bibles number it Joel 3:5.
- Malachi 4:1 and 4:3 (Article 37): the burning day and the wicked as ashes.
  Hebrew Bibles number them Malachi 3:19 and 3:21.
- Micah 5:2 (Article 10): "whose goings forth have been from of old", quoted in
  the article. Hebrew Bibles number it 5:1.
- Isaiah 64:4 (Article 37) and 64:6 (Article 24), Daniel 6:8-10 (Article 28) and
  Deuteronomy 12:32 (Article 7) also fit their KJV verses.

One New Testament reference was renumbered: "2 Cor. xiii. 13" in Article 9
follows the blessing "The grace of our Lord Jesus Christ ...", which is 2
Corinthians 13:14 in the KJV. Romans 16:17-18 (Article 32) fits as printed.

## What is left out, and why

- The French text, Schaff's introduction and the article headings he prints in
  Latin over the French column.
- Schaff's three editorial footnotes:
  - Article 1, after "the overflowing fountain of all good": English Harm. of
    Conf.: 'A most plentiful well-spring of all good things.'
  - Article 36, against both columns: [This section, like the corresponding
    sections in other Reformed Confessions, is framed on the theory of a union
    of Church and State, and is applicable to Free Churches only so far as they
    may justly claim from the civil government legal protection in all their
    rights.—Ed.]
  - Article 37, after the closing line: [From the Latin edition, which closes—
    'Apocal. xxii. 20: Etiam veni Domine Jesu.']
- The reference "Gal. xxx. 15" in the note on Article 7. The scan prints it so,
  but Galatians has six chapters, and no likely intended verse is certain.

## Corrections made to the CCEL text

Each correction was checked against the scan.

- Article 9 (text): "shall he born of thee" -> "shall be born of thee": the scan
  (page 392) reads "be"
- Article 18 (text): "by the month of his holy prophets" -> "by the mouth of his
  holy prophets"
- Article 18 (text): "the wombof the blessed virgin" -> "the womb of the blessed
  virgin"
- Article 19 (heading): "PERSON OP CHRIST" -> "Person of Christ"
- Article 21 (heading): "OP THE SATISFACTION" -> "Of the Satisfaction"
- Article 26 (heading): "CHRIST' INTERCESSION" -> "Christ's Intercession"
- Article 26 (text): "come unto God by Mm" -> "come unto God by him": the scan
  (page 416) reads "by him"
- Article 26 (text): "that he might he a merciful" -> "that he might be a
  merciful"
- Article 29 (heading): "PROM THE FALSE CHURCH" -> "from the False Church"
- Article 29 (text): "assumer to themselves" -> "assume to themselves"
- Article 29 (text): "the truer Church is known" -> "the true Church is known"
- Article 29 (text): "relieth more npon men" -> "relieth more upon men": the
  scan (page 421) reads "upon"
- Article 30 (text): "according to tbeir necessities" -> "according to their
  necessities"
- Article 34 (text): "our sonls" -> "our souls"
- Article 34 (text): "satisfaction for sin ;" -> "satisfaction for sin;": the
  print's space before the semicolon, removed everywhere else in the CCEL text
- Article 35 (text): "our Saviour Jesns Christ" -> "our Saviour Jesus Christ"
- Article 35 (text): "belie vers" -> "believers"
- Article 37 (text): "theii cause" -> "their cause"

The scan confirms the CCEL readings "what is eaten and drunk by us" (Article 35,
page 430) and "Truly Good" in the heading of Article 14 (page 398), where the
OCR differs.

Corrections to the notes, each read from the scan:

- Article 22, note after "par la foi sans les œuvres": "Fal. ii. 6" -> "Gal. ii.
  6" (page 408)
- Article 24, note after "par l'opération du Saint-Esprit": "1 Pier. 23" -> "1
  Pier. i. 23" (page 410)
- Article 27, note after "contre la rage de tout le monde": "Jean xvi. 38" ->
  "Jean xvi. 33" (page 417)
- Article 27, notes after "comme éteinte" and "devant Bàal": "Ex. i. 9" -> "Es.
  i. 9" (page 417)
- Article 29, note after "la pure prédication de l'Évangile": the CCEL file has
  only "*2"; the scan (page 419) prints "Jean x. 27; Eph. ii. 20; Act. xvii. 11,
  12; Col. i. 23; Jean viii. 47."
- Article 29, note after "rejetant toutes choses contraires à elle": "Gal. i.
  6–9" -> "Gal. i. 6–8" (page 420)

The CCEL note text also has typing slips that do not change a reference and were
read as the scan prints them: "J ean" for "Jean", "16,. 17", "1-–12", "l" for
"1" in "Gal. v. l" and "Phil. i. l, 29", "Rom. iv 11" without the full stop,
"Jud. 8 et 10." for verses 8 and 10, and a stray "*" before "Psa. lxix. 5".

## Maintainer checklist

Check each part against the scan at
https://archive.org/details/creedsofchriste03scha before merge. Confirm the
wording of every article and every reference in its notes. Tick when done.

- [ ] Articles 1–9 (pages 383–393)
- [ ] Articles 10–17 (pages 393–402)
- [ ] Articles 18–24 (pages 402–412)
- [ ] Articles 25–29 (pages 412–421)
- [ ] Articles 30–35 (pages 421–432)
- [ ] Articles 36–37 and the closing line (pages 432–436)
- [ ] The corrections above
- [ ] The Psalm renumbering table above
