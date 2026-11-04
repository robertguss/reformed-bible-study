# Dataset

The open, passage-indexed corpus behind the app: Bible translations,
commentaries, confessions, cross-references and original-language data.
Everything here is public domain or openly licensed, and every resource records
where it came from and under what terms.

## Layout

- `resources/<id>/resource.json` is the record for one resource. Every file
  under `resources/<id>/` or `confessions/<id>/` belongs to the resource with
  that id.
- `confessions/<id>/` holds transcribed confession text and proof texts.
- `permissions/` holds written permissions for any resource whose license is not
  on the allowlist.
- `versification/` holds the KJV verse-count table that every reference is
  checked against.
- `REUSE.toml` and `LICENSES/` map each resource to its license text.

## The resource record

| Field                         | Meaning                                                                                                                                     |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                          | Lowercase words joined by hyphens. Must match the directory name.                                                                           |
| `kind`                        | `translation`, `commentary`, `confession`, `cross-references`, `original-language` or `lexicon`.                                            |
| `title`, `creator`, `edition` | Plain text naming the work, its author and the exact edition used.                                                                          |
| `language`                    | A two- or three-letter language code, such as `en`, `grc` or `hbo`.                                                                         |
| `scope`                       | Optional list of book ids the work itself covers. Leave it out when the work covers the whole Bible.                                        |
| `source`                      | The https page the resource came from, the date it was retrieved, and each downloaded file with its SHA-256 hash.                           |
| `license`                     | An SPDX license id and the evidence for it: a URL and the exact quote that states the license.                                              |
| `attribution`                 | The credit line shown with every item. Required for CC BY, CC BY-SA and MIT.                                                                |
| `modifications`               | What the project changed from the source.                                                                                                   |
| `permission`                  | Path of a written permission under `permissions/`. Required for any license outside the allowlist.                                          |
| `surfaces`                    | Where the resource may appear: `web`, `api`, `mcp`, `dataset`. Only resources allowing both `web` and `dataset` become public static files. |
| `status`                      | `{ "state": "active" }`, or `{ "state": "withdrawn", "reason": "..." }`. Withdrawn resources are never deleted or renamed.                  |

Text fields are plain text. They may not contain Markdown links, HTML tags, URLs
or invisible characters. URL fields must use https.

Allowed licenses without a permission record: `CC-PDM-1.0` for public domain by
age, `CC0-1.0`, `CC-BY-4.0`, `CC-BY-SA-4.0`, `Unlicense`, `MIT`, and
`LicenseRef-BSB-Dedication`.

## References in content

Content files are JSON. Any field named `ref` holds one OSIS reference such as
`Rom.8.28` or `Rom.8.28-Rom.8.30`, and any field named `refs` holds a list of
them. Every reference uses KJV verse numbering and must exist in
`versification/kjv.json`. Within one commentary, no two `ref` sections may cover
the same verse. A commentary section runs from its own verse to the verse before
the next section in its book, or to the end of its own chapter, whichever comes
first. A section on a whole chapter, such as the introduction to a psalm, opens
the chapter's first verse section.

## Proof texts in confessions

A confession article stores its text as paragraphs of runs and its proof texts
as a list. The n-th proof text in an article supports the clause that ends the
n-th run, counted across the article's paragraphs in order. A Shorter Catechism
answer is a single run with one or more proof texts.

## Ingest

```sh
pnpm dataset:ingest all            # or: translations, cross-references, original-language, calvin, confessions
```

Ingest downloads each pinned source into `.cache/sources/`, checks its SHA-256,
and writes normalized content to `.cache/normalized/<resource id>/`. Neither
directory is committed.

## The license gate

```sh
pnpm dataset:validate          # human-readable report
pnpm dataset:validate --json   # one entry per problem, with resource id and rule name
```

The gate runs on every pull request and again before each release, and a pull
request cannot merge while it fails. See `CONTRIBUTING.md` for adding a
resource.
