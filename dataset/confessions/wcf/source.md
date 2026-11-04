# Westminster Confession of Faith: source and verification

## Edition

The Humble Advice of the Assembly of Divines concerning a Confession of Faith,
with the Quotations and Texts of Scripture annexed (London, 1647), in the
Edinburgh reprint by Evan Tyler (1647). The text and proof references are those
Philip Schaff printed from that reprint in The Creeds of Christendom, vol. 3
(Harper, 1877), "with spelling and punctuation conformed to modern usage".
Schaff's American alterations (chapters 23 and 31 and minor footnoted changes)
are not used: the main column of his edition is the 1647 text, and only that is
transcribed.

- Scan of the 1647 Edinburgh reprint:
  https://archive.org/details/humbleadviceofas00west (Princeton Theological
  Seminary Library copy; the item page states "NOT_IN_COPYRIGHT").
- Schaff's text: https://www.ccel.org/ccel/schaff/creeds3.xml (the file's
  DC.Rights reads "Public Domain").

## Files used, with the hashes of the copies checked on 2026-11-03

- https://www.ccel.org/ccel/schaff/creeds3.xml  
  SHA-256 `756adf1ddd466d237221c76b99d25d55cab7e83d08914f28a289c3b90dccddf3`
- https://archive.org/download/humbleadviceofas00west/humbleadviceofas00west_djvu.txt  
  SHA-256
  `9154494f98db046e4d5dceb4c07ba661bae0a702b329d939afcbbdb06ac68821`
- https://archive.org/download/confessionoffait0000scot/confessionoffait0000scot_djvu.txt  
  SHA-256
  `21f3ae30f4e6c0653e8697582229e526b84c61dc4279bb0a6eac680a531c3e83`
- https://raw.githubusercontent.com/NonlinearFruit/Creeds.json/master/creeds/westminster_confession_of_faith.json  
  SHA-256
  `90f793e3444f9a6a834c29fc7b6ba21250b33e92979525b5d5158bed16c24f06`
- https://ebible.org/Scriptures/eng-kjv2006_vpl.zip  
  SHA-256 `e9b979989492238e2cf1b7b9b7521b24024fb0769a88db476eb28e36c1af957c`

The 1855 file is the OCR text of The Confession of Faith, the Larger and Shorter
Catechisms, with the Scripture Proofs at Large (Edinburgh: Johnstone and Hunter,
1855), https://archive.org/details/confessionoffait0000scot. Creeds.json
(NonlinearFruit) served only to check structure and to flag disagreements; no
text was taken from it.

## How the text was made

1. The English column of Schaff's chapter and section text was extracted from
   the CCEL file, with each proof note kept at the point where it attaches.
   Schaff's Latin column, his "[Am. ed. ...]" notes, the American revised
   sections and the subscription of the Assembly's officers after chapter 33
   were left out.
2. The extracted text was compared word by word with Creeds.json. Of 172
   sections, the only differences were Schaff's American spelling (kept) and the
   CCEL digitization errors corrected below.
3. Each proof note was parsed into references and compared clause by clause with
   Creeds.json: 559 of 582 clauses agreed exactly. Each disagreement was checked
   against the 1647 scan's OCR and the 1855 printing, which quotes every proof
   in full. Corrections are listed below; unresolved disagreements are listed
   for the maintainer.
4. Every proof reference was checked against the KJV verse-count table, and
   references read from a printing "at large" were checked by matching the
   quoted Scripture words against the KJV text of the verse (eBible.org KJV,
   file listed above), so a misread chapter or verse number is caught when the
   quoted words belong to another verse.

Each section is one paragraph of text runs. A run ends where a proof note
attaches in the print, so the n-th proof belongs to the clause ending the n-th
run. The print's clause letters (a, b, c, running through each chapter) are not
recorded: the OCR of the 1647 scan does not let every letter be read, several
chapters run past the letter z, and the content schema has no place to mark a
letter's position in the text.

Counts: 33 chapters, 172 sections, 582 proof clauses, 1,865 references.

## Corrections made to the CCEL text

- 2.2 (proof 6): 'Job xxii. 2, 23' -> 'Job xxii. 2, 3': CCEL reads 'Job xxii. 2,
  23'; the 1855 Edinburgh proofs-at-large quote Job 22:2-3 and Creeds.json
  agrees
- 2.2 (text): 'the alone foundation of all being' -> 'the alone fountain of all
  being': CCEL text reads 'foundation'; the 1647 scan (OCR) and Creeds.json read
  'Fountain'
- 2.3 (text): 'Godhead head there be' -> 'Godhead there be': page-break
  duplication in the CCEL text
- 4.2 (proof 7): 'Gen. ii. 27' -> 'Gen. ii. 17': CCEL reads 'Gen. ii. 27', a
  verse that does not exist; Creeds.json reads Gen 2:17
- 7.3 (proof 2): '5 Mark xvi.' -> 'Mark xvi.': CCEL reads '5 Mark xvi. 15, 16'
  with a stray leading digit
- 7.6 (proof 1): 'Gal. ii. 17;' -> 'Col. ii. 17;': Schaff prints 'Gal. ii. 17'
  and notes that the American edition reads 'Col. ii. 17'; the clause concerns
  the ordinances of the old covenant as shadows, which is Col 2:17, and the 1855
  Edinburgh printing and Creeds.json read Col 2:17. Maintainer: confirm the 1647
  margin
- 7.6 (text): 'simplicity aud less' -> 'simplicity and less': CCEL typo
- 8.1 (text): 'world; whom he did' -> 'world; unto whom he did': the 1647 scan
  (OCR) reads 'Vnto whom He did'; Creeds.json agrees
