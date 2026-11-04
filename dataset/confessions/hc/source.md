# Heidelberg Catechism: source and verification

## Edition

The Heidelberg Catechism (1563). The questions and answers are the English text
printed by Philip Schaff in The Creeds of Christendom, vol. 3 (1877), which
prints no Scripture proofs. The proofs are those of The Heidelberg Catechism,
Specially Arranged and Adapted for Use in Sunday Schools and Catechetical
Classes (Tiffin, Ohio: E. R. Good and Bro., 1879), a Sunday-school arrangement
whose text Wikisource describes as the Reformed Church in America's translation,
read from its Wikisource transcription and checked against the scan.

- Schaff's text: https://www.ccel.org/ccel/schaff/creeds3.xml, section iv.vi
  (DC.Rights "Public Domain").
- The 1879 edition on Wikisource:
  https://en.wikisource.org/wiki/The_Heidelberg_Catechism, transcluded from
  pages 5-84 of "Index:The Heidelberg catechism.. (IA
  heidelbergcatech00refo).pdf". The work page carries the PD-old notice "This
  work was published before January 1, 1931, and is in the public domain
  worldwide because the author died at least 100 years ago." The site footer
  reads "Text is available under the Creative Commons Attribution-ShareAlike
  License; additional terms may apply."
- Scan of the 1879 edition: https://archive.org/details/heidelbergcatech00refo
  (Library of Congress copy; its metadata reads "The Library of Congress is
  unaware of any copyright restrictions for this item."), also on Wikimedia
  Commons as
  https://commons.wikimedia.org/wiki/File:The_Heidelberg_catechism.._(IA_heidelbergcatech00refo).pdf

## License

The record is CC-PDM-1.0. Schaff's 1877 text is public domain by CCEL's own
rights statement, as for the Westminster Standards. The 1879 edition was
published in the United States before 1931, and its Wikisource page marks the
work PD-old. The Wikisource site licenses its contributors' text under CC BY-SA,
but the dataset takes from the transcription only the bare Scripture references
of the 1879 print, which are facts of a public domain work, and every one was
checked against the scan and corrected to it where the transcription differed.
The attribution still names the Wikisource transcription.

## Files used, with the hashes of the copies checked on 2026-11-04

- https://www.ccel.org/ccel/schaff/creeds3.xml  
  SHA-256 `756adf1ddd466d237221c76b99d25d55cab7e83d08914f28a289c3b90dccddf3`
- The Wikisource page wikitext of the 80 transcribed pages, fetched from the
  MediaWiki API by revision id (the two URLs are listed in resource.json; the
  newest revision is dated 2026-10-28)  
  SHA-256 `ba9e6041993f4a37fc6b8f0782f0b4144f8b54cb0e74c4dc738ffcd1c1211477`
  (pages 5-54)  
  SHA-256 `899a4759f1c9d87766cde2d1eab5869fc417b8f3bf46d5edaa836f19f82f9277`
  (pages 55-84)
- https://en.wikisource.org/wiki/The_Heidelberg_Catechism (rendered page, for
  the license notices; revision 14433040)  
  SHA-256 `065a6a5703e01bfaf7a00516ac0a55f897d191b38149dca3c79fcca045d08701`
- https://upload.wikimedia.org/wikipedia/commons/0/01/The_Heidelberg_catechism.._%28IA_heidelbergcatech00refo%29.pdf  
  SHA-256
  `a3bd5233db757d20a8b4e79699dc9846f8acda0c2064e32a928bb18157afee99`
- https://archive.org/download/heidelbergcatech00refo/heidelbergcatech00refo_djvu.txt  
  SHA-256
  `2a0823a4a6f0ba9503e61feb5ee33dde2bde53670e34989c2616a3409a05c850`
- https://archive.org/download/heidelbergcatech00refo/heidelbergcatech00refo_djvu.xml  
  SHA-256
  `19ad194db3ccc6cee8eb2895ae4569a17bc722c47969d4d388611f3b1402506e`
- https://ebible.org/Scriptures/eng-kjv2006_vpl.zip  
  SHA-256 `d3637f7845cfc1469f854eaa9f6c24c1177ccf5058c3a4b10d7cbccca5cb69ec`

