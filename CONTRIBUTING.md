# Contributing

Thank you for helping build a free Reformed study library. Most contributions
add or correct a resource in `dataset/`, and you do not need to run the app to
make one.

## Adding a resource

1. Find an edition whose source page states that it is public domain or openly
   licensed. Copy the exact sentence that says so.
2. Create `dataset/resources/<id>/resource.json` following the record described
   in `dataset/README.md`, with the quote as license evidence.
3. Add the content, or an ingest recipe that downloads the source from a pinned
   URL with its SHA-256 hash.
4. Run `pnpm dataset:validate` and fix anything it reports.
5. Open a pull request. The maintainer checks the license evidence before
   merging.

Editions from sites that restrict republishing, such as CCEL or Monergism
editions without a public-domain notice, need a written permission from the
publisher, saved under `dataset/permissions/`.

## Checks every pull request runs

`pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test` and
`pnpm dataset:validate`. Pull request checks run without secrets. In the
repository settings, the CI check should be marked required for merging into
`main`.

## Formatting

`pnpm install` turns on a git pre-commit hook (`.githooks/pre-commit`) that
formats staged files with oxfmt and stages the result. Markdown prose wraps at
80 characters; tables, code blocks and headings keep their lines. A file with
unstaged edits as well is only checked, so the hook never stages work you left
out. Run `pnpm format` to format everything by hand.
