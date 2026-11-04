# Changes made to STEPBible data

STEPBible asks that any change to its data be recorded and made available to
later users. This file lists every change this project makes to the
STEPBible-Data files it uses, all taken from the STEPBible-Data repository at
commit 5de0a47 (2 November 2026):

- TAGNT, the Translators Amalgamated Greek NT (Mat-Jhn and Act-Rev files)
- TAHOT, the Translators Amalgamated Hebrew OT (Gen-Deu, Jos-Est, Job-Sng and
  Isa-Mal files)
- TBESG and TBESH, the Translators Brief lexicons of Extended Strongs for Greek
  and Hebrew
- TVTMS, the Translators Versification Traditions with Methodology for
  Standardisation

The original files are unchanged at the source. The changes below apply to the
normalized data this project builds from them.

## All files

- Byte-order marks and other invisible or bidirectional control characters are
  removed.
- Only the columns listed below are kept. Spanish translations, sub-meanings,
  conjoined-word links, instance numbers, alternate Strong's numbers and
  context-sensitive English translations are dropped.

## TAGNT

- The displayed Greek word forms are replaced by the word forms of the SBL Greek
  New Testament (SBLGNT). Each SBLGNT word is aligned to the TAGNT reading the
  SBL text follows: the main reading of a row whose editions include SBL, or a
  meaning variant whose editions include SBL. That reading supplies the word's
  Strong's numbers, grammar, dictionary form, gloss and edition list.
- Where the SBLGNT spells a word differently from TAGNT, the transliteration is
  made from the SBLGNT spelling in TAGNT's style instead of being taken from
  TAGNT.
- 356 SBLGNT words have no TAGNT reading marked SBL, mostly in Mark 16:9-20 and
  John 7:53-8:11. Each takes the tags of the closest matching TAGNT reading in
  the same or a neighbouring verse, and SBL is added to that word's edition
  list.
- 11 SBLGNT words match no TAGNT reading (for example μήγε, which TAGNT divides
  into two words). They are shown without tags.
- Every word is placed on a KJV verse: the bracketed KJV reference when TAGNT
  gives one, otherwise TAGNT's NRSV reference. A curly-bracket reference and an
  edition's displacement mark become a note on the verse, such as the Byzantine
  placement of Romans 16:25-27 after Romans 14:23.
- For verses the SBL text lacks, such as Romans 16:25-27, the main reading of
  each TAGNT row on that verse is shown, with its own edition list and a note.
- Notes list the words that differ between the SBL text and the Textus Receptus
  behind the KJV. Spelling and word-order differences are not noted.
- Greek accents are converted to composed Unicode (NFC) to match the SBLGNT.
- The paragraph mark ¶ is removed from word forms.
- Words tagged with more than one number, such as the crasis κἀγώ, keep all
  their numbers joined with "+", in Strong's numbers and in grammar alike.
- A classic Strong's number is added to each word, as described under the
  lexicons.

## TAHOT

- Each word is placed on a KJV verse by mapping its Hebrew verse through TVTMS.
  Where English Bibles divide a Hebrew verse differently, or Hebrew Bibles leave
  a verse empty (Nehemiah 7:68), TAHOT's own English reference for the word
  decides.
- Psalm titles, numbered verse 0 in TAHOT, are placed at the start of verse 1
  with a note giving their Hebrew verse numbers.
- A note is added wherever Hebrew Bibles number a verse differently from the
  KJV.
- Prefix and suffix separators (/ and \) are removed from the Hebrew and its
  transliteration.
- Empty Qere rows, where the Qere omits a word, are left out.
- Each word keeps only its root's number. Prefixes and suffixes keep their place
  in the grammar code.
- The text-type code becomes a list of named sources: L becomes Leningrad, Q
  becomes Qere, R becomes Restored, X becomes LXX, and so on. Bracketed variant
  codes are dropped.
- Where the lexicon has no entry for a root number, the dictionary form and
  gloss come from TAHOT's own expanded tag for that root.

## TBESG and TBESH

- Each entry keeps its disambiguated number, dictionary form, transliteration,
  gloss and definition. The extended and unified numbers and the morphology
  summary are dropped. Where two rows share a disambiguated number, the first is
  kept.
- A classic Strong's number is added. It is the entry's own number when that
  falls in Strong's original range (G1-G5624, H1-H8674), otherwise the first
  unified number in that range, such as G1492 for G6063 (οἶδα). Leading zeros
  and letters are dropped.
- HTML in definitions is converted to plain text. Line breaks are kept, other
  markup is removed, entities are decoded, and the "__" outline markers are
  dropped.
- Greek dictionary forms are converted to composed Unicode (NFC).
- Proper-name records are left out.

## TVTMS

- Only the expanded section is read. Hebrew-tradition rows give each Hebrew
  verse its KJV verse. Rows for English verses that start on a different word,
  and Hebrew verses that are empty, mark verses whose words are divided
  differently.