## How the record was made

1. The 129 questions and answers were extracted from the English column of
   Schaff's section iv.vi, dropping the German column, his notes and his
   italics. Rows split across a page are joined; separate rows stay separate
   paragraphs, so the Creed in Question 23 has three paragraphs and the law in
   Question 92 has an opening line and one paragraph per commandment, each
   headed as Schaff heads it ("First Commandment.").
2. Schaff prints no Lord's Day divisions. The 52 Lord's Days are those of the
   1879 edition, whose headings fall before the same questions as the fixed
   division of the catechism, except that the print omits the heading of the 7th
   Lord's Day before Question 20.
3. The 1879 numbering was checked against Schaff's before any proof was joined
   (see the spot check below). The two are different translations, but every
   question answers the same question in both, so the proofs were joined by
   question number.
4. The 1879 edition prints each answer's first references in parentheses, one
   group per clause, and below the answer a note for most of those references
   that quotes the verse and adds further references. Each parenthesized group
   in the question or answer became one proof clause, in order, holding its
   references followed by the further references of each matching note. Groups
   without a note (for example Question 68) are kept as printed. A reference
   another reference of the same clause already covers is dropped.
5. References were converted to OSIS in KJV versification. A verse list such as
   "28, 29" becomes a range, and "41, 46" two references. "Jude 23", "Jude 22,
   23" and "2 John 10; 11" are verses of one-chapter books. Whole chapters ("Ex.
   20.-Deut. 5" in Question 92, "Ps. 136" in Question 122) become ranges over
   the chapter.
6. Every reference of the transcription was compared, page by page, with the
   scan's OCR (djvu.xml), and every disagreement was read on the scan; the
   transcription errors found are listed below. Each note's quoted words were
   matched against the KJV text of its reference (eBible.org KJV, listed above)
   to catch misprinted chapter or verse numbers.

Counts: 52 Lord's Days, 129 questions, 379 proof clauses, 1423 references.
Questions 23, 24, 118 and 119 have no references in the 1879 edition.

## Numbering spot check, Schaff against 1879

The question that opens each Lord's Day, and Questions 30, 60, 86 and 129:

- Q1, first of Lord's Day 1: Schaff "What is thy only comfort in life and in
  death?" / 1879 "What is thy only comfort in life and death?"
- Q3, first of Lord's Day 2: Schaff "Whence knowest thou thy misery?" / 1879
  "Whence knowest thou thy misery?"
- Q6, first of Lord's Day 3: Schaff "Did God create man thus wicked and
  perverse?" / 1879 "Did God then create man so wicked and perverse?"
- Q9, first of Lord's Day 4: Schaff "Does not God, then, wrong man by requiring
  of him in his law that which he can not perform?" / 1879 "Doth not God then do
  injustice to man by requiring from him, in his law, that which he cannot
  perform?"
- Q12, first of Lord's Day 5: Schaff "Since, then, by the righteous judgment of
  God we deserve temporal and eternal punishment, what is required that we may
  escape this punishment and be again received into favor?" / 1879 "Since then,
  by the righteous judgment of God, we deserve temporal and eternal punishment,
  is there no way by which we can escape that punishment, and be again received
  into favor?"
- Q16, first of Lord's Day 6: Schaff "Why must he be a true and sinless man?" /
  1879 "Why must he be very man, and also perfectly righteous?"
- Q20, first of Lord's Day 7: Schaff "Are all men, then, saved by Christ, as
  they have perished by Adam?" / 1879 "Are all men, then, as they perished in
  Adam, saved by Christ?"
- Q24, first of Lord's Day 8: Schaff "How are these Articles divided?" / 1879
  "How are these articles divided?"
- Q26, first of Lord's Day 9: Schaff "What dost thou believe when thou sayest: I
  believe in God the Father Almighty, Maker of Heaven and Earth?" / 1879 "What
  believest thou when thou sayest "I believe in God the Father Almighty, maker
  of Heaven and Earth?""
- Q27, first of Lord's Day 10: Schaff "What dost thou understand by the
  Providence of God?" / 1879 "What dost thou mean by the Providence of God?"
