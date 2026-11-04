# Westminster Larger Catechism: source and verification

## Edition

The Larger Catechism agreed upon by the Assembly of Divines at Westminster
(1647), with the Scripture proofs, as printed in The Confession of Faith, the
Larger and Shorter Catechisms, with the Scripture Proofs at Large (Edinburgh:
Johnstone and Hunter, 1855). Its wording and proofs were checked against a
second Edinburgh printing of the same work (Johnstone, Hunter and Co., 1894).

- Scan of the 1855 printing:
  https://archive.org/details/confessionoffait0000scot
- Scan of the 1894 printing: https://archive.org/details/confessionoffaith00chur
- A 17th-century print of the Larger Catechism with proofs at large (London:
  Griffin and Rothwel, 1658),
  https://archive.org/details/humbleadviceofas200west, whose item page states
  "NOT_IN_COPYRIGHT". Its OCR was too damaged to use for checking; it is cited
  as license evidence for the work and is the scan to consult for 17th-century
  readings.

Neither archive.org page for the 1855 or 1894 printing states a rights status.
Both were published before 1931 and are in the public domain in the United
States by age.

## Files used, with the hashes of the copies checked on 2026-11-03

- https://archive.org/download/confessionoffait0000scot/confessionoffait0000scot_djvu.txt  
  SHA-256
  `21f3ae30f4e6c0653e8697582229e526b84c61dc4279bb0a6eac680a531c3e83`
- https://archive.org/download/confessionoffaith00chur/confessionoffaith00chur_djvu.txt  
  SHA-256
  `24cbbfbea9e01b24d418d54485229fd5c8f617cf7382d75fefcf31932cd0856d`
- https://archive.org/download/humbleadviceofas200west/humbleadviceofas200west_djvu.txt  
  SHA-256
  `a226a15039032cb23b270fc848aac6197dff9186560d52e6981969bed409c82e`
- https://raw.githubusercontent.com/NonlinearFruit/Creeds.json/master/creeds/westminster_larger_catechism.json  
  SHA-256
  `755274a3ba67aa840021dcefde55e357851a95f87daab52bcd2407d131d7cab5`
- https://ebible.org/Scriptures/eng-kjv2006_vpl.zip  
  SHA-256 `e9b979989492238e2cf1b7b9b7521b24024fb0769a88db476eb28e36c1af957c`

## How the text was made

No clean public-domain digital text of the Larger Catechism with its proofs was
found. CCEL's Larger Catechism (westminster2) is a modernized text ("How does it
appear") without proofs, and Schaff omits the Larger Catechism. So:

1. Questions, answers, clause marks and proof references were drafted from the
   structure of Creeds.json.
2. The wording of every question and answer was compared word by word with the
   OCR of both Edinburgh printings, with the proof footnotes filtered out. Where
   both printings (or one, for an archaic verb form) read differently from the
   draft, the printings' reading was taken: archaic verb forms ("pleaseth",
   "knoweth", "requireth" and others), "for ever", "Old and New Testament" in
   question 3, and the printings' British spelling (honour, neighbour, labour,
   favour, endeavour, behaviour, saviour, worshipping, fulness, offence)
   throughout.
3. Every draft reference was checked against both printings: a reference counts
   as confirmed when a printing cites it, or quotes its KJV words, among the
   notes of that question or its neighbours. Every proof reference was checked
   against the KJV verse-count table, and references read from a printing "at
   large" were checked by matching the quoted Scripture words against the KJV
   text of the verse (eBible.org KJV, file listed above), so a misread chapter
   or verse number is caught when the quoted words belong to another verse.
4. References the printings do not confirm were replaced when the printings cite
   a verse a one-digit misprint away, or the same verses in another chapter,
   near that question (listed below as automatic matches), corrected by hand
   from the printings, or removed.
5. Verses that both printings quote in the notes of a single question but the
   draft lacks were added to the clause citing a neighbouring verse of the same
   chapter, or listed as unplaced.

