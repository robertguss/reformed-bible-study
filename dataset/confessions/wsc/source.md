# Westminster Shorter Catechism: source and verification

## Edition

The Shorter Catechism agreed upon by the Assembly of Divines at Westminster (1647). The questions and answers are those printed by Philip Schaff in The Creeds of Christendom, vol. 3 (1877), corrected to The Confession of Faith, the Larger and Shorter Catechisms, with the Scripture Proofs at Large (Edinburgh: Johnstone and Hunter, 1855) wherever the two differ, with that printing's spelling. The Scripture proofs are those of the 1855 printing (the Assembly added proofs to the Shorter Catechism in 1648), checked against the Edinburgh printing of 1894 (Johnstone, Hunter and Co.).

- Schaff's text: https://www.ccel.org/ccel/schaff/creeds3.xml (DC.Rights "Public Domain"). Schaff says he followed the Presbyterian Board's edition, compared with the London edition of 1658, and omits the proofs.
- Scan of the 1855 printing: https://archive.org/details/confessionoffait0000scot
- Scan of the 1894 printing: https://archive.org/details/confessionoffaith00chur
- The 1647 Edinburgh first printing of the catechism draft (https://archive.org/details/bim_early-english-books-1641-1700_the-humble-advice-of-the_westminster-assembly-of-_1647_0) is an early text without proofs and was not used.

Neither archive.org page for the 1855 or 1894 printing states a rights status; both were published before 1931 and are in the public domain in the United States by age.

## Files used, with the hashes of the copies checked on 2026-11-03

- https://www.ccel.org/ccel/schaff/creeds3.xml  
  SHA-256 `756adf1ddd466d237221c76b99d25d55cab7e83d08914f28a289c3b90dccddf3`
- https://archive.org/download/confessionoffait0000scot/confessionoffait0000scot_djvu.txt  
  SHA-256 `21f3ae30f4e6c0653e8697582229e526b84c61dc4279bb0a6eac680a531c3e83`
- https://archive.org/download/confessionoffaith00chur/confessionoffaith00chur_djvu.txt  
  SHA-256 `24cbbfbea9e01b24d418d54485229fd5c8f617cf7382d75fefcf31932cd0856d`
- https://raw.githubusercontent.com/NonlinearFruit/Creeds.json/master/creeds/westminster_shorter_catechism.json  
  SHA-256 `c73c894d4896c63b44dedd4a91ebc7261682850b088ccf0d33f21d9073ce880c`
- https://ebible.org/Scriptures/eng-kjv2006_vpl.zip  
  SHA-256 `e9b979989492238e2cf1b7b9b7521b24024fb0769a88db476eb28e36c1af957c`

## How the text was made

1. Questions and answers were extracted from the English column of Schaff's edition, dropping his notes and quotation marks.
2. Every word was compared with Creeds.json to find disagreements, and each disagreement was settled by the 1855 and 1894 printings' OCR; where the printings agree with the other reading, theirs was taken (listed below). Creeds.json supplied no text of its own. Capitalization and punctuation follow Schaff (for example "Scriptures" and "Word of God", where the 1855 printing has lower case); only words and spelling were reconciled to the printing.
3. The proofs were read from the 1855 printing's notes, which quote each verse in full. Every proof reference was checked against the KJV verse-count table, and references read from a printing "at large" were checked by matching the quoted Scripture words against the KJV text of the verse (eBible.org KJV, file listed above), so a misread chapter or verse number is caught when the quoted words belong to another verse. A reference whose quoted words did not match was kept only if the 1894 printing cites the same verse near that question.
4. The note groups (one per letter in the print) become the proof clauses, in order. The answers carry no clause marks in Schaff's text, so each answer is a single run and the proofs are not tied to positions in it.

Counts: 107 questions, 232 proof clauses, 445 references. Question 8 has no proof in either printing.

## Wording changed from Schaff

- Q1: 'enjoy him forever' -> 'enjoy him for ever' as the Edinburgh printings read (1855/1894)
- Q7: 'he hath fore ordained whatsoever comes' -> 'he hath foreordained whatsoever comes' as the Edinburgh printings read (1855/1894)
- Q12: 'god exercise towards man in' -> 'god exercise toward man in' as the Edinburgh printings read (1855/1894)
- Q12: 'tree of knowledge of' -> 'tree of the knowledge of' as the Edinburgh printings read (1855/1894)
- Q19: 'to all the miseries in' -> 'to all miseries in' as the Edinburgh printings read (1855/1894)
- Q19: 'of hell forever' -> 'of hell for ever' as the Edinburgh printings read (1894)
- Q21: dropped Latin text that the CCEL file carries in the English cell
- Q32: 'justification adoption sanctification and' -> 'justification adoption and sanctification and' as the Edinburgh printings read (1855)
- Q42: 'and our neighbor as ourselves' -> 'and our neighbour as ourselves' as the Edinburgh printings read (1855/1894)
- Q43: 'god which brought thee' -> 'god which have brought thee' as the Edinburgh printings read (1894)
- Q47: 'or not worshiping and glorifying' -> 'or not worshipping and glorifying' as the Edinburgh printings read (1855)
- Q47: 'the giving that worship' -> 'the giving of that worship' as the Edinburgh printings read (1855/1894)
- Q49: 'me and jceep my commandments' -> 'me and keep my commandments' as the Edinburgh printings read (1855/1894)
- Q51: 'forbiddeth the worshiping of god' -> 'forbiddeth the worshipping of god' as the Edinburgh printings read (1855/1894)
- Q63: 'commandment is honor thy father' -> 'commandment is honour thy father' as the Edinburgh printings read (1855/1894)
- Q64: unresolved: Schaff 'the honor of and performing', Creeds.json 'the honor and performing'; neither reading found in the printings' OCR, Schaff kept
- Q69: 'of our neighbor unjustly or' -> 'of our neighbour unjustly or' as the Edinburgh printings read (1855/1894)
- Q71: 'and our neighbor's chastity in' -> 'and our neighbour's chastity in' as the Edinburgh printings read (1855/1894)
- Q75: 'or our neighbor's wealth or' -> 'or our neighbour's wealth or' as the Edinburgh printings read (1855/1894)
- Q76: CCEL typo: final '?' read as '.'
- Q76: 'shalt not hear false witness' -> 'shalt not bear false witness' as the Edinburgh printings read (1855/1894)
- Q76: 'against thy neighbor' -> 'against thy neighbour' as the Edinburgh printings read (1855)
- Q77: 'and our neighbor's good name' -> 'and our neighbour's good name' as the Edinburgh printings read (1855/1894)
- Q78: 'or our neighbor's good name' -> 'or our neighbour's good name' as the Edinburgh printings read (1855/1894)
- Q79: 'covet thy neighbor's house thou' -> 'covet thy neighbour's house thou' as the Edinburgh printings read (1855/1894)
- Q79: 'covet thy neighbor's wife nor' -> 'covet thy neighbour's wife nor' as the Edinburgh printings read (1855/1894)
- Q79: 'is thy neighbor's' -> 'is thy neighbour's' as the Edinburgh printings read (1855/1894)
- Q80: 'toward our neighbor and all' -> 'toward our neighbour and all' as the Edinburgh printings read (1855/1894)
- Q81: 'of our neighbor and all' -> 'of our neighbour and all' as the Edinburgh printings read (1855)
- Q81: 'inordinate motions or affections to' -> 'inordinate motions and affections to' as the Edinburgh printings read (1855/1894)
- Q87: 'of and endeavor after new' -> 'of and endeavour after new' as the Edinburgh printings read (1855/1894)
- Q92: 'sacrament is a holy ordinance' -> 'sacrament is an holy ordinance' as the Edinburgh printings read (1855/1894)
- Q103: 'be done on earth as' -> 'be done in earth as' as the Edinburgh printings read (1855/1894)
- Q104: the CCEL text omits the petition; 'Give us this day our daily bread' supplied as the Edinburgh printings read
- Q107: 'the glory forever amen teacheth' -> 'the glory for ever amen teacheth' as the Edinburgh printings read (1855)

## Proof references corrected by hand from the printings

- Q26: Isa.33.22 added as the second note: the 1855 printing quotes it ('For the Lord is our judge'; the citation is garbled in the scan's text) and the 1894 printing cites 'Isa. xxxiii. 22' as its own letter
- Q29: Titus 3:5-6 is the second note ('a Tit. iii 5. Not by works of righteousness ... Ver. 6'); a 'Ver. 6' wrongly read as John 1:6 is dropped
- Q36: 1John.5.13 added: the 1855 printing reads 'John vy. 18' before the quotation 'These things have I written unto you that believe on the name of the Son of God' (1 John 5:13); the 1894 printing cites 1 John 5:13
- Q60: Exod.16.25 added: both printings cite 'Exod. xvi. 25' ('And Moses said, Eat that to-day'); the 1855 quotation is broken by a page break
- Q65: Matt 15:4-6: the 1855 printing misprints or misreads verse 5 as 'Ver. 6' before 'But ye say, Whosoever shall say' (Matt 15:5)
- Q87: Ezek.36.31 added: the 1894 printing cites it with Jer 31:18-19 and the 1855 notes quote it
- Q89: Rom.10.16 added from the 1894 printing's notes for this question
- Q89: Rom.1.16 added: the 1894 printing cites it last in this note and the 1855 notes quote it
- Q95: Acts 2:38-39 added: the 1855 printing reads 'Acts ii. 388. [See before.] Ver. 39'
- Q107: last note is 1 Cor 14:16 and Rev 22:20-21 (both printings); '1 Cor 16:23' was a misreading of Rev 22:21

## Readings dropped

- Q29: 'Ver. 6' (read as John.1.6) dropped: the 1855 quotation does not match that verse and the 1894 printing does not cite it near this question (resolved by the hand correction above)
- Q36: 'John vy. 18' could not be read as a reference in the 1855 printing (resolved by the hand correction above)
- Q60: 'Exod. xvi. 25' (read as Exod.16.25) dropped: the 1855 quotation does not match that verse and the 1894 printing does not cite it near this question (resolved by the hand correction above)
- Q65: 'Ver. 6' (read as Matt.15.6) dropped: the 1855 quotation does not match that verse and the 1894 printing does not cite it near this question (resolved by the hand correction above)
- Q65: 'Ver. 3' (read as Matt.15.3) dropped: the 1855 quotation does not match that verse and the 1894 printing does not cite it near this question (resolved by the hand correction above)
- Q95: 'Acts ii. 388' could not be read as a reference in the 1855 printing (resolved by the hand correction above)
- Q95: 'Ver. 39' could not be read as a reference in the 1855 printing (resolved by the hand correction above)

## Verses the 1894 printing places under a neighbouring question

The 1894 OCR runs two columns together, so its question boundaries are unreliable. These verses appear in its notes near the question named but are recorded under the question the 1855 printing gives them:

- Q9: Ps.103.19 (recorded under Q11)
- Q9: Matt.10.29 (recorded under Q11)
- Q12: Rom.5.12 (recorded under Q16, Q17, Q18)
- Q13: 1Cor.15.22 (recorded under Q16)
- Q13: Rom.5.19 (recorded under Q18, Q33)
- Q13: Eph.2.2 (recorded under Q18, Q19)
- Q22: Ps.2.8 (recorded under Q23)
- Q22: Ps.2.9 (recorded under Q23)
- Q22: John.1.18 (recorded under Q24)
- Q26: Isa.33.22 (recorded under Q26)
- Q28: Eph.2.8 (recorded under Q30)
- Q28: Eph.3.17 (recorded under Q30)
- Q28: 2Tim.1.9 (recorded under Q31)
- Q29: Titus.3.5 (recorded under Q29)
- Q36: 1John.5.13 (recorded under Q36)
- Q40: 1Pet.1.15 (recorded under Q44)
- Q42: Matt.4.10 (recorded under Q46)
- Q56: 1Cor.16.1 (recorded under Q59)
- Q56: 1Cor.16.2 (recorded under Q59)
- Q56: Exod.20.10 (recorded under Q57, Q60)
- Q56: Exod.16.26 (recorded under Q60)
- Q57: Exod.16.26 (recorded under Q60)
- Q64: Deut.5.16 (recorded under Q66)
- Q75: 1Tim.1.5 (recorded under Q80)
- Q78: 1Kgs.21.4 (recorded under Q81)
- Q78: Jas.3.14 (recorded under Q81)
- Q78: Jas.3.16 (recorded under Q81)
- Q87: Ezek.36.31 (recorded under Q87)
- Q89: Rom.1.16 (recorded under Q89)
- Q101: 2Sam.15.25 (recorded under Q103)
- Q102: Ps.103.20 (recorded under Q103)
- Q102: Prov.30.9 (recorded under Q104)
- Q102: 1Tim.4.4 (recorded under Q104)
- Q102: 1Tim.4.5 (recorded under Q104)
- Q107: Rev.22.20 (recorded under Q102, Q107)
- Q107: Rev.22.21 (recorded under Q107)

## Gaps

- Q51: Deut.5.17 is quoted in the 1894 printing's notes for this question but not found in the 1855 printing's; not added
- The print's clause letters are not recorded, and no clause is tied to a position in the answer text.

## Maintainer checklist

Check each block of questions against the 1855 scan (https://archive.org/details/confessionoffait0000scot) before merge: wording, the number and order of note letters, and every reference.

- [ ] Questions 1-20
- [ ] Questions 21-40
- [ ] Questions 41-60
- [ ] Questions 61-80
- [ ] Questions 81-100
- [ ] Questions 101-107
- [ ] Every hand correction and dropped reading listed above