- Q29, first of Lord's Day 11: Schaff "Why is the Son of God called Jesus, that
  is, Saviour?" / 1879 "Why is the Son of God called Jesus, that is, a Saviour?"
- Q30: Schaff "Do such, then, believe in the only Saviour Jesus who seek their
  salvation and welfare of saints, of themselves, or any where else?" / 1879 "Do
  such then believe in Jesus the only Saviour, who seek their salvation and
  happiness of saints, of themselves or anywhere else?"
- Q31, first of Lord's Day 12: Schaff "Why is he called Christ, that is,
  Anointed?" / 1879 "Why is he called Christ, that is, anointed?"
- Q33, first of Lord's Day 13: Schaff "Why is he called God's only-begotten Son,
  since we also are the children of God?" / 1879 "Why is Christ called the only
  begotten Son of God, since we are also the children of God?"
- Q35, first of Lord's Day 14: Schaff "What is the meaning of Conceived by the
  Holy Ghost, born of the Virgin Mary?" / 1879 "What is the meaning of the
  words, "He was conceived by the Holy Ghost, born of the Virgin Mary?""
- Q37, first of Lord's Day 15: Schaff "What dost thou understand by the word
  Suffered?" / 1879 "What dost thou understand by the words, He suffered?"
- Q40, first of Lord's Day 16: Schaff "Why was it necessary for Christ to suffer
  death?" / 1879 "Why was it necessary for Christ to humble himself even unto
  death?"
- Q45, first of Lord's Day 17: Schaff "What benefit do we receive from the
  resurrection of Christ?" / 1879 "What does the resurrection of Christ profit
  us?"
- Q46, first of Lord's Day 18: Schaff "How dost thou understand the words, He
  ascended into Heaven?" / 1879 "How dost thou understand these words, He
  ascended into heaven?"
- Q50, first of Lord's Day 19: Schaff "Why is it added, And sitteth at the right
  hand of God?" / 1879 "Why is it added, And sitteth at the right hand of God?"
- Q53, first of Lord's Day 20: Schaff "What dost thou believe concerning the
  Holy Ghost?" / 1879 "What dost thou believe concerning the Holy Ghost?"
- Q54, first of Lord's Day 21: Schaff "What dost thou believe concerning the
  Holy Catholic Church?" / 1879 "What believest thou concerning the "Holy
  Catholic Church" of Christ?"
- Q57, first of Lord's Day 22: Schaff "What comfort does the resurrection of the
  body afford thee?" / 1879 "What comfort doth the "Resurrection of the body"
  afford thee?"
- Q59, first of Lord's Day 23: Schaff "But what does it help thee now that thou
  believest all this?" / 1879 "But what doth it profit thee now that thou
  believest all this?"
- Q60: Schaff "How art thou righteous before God?" / 1879 "How art thou
  righteous before God?"
- Q62, first of Lord's Day 24: Schaff "But why can not our good works be the
  whole or part of our righteousness before God?" / 1879 "But why cannot our
  good works be the whole or part of our righteousness before God?"
- Q65, first of Lord's Day 25: Schaff "Since, then, we are made partakers of
  Christ and all his benefits by faith only, whence comes this faith?" / 1879
  "Since then we are made partakers of Christ, and all his benefits, by faith
  only, whence doth this faith proceed?"
- Q69, first of Lord's Day 26: Schaff "How is it signified and sealed unto thee
  in holy Baptism that thou hast part in the one sacrifice of Christ on the
  cross?" / 1879 "How art thou admonished and assured, by holy baptism, that the
  one sacrifice of Christ upon the cross is of real advantage to thee?"
- Q72, first of Lord's Day 27: Schaff "Is, then, the outward washing of water
  itself the washing away of sins?" / 1879 "Is then the external baptism with
  water, the washing away of sin itself?"
- Q75, first of Lord's Day 28: Schaff "How is it signified and sealed unto thee
  in the Holy Supper that thou dost partake of the one sacrifice of Christ on
  the cross and all his benefits?" / 1879 "How art thou admonished and assured
  in the Lord's supper, that thou art a partaker of that one sacrifice of
  Christ, accomplished on the cross, of all his benefits?"
