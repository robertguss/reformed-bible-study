# Henry and Jamieson-Fausset-Brown module excerpts

Entries copied byte for byte from two CrossWire SWORD modules, one file per
slot. `mhc/` is from `MHC.zip` (Matthew Henry's Complete Commentary, version
2.2, SHA-256 `6bcb936873ca144e317805e5c1677940fd86e2403f7c14517752e44f25c8882b`)
and `jfb/` from `JFB.zip` (Jamieson-Fausset-Brown, version 3.0, SHA-256
`78eae01d4e4cea96aec496b4d4f149b582d6d7316c56c0b1f9ef07f8f784b2a6`). A file
named `<slot>-unindexed.xml` holds the bytes after that slot's entry that no
slot points at.

## What the modules look like

- Both `.conf` files say `ModDrv=zCom4`. Each `.bzv` slot is 12 bytes: block
  number, offset and size, each 32-bit. Slot counts match KJV versification
  (24,115 Old Testament, 8,246 New Testament). Entries reach 100,755 bytes in
  Henry and 107,688 in Jamieson-Fausset-Brown, past what a 16-bit size holds.
- No entry has a `div type="section"` marker. An entry's verse is its slot.
- Henry keys a comment on a group of verses by linking each verse's slot to one
  entry. `mhc/Prov.3.1.xml` is linked from Proverbs 3:1 to 3:6, and
  `mhc/Prov.3.7.xml` from 3:7 to 3:12. Nearly every verse slot is filled, so the
  groups tile each chapter.
- Jamieson-Fausset-Brown fills about four verse slots in five. Its links are
  also ranges, but the comments on the later verses of a link sit unindexed
  after the entry, as `jfb/Gen.4.11-unindexed.xml` holds the comment on Genesis
  4:12 after the entry linked from 4:11 to 4:12. Henry has six such places.
- A chapter slot holds the chapter's start. In Henry it opens the chapter's
  `div type="introduction"`, where the chapter has one, which closes in the
  first verse entry (`mhc/Prov.3.xml`). In Jamieson-Fausset-Brown it is usually
  empty, but in eleven chapters it holds the whole chapter, as `jfb/Matt.24.xml`
  does.
- A book slot holds only the book's start and title (`mhc/Obad.xml`,
  `jfb/Exod.xml`).
- The book's front matter comes before the first chapter's own text, in the
  chapter slot or before the first verse in the first verse entry. Henry prints
  a volume's preface and the book's introduction, then opens the chapter's
  introduction division (`mhc/Obad.1.xml`). Jamieson-Fausset-Brown prints the
  book's introduction, then the chapter title, such as `CHAPTER 1`, then a
  heading naming the passage (`jfb/Exod.1.1.xml`). Its books of one chapter have
  no chapter title, so their introduction runs to the first comment
  (`jfb/Phlm.1.1.xml`).
- Passage headings are `title type="x-s3"` (and `x-s4` in Henry). Titles of type
  `main`, `x-ms`, `x-IS`, `x-s` and `x-s2` name a volume, book or chapter.
- A first verse entry can start after verse 1. Jamieson-Fausset-Brown's heading
  for Genesis 6 covers 6:1 to 22, but its first comment is on 6:2
  (`jfb/Gen.6.2.xml`). In Joshua 18, 1 Samuel 25 and 2 Samuel 22, Henry's
  comment on verse 1 opens the entry of verse 2.
- Henry's footnotes, `note placement="foot"`, all sit in front matter, in the
  prefaces before Job, Isaiah and Matthew. Jamieson-Fausset-Brown has none.
