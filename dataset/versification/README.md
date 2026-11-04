# Versification

`kjv.json` holds the number of verses in each chapter of the 66 books under KJV
versification: 1,189 chapters and 31,102 verses. Every verse key in the dataset
uses this numbering, and every reference is checked against this table.

The counts were exported once from the KJV versification system bundled with
`bible-passage-reference-parser` 4.0.0 (MIT,
https://github.com/openbibleinfo/Bible-Passage-Reference-Parser). The KJV text
ingest cross-checks them against the actual KJV text, chapter by chapter.