- Q78, first of Lord's Day 29: Schaff "Do, then, the bread and wine become the
  real body and blood of Christ?" / 1879 "Do then the bread and wine become the
  very body and blood of Christ?"
- Q80, first of Lord's Day 30: Schaff "What difference is there between the
  Lord's Supper and the Popish Mass?" / 1879 "What difference is there between
  the Lord's supper and the Popish mass?"
- Q83, first of Lord's Day 31: Schaff "What is the Office of the Keys?" / 1879
  "What are the keys of the kingdom of heaven?"
- Q86, first of Lord's Day 32: Schaff "Since, then, we are redeemed from our
  misery by grace through Christ, without any merit of ours, why must we do good
  works?" / 1879 "Since then we are delivered from our misery, merely of grace
  through Christ, without any merit of ours, why must we still do good works?"
- Q88, first of Lord's Day 33: Schaff "In how many things does true repentance
  or conversion consist?" / 1879 "In how many parts doth the true conversion of
  man consist?"
- Q92, first of Lord's Day 34: Schaff "What is the law of God?" / 1879 "What is
  the Law of God?"
- Q96, first of Lord's Day 35: Schaff "What does God require in the second
  commandment?" / 1879 "What doth God require in the second command?"
- Q99, first of Lord's Day 36: Schaff "What is required in the third
  commandment?" / 1879 "What is required in the third command?"
- Q101, first of Lord's Day 37: Schaff "But may we not swear by the name of God
  in a religious manner?" / 1879 "May we then swear religiously by the name of
  God?"
- Q103, first of Lord's Day 38: Schaff "What does God require in the fourth
  commandment?" / 1879 "What doth God require in the fourth command?"
- Q104, first of Lord's Day 39: Schaff "What does God require in the fifth
  commandment?" / 1879 "What doth God require in the fifth command?"
- Q105, first of Lord's Day 40: Schaff "What does God require in the sixth
  commandment?" / 1879 "What doth God require in the sixth command?"
- Q108, first of Lord's Day 41: Schaff "What does the seventh commandment teach
  us?" / 1879 "What doth the seventh command teach us?"
- Q110, first of Lord's Day 42: Schaff "What does God forbid in the eighth
  commandment." / 1879 "What doth God forbid in the eighth command?"
- Q112, first of Lord's Day 43: Schaff "What is required in the ninth
  commandment?" / 1879 "What is required in the ninth command?"
- Q113, first of Lord's Day 44: Schaff "What is required in the tenth
  commandment?" / 1879 "What doth the tenth command require of us?"
- Q116, first of Lord's Day 45: Schaff "Why is prayer necessary for Christians?"
  / 1879 "Why is prayer necessary for Christians?"
- Q120, first of Lord's Day 46: Schaff "Why has Christ commanded us to address
  God thus: Our Father?" / 1879 "Why hath Christ commanded us to address God
  thus: Our Father?"
- Q122, first of Lord's Day 47: Schaff "What is the first petition?" / 1879
  "What is the first petition?"
- Q123, first of Lord's Day 48: Schaff "What is the second petition?" / 1879
  "What is the second petition?"
- Q124, first of Lord's Day 49: Schaff "What is the third petition?" / 1879
  "What is the third petition?"
- Q125, first of Lord's Day 50: Schaff "What is the fourth petition?" / 1879
  "What is the fourth petition?"
- Q126, first of Lord's Day 51: Schaff "What is the fifth petition?" / 1879
  "What is the fifth petition?"
- Q127, first of Lord's Day 52: Schaff "What is the sixth petition?" / 1879
  "What is the sixth petition?"
- Q129: Schaff "What is the meaning of the word Amen?" / 1879 "What doth the
  word "Amen" signify?"

Every other question was also compared by its wording and its answer's, and each
matched its own number better than its neighbours'.

## Wording changed from Schaff

Digitization errors in the CCEL file, corrected:

- Q4: "great commandmen;" -> "great commandment;"
- Q18: "unto ns" -> "unto us"
- Q23: "from, thence" -> "from thence"
- Q26, Q46, Q75, Q92: "thon" -> "thou"
- Q49: "Christi ascension" -> "Christ's ascension"
- Q62: "oar righteousness" -> "our righteousness"
- Q71: "He. that believeth" -> "He that believeth"; "saved y but" -> "saved;
  but"
