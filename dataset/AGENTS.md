# Notes for coding agents drafting dataset changes

- Run `pnpm dataset:validate --json` after every change and fix each reported
  problem before opening a pull request. Each entry names the resource, the rule
  and the file.
- Never invent license evidence. The `license.evidence` quote must be copied
  exactly from the cited page. If you cannot find a page that states the
  license, stop and say so.
- Never mark a resource public domain because an aggregator says so. Use the
  evidence of the specific edition you ingested.
- Do not add a `permission` path unless the maintainer has supplied that
  permission file. Deciding that a license is acceptable is the maintainer's
  call, not yours.
- Use OSIS references with KJV verse numbering in `ref` and `refs` fields.
- Keep text plain. No Markdown links, HTML, URLs or invisible characters in the
  record's text fields (title, creator, edition, attribution, modifications,
  evidence quotes), and no invisible characters in content. URL fields must be
  absolute https URLs.