Each answer is one paragraph of text runs. A run ends where a proof note
attaches in the draft's clause marks, so the n-th proof belongs to the clause
ending the n-th run. The clause marks were not checked against the print's
letters (see the checklist).

Counts: 196 questions, 1303 proof clauses, 2639 references.

## Wording changed to the printings' reading

- Q3: 'Testaments' -> 'Testament' as both printings read
- Q13: 'pleases' -> 'pleaseth' as the printings read
- Q25: 'consists' -> 'consisteth' as the printings read
- Q73: 'applies' -> 'applieth' as the printings read
- Q88: 'knows' -> 'knoweth' as the printings read
- Q99: 'reaches' -> 'reacheth' as the printings read
- Q101: 'delivers' -> 'delivereth' as the printings read
- Q116: 'requires' -> 'requireth' as the printings read
- Q155: 'makes' -> 'maketh' as the printings read
- Q182: 'helps' -> 'helpeth' as the printings read
- Q196: 'teaches' -> 'teacheth' as the printings read

## Proof references corrected or added

- Q4 proof 5: Acts.23.28 -> Acts.18.28: both printings cite 'Acts xviii. 28'
  ('For he mightily convinced the Jews')
- Q7 proof 4: 1Tim.6.1 -> 1Tim.6.15: the scaffold's reference is not quoted near
  this question in either printing; 1Tim.6.15 is cited there (automatic match)
- Q15 proof 1: Heb.11.8 -> Heb.11.3: the scaffold's reference is not quoted near
  this question in either printing; Heb.11.3 is cited there (automatic match)
- Q18 proof 3: Heb.1.8 -> Heb.1.3: the scaffold's reference is not quoted near
  this question in either printing; Heb.1.3 is cited there (automatic match)
- Q18 proof 6: Isa.43.14 -> Isa.63.14: the scaffold's reference is not quoted
  near this question in either printing; Isa.63.14 is cited there (automatic
  match)