- Q101: "arid promote" -> "and promote"
- Q106: "teach ns" -> "teach us"
- Q115: "sp strictly" -> "so strictly"
- Q121: "eo earthly" -> "no earthly"

Q80: Schaff prints the whole question in parentheses as a later addition; the
parentheses are dropped. His square brackets around the passages added in the
third edition are kept.

## Wikisource transcription corrected to the scan

- Q27: the note to Heb 1:3 ends "Ps. 91; 10-14", not "Acts 17;27"; the note
  heading reads "Matt. 10; 29, 30"
- Q32: "Isa. 59; 21", not "Isa. 59.21"
- Q38: "Matt. 27; 19, 24", not "19, 21"
- Q48: the note heading reads "John 3; 13", not "Job 3;13"
- Q58: "Rom. 8; 23", not "Rom. 8;28"
- Q74: the question is numbered 74, not 73
- Q83: "(Matt. 18; 18", not "(Matt; 18;18)"
- Q105: the answer prints "all desire of revenge (Rom. 12; 17, 19)" once
- Q109: "Eph. 4; 29", not "Eph. 4;20"
- Q112: the note to Prov 19:9 ends "Luke 6; 37", and the note to Rev 21:8 ("All
  liars shall have their part ... Ps. 5; 6.-Prov. 12; 22.-John 8; 44.-Lev. 19;
  11.") is missing from the transcription
- Q116: "Ps. 50; 23", not "Ps. 50;53"
- Lord's Day headings: the transcription numbers the 6th and the 9th "5."; the
  scan numbers them correctly, and like the scan the transcription has no
  heading for the 7th. The order of the headings in the scan was used.

## Misprints in the 1879 references

Corrected, where the answer and the note disagree or the reference does not
exist, by the verse the note quotes:

- Q22: answer "Matt. 16; 15, 16" -> Mark 16:15-16 (the note heading and its
  quotation)
- Q25: "Matt. 12; 29" in answer and note -> Mark 12:29 (the quotation "The first
  of all the commandments is, Hear O Israel" is Mark 12:29)
- Q32: "1 Cor. 1; 21" in answer and note -> 2 Cor 1:21 (the quotation "Now he
  which stablisheth us with you in Christ, and hath anointed us, is God" is 2
  Cor 1:21)
- Q52: note heading "Luke 21; 18" -> Luke 21:28 (the answer and the quotation)
- Q65: answer "Rom. 10; 7" -> Rom 10:17 (the note heading and its quotation)
- Q74: "Mark 16; 46" in answer and note -> Mark 16:16 (Mark 16 has 20 verses;
  the quotation is Mark 16:16)
- Q99: answer "1 Pet. 3; 18" -> 1 Pet 3:15 (the note heading and its quotation)

Dropped, because the reference does not exist and nothing quoted shows which
verse was meant:

- Q52: "Matt. 29; 41" (Matthew has 28 chapters; Matt 25:41 may be meant)
- Q66: "Acts 22; 38" (Acts 22 has 30 verses; Acts 2:38 may be meant)
- Q110: "Ezra 18; 13" (Ezra has 10 chapters; Ezek 18:13 may be meant)

Kept as printed, although the note quotes another verse, because answer and note
agree on the reference:

- Q31: Heb 9:26 (the quotation is Heb 10:14)
- Q57: John 5:28-29 (the quotation is John 5:25)
- Q58: 2 Cor 5:2-3 (the quotation is 1 Pet 1:8)
- Q122: Ps 31:4 (the quotation is Ps 31:3)

## Maintainer checklist

Check each block of Lord's Days against Schaff's scan for wording and the 1879
scan (https://archive.org/details/heidelbergcatech00refo) for every reference
before merge.

- [ ] Lord's Days 1-10 (Questions 1-28)
- [ ] Lord's Days 11-20 (Questions 29-53)
- [ ] Lord's Days 21-30 (Questions 54-82)
- [ ] Lord's Days 31-40 (Questions 83-107)
- [ ] Lord's Days 41-52 (Questions 108-129)
- [ ] Every correction, dropped reading and kept misprint listed above