- 8.2 (text): 'come, fake upon him' -> 'come, take upon him': CCEL typo
- 9.2 (proof 1): CCEL omits the first of two notes; the 1647 scan (OCR) shows
  letters b and c, with Eccl 7:29 and Gen 1:26 against 'well pleasing to God';
  the 1855 Edinburgh printing and Creeds.json agree
- 17.3 (proof 2): 'Psa. li. title and verse 14' -> 'Psa. li. 14': the print
  cites the Psalm's title and verse 14; the title has no verse number in KJV
  versification, so only verse 14 is recorded
- 17.3 (proof 6): 'Isa. xxxvi. 17' -> 'Isa. lxiii. 17': CCEL reads 'Isa. xxxvi.
  17'; Creeds.json reads Isa 63:17 ('why hast thou made us to err ... and
  hardened our heart'), which fits the clause
- 18.4 (proof 2): 'Isa. 1. 10' -> 'Isa. l. 10': CCEL reads 'Isa. 1. 10' (digit
  one for roman fifty); Creeds.json reads Isa 50:10, as the CCEL text itself
  does in the previous note
- 18.4 (proof 3): 'Jer. lii. 40' -> 'Jer. xxxii. 40': CCEL reads 'Jer. lii. 40',
  a verse that does not exist; Creeds.json reads Jer 32:40
- 19.6 (text): 'covenant of words' -> 'covenant of works': CCEL typo
- 20.2 (proof 3): '; Psa. v. l.' -> '': CCEL ends with 'Psa. v. l.' (Psalm 5:1);
  the 1855 Edinburgh proofs-at-large do not have it and the legible part of the
  1647 margin shows no Psalm; dropped pending the maintainer's check of the scan
- 21.5 (text): 'the dne administration' -> 'the due administration': CCEL typo
- 22.6 (proof 2): 'Psa. 1. 14' -> 'Psa. l. 14': CCEL reads 'Psa. 1. 14' (digit
  one for roman fifty); Creeds.json reads Ps 50:14
- 22.7 (text): 'they are superstitions and sinful' -> 'they are superstitious
  and sinful': CCEL typo
- 25.3 (proof 1): '1 Cor. xii. 23' -> '1 Cor. xii. 28': CCEL reads '1 Cor. xii.
  23'; the 1855 Edinburgh proofs-at-large quote 1 Cor 12:28 and Creeds.json
  agrees
- 29.8 (text): 'body andj blood' -> 'body and blood': CCEL typo
- 33.3 (text): dropped the subscription of the prolocutor, assessors and scribes
  that follows the last section
- 1.2 (text): the print sets the books of the Old and New Testament as a table;
  they are given here as two paragraphs in the print's order

## Disagreements left as Schaff has them

- 1.6 proof 2: Schaff cites 1 Cor 2:9, 10, 12; Creeds.json and the 1855
  Edinburgh printing have 1 Cor 2:9-12 (verse 11 included). Schaff's reading
  kept.
- 20.2 proof 3: Schaff and Creeds.json cite Col 2:20-23; the legible part of the
  1647 margin reads 'Col. 2. 20, 22, 23'. Schaff's reading kept.
- 20.4 proof 3: Schaff has Ezra 7:23-28; Creeds.json omits it; the 1855 printing
  quotes Ezra 7:23. Schaff's reading kept.
- 21.6 proof 7: Schaff cites Isa 56:7; Creeds.json has Isa 56:6-7. Schaff's
  reading kept.
- 27.3 proof 3: Schaff puts Matt 28:19-20 under section 3 and Matt 28:19 under
  section 4; Creeds.json puts Matt 28:19-20 under section 4. Schaff's reading
  kept.
- 33.2 proof 3: Schaff cites Matt 25:31-34; Creeds.json has Matt 25:31-46; the
  1855 printing has 'Matt. xxv. 31, to the end'. Schaff's reading kept.
- 9.2 proof 1: The 1647 scan reads 'that which was good'; Schaff and Creeds.json
  read 'that which is good'. Schaff's reading kept.

## Gaps

- 17.3, proof 2: the print cites the title of Psalm 51 together with verse 14.
  KJV versification gives psalm titles no verse number, so only Ps 51:14 is
  recorded.
- No other section lacks proof texts.

## Maintainer checklist

Check each chapter against the scan at
https://archive.org/details/humbleadviceofas00west before merge. For each
chapter, confirm the wording of every section, that each proof clause attaches
where the run ends, and every reference. Tick when done.

- [ ] Chapter 1
- [ ] Chapter 2
- [ ] Chapter 3
- [ ] Chapter 4
- [ ] Chapter 5
- [ ] Chapter 6
- [ ] Chapter 7
- [ ] Chapter 8
- [ ] Chapter 9
- [ ] Chapter 10
- [ ] Chapter 11
- [ ] Chapter 12
- [ ] Chapter 13
- [ ] Chapter 14
- [ ] Chapter 15
- [ ] Chapter 16
- [ ] Chapter 17
- [ ] Chapter 18
- [ ] Chapter 19
- [ ] Chapter 20
- [ ] Chapter 21
- [ ] Chapter 22
- [ ] Chapter 23
- [ ] Chapter 24
- [ ] Chapter 25
- [ ] Chapter 26
- [ ] Chapter 27
- [ ] Chapter 28
- [ ] Chapter 29
- [ ] Chapter 30
- [ ] Chapter 31
- [ ] Chapter 32
- [ ] Chapter 33
- [ ] The corrections above, especially 7.6 (Gal 2:17 or Col 2:17 in the 1647
      margin) and 20.2 (Schaff's 'Psa. v. l.')
- [ ] The disagreements left as Schaff has them