- Q32 proof 5: the scaffold marks clause 5 twice; the first mark (after 'saving
  graces') is dropped so the clause runs to 'holy obedience'. The print has
  separate letters here and after 'interest them in him'
- Q32 proof 5: 2Cor.5.14-2Cor.5.15 and Eph.2.10 added: both printings quote them
  in this question's notes, for the letter after 'holy obedience', which the
  scaffold merged into clause 5
- Q45 proof 1: Isa.4.4-Isa.4.5 -> Isa.55.4-Isa.55.5: the scaffold's reference is
  not quoted near this question in either printing; Isa.55.4-Isa.55.5 is cited
  there (automatic match)
- Q56 proof 2: Matt.14.30 -> Matt.24.30: the scaffold's reference is not quoted
  near this question in either printing; Matt.24.30 is cited there (automatic
  match)
- Q68 proof 4: Acts.18.25-Acts.18.27 -> Acts.28.25-Acts.28.27: the scaffold's
  reference is not quoted near this question in either printing;
  Acts.28.25-Acts.28.27 is cited there (automatic match)
- Q71 proof 2: 2Tim.2.5-2Tim.2.6 -> 1Tim.2.5-1Tim.2.6: both printings cite '1
  Tim. ii. 5' ('For there is one God') in this question's notes
- Q74 proof 4: 2Cor.4.18 -> 2Cor.6.18: the 1894 Edinburgh printing (Johnstone,
  Hunter and Co.) cites '2 Cor. vi. 18' ('And will be a Father unto you') in
  this question's notes
- Q83 proof 1: Eph.2.6 added: quoted in both printings within this question's
  notes
- Q93 proof 2: Acts.14.16 -> Acts.24.16: the scaffold's reference is not quoted
  near this question in either printing; Acts.24.16 is cited there (automatic
  match)
- Q98 proof 2: Matt.22.39 added: quoted in both printings within this question's
  notes
- Q99 proof 3: 1Tim.6.1 -> 1Tim.6.10: the scaffold's reference is not quoted
  near this question in either printing; 1Tim.6.10 is cited there (automatic
  match)
- Q104 proof 20: Jer.7.28 -> Jer.7.23: the 1894 Edinburgh printing (Johnstone,
  Hunter and Co.) cites 'Jer. vii. 23' ('But this thing commanded I them') in
  this question's notes
- Q104 proof 21: 1John.3.2 -> 1John.3.22: the scaffold's reference is not quoted
  near this question in either printing; 1John.3.22 is cited there (automatic
  match)
- Q110 proof 2: Rev.20.3-Rev.20.4 -> Rev.15.3-Rev.15.4: the scaffold's reference
  is not quoted near this question in either printing; Rev.15.3-Rev.15.4 is
  cited there (automatic match)
- Q113 proof 25: Isa.22.18 -> Isa.22.13: the 1894 Edinburgh printing (Johnstone,
  Hunter and Co.) cites 'Isa. xxii. 13' ('And behold joy and gladness')
- Q114 proof 4: 1Sam.3.18 -> 1Sam.3.13: the scaffold's reference is not quoted
  near this question in either printing; 1Sam.3.13 is cited there (automatic
  match)
- Q116 proof 1: Deut.5.18 -> Deut.5.13: the scaffold's reference is not quoted
  near this question in either printing; Deut.5.13 is cited there (automatic
  match)
- Q119 proof 2: Acts.15.7 -> Acts.20.7: the scaffold's reference is not quoted
  near this question in either printing; Acts.20.7 is cited there (automatic
  match)
- Q119 proof 2: Acts.15.9 -> Acts.20.9: the scaffold's reference is not quoted
  near this question in either printing; Acts.20.9 is cited there (automatic
  match)
- Q135 proof 7: 1Sam.24.2 -> 1Sam.24.12: the scaffold's reference is not quoted
  near this question in either printing; 1Sam.24.12 is cited there (automatic
  match)
- Q138 proof 3: 1Pet.2.3 -> 1Pet.4.3: the scaffold's reference is not quoted
  near this question in either printing; 1Pet.4.3 is cited there (automatic
  match)
- Q138 proof 6: Acts.24.25 added: quoted in both printings within this
  question's notes
- Q142 proof 21: Ps.42.10 -> Ps.62.10: the 1894 Edinburgh printing (Johnstone,
  Hunter and Co.) cites 'Ps. lxii. 10' ('If riches increase, set not your
  heart')
- Q145 proof 5: Ps.3.1-Ps.3.4 -> Ps.52.1-Ps.52.4: the 1855 Edinburgh printing
  (Johnstone and Hunter) quotes Ps 52:1-4 ('Why boastest thou thyself in
  mischief') after Ps 12:3-4 in this clause
- Q145 proof 9: 2Tim.4.6 -> 2Tim.4.16: the scaffold's reference is not quoted
  near this question in either printing; 2Tim.4.16 is cited there (automatic
  match)
- Q151 proof 26: 1Tim.6.1 -> 1Tim.6.10: the scaffold's reference is not quoted
  near this question in either printing; 1Tim.6.10 is cited there (automatic
  match)
- Q151 proof 32: Jer.5.8 -> Jer.5.3: the scaffold's reference is not quoted near
  this question in either printing; Jer.5.3 is cited there (automatic match)
- Q151 proof 38: Jer.13.5-Jer.13.6 -> Jer.42.5-Jer.42.6: the scaffold's
  reference is not quoted near this question in either printing;
  Jer.42.5-Jer.42.6 is cited there (automatic match)
- Q151 proof 38: Jer.13.20-Jer.13.21 -> Jer.42.20-Jer.42.21: the scaffold's
  reference is not quoted near this question in either printing;
  Jer.42.20-Jer.42.21 is cited there (automatic match)
- Q151 proof 45: Prov.7.14 added: quoted in both printings within this
  question's notes
- Q151 proof 45: Prov.7.15 added: quoted in both printings within this
  question's notes
- Q157 proof 4: Deut.17.10 -> Deut.17.19: the scaffold's reference is not quoted
  near this question in either printing; Deut.17.19 is cited there (automatic
  match)
- Q157 proof 8: 2Chr.24.21 -> 2Chr.34.21: the scaffold's reference is not quoted
  near this question in either printing; 2Chr.34.21 is cited there (automatic
  match)
- Q157 proof 10: Neh.7.6 -> Neh.8.6: the 1894 Edinburgh printing (Johnstone,
  Hunter and Co.) quotes Neh 8:6 ('And Ezra blessed the Lord') in the last
  clause
- Q157 proof 10: Neh.7.8 -> Neh.8.8: the 1894 Edinburgh printing (Johnstone,
  Hunter and Co.) quotes Neh 8:8 ('So they read in the book') in the last clause
- Q172 proof 1: Isa.1.10 -> Isa.50.10: the scaffold's reference is not quoted
  near this question in either printing; Isa.50.10 is cited there (automatic
  match)
- Q172 proof 4: Isa.1.10 -> Isa.50.10: the scaffold's reference is not quoted
  near this question in either printing; Isa.50.10 is cited there (automatic
  match)
- Q174 proof 1: Heb.12.18 -> Heb.12.28: the scaffold's reference is not quoted
  near this question in either printing; Heb.12.28 is cited there (automatic
  match)
- Q174 proof 11: Phil.1.16 -> Phil.3.9: the 1894 Edinburgh printing (Johnstone,
  Hunter and Co.) cites 'Phil. iii. 9' ('And be found in him')
- Q174 proof 14: Jer.1.5 -> Jer.50.5: the scaffold's reference is not quoted
  near this question in either printing; Jer.50.5 is cited there (automatic
  match)
- Q174 proof 14: Ps.1.5 -> Ps.50.5: the 1894 Edinburgh printing (Johnstone,
  Hunter and Co.) quotes Ps 50:5 ('Gather my saints together')
- Q175 proof 2: 2Chr.30.16 -> 2Chr.30.22-2Chr.30.23, 2Chr.30.25-2Chr.30.26: both
  printings cite '2 Chron. xxx. 21, 22, 23, 25, 26'

## Proof references removed (not found in either printing)

- Q142 proof 2: Ps.42.10 -> removed: the 1894 Edinburgh printing (Johnstone,
  Hunter and Co.) gives this clause Eph 4:28 alone; Ps 62:10 belongs to the next
  clause

## Gaps

- Q64: Eph.1.10 is quoted in both printings within this question's notes but not
  in the scaffold; not added (clause unknown)
- Q138: 1Pet.3.2 is quoted in both printings within this question's notes but
  not in the scaffold; not added (clause unknown)
- Q145: Deut.13.8 is quoted in both printings within this question's notes but
  not in the scaffold; not added (clause unknown)
- Q147: Rom.12.15 is quoted in both printings within this question's notes but
  not in the scaffold; not added (clause unknown)
- Questions 100 and 188 carry no proofs: neither printing has notes for them.
- Clause marks follow the draft. The print sometimes has more letters than the
  draft has marks (question 32 has letters after "interest them in him" and
  after "saving graces" that the draft lacks).

## Maintainer checklist

Check each block of questions against the 1855 scan
(https://archive.org/details/confessionoffait0000scot) before merge: wording,
the place of each proof note, and every reference.

- [ ] Questions 1-20
- [ ] Questions 21-40
- [ ] Questions 41-60
- [ ] Questions 61-80
- [ ] Questions 81-100
- [ ] Questions 101-120
- [ ] Questions 121-140
- [ ] Questions 141-160
- [ ] Questions 161-180
- [ ] Questions 181-196
- [ ] Every automatic match and hand correction listed above
