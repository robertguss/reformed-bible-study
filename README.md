# Reformed Bible Study

A free, open-source Bible study app built from openly licensed Reformed
resources: public domain commentaries, the Reformed confessions with their proof
texts, cross-references, and Greek and Hebrew data. Readers study a passage with
panels they arrange themselves, and their own AI agents can reach the same
resources over MCP.

## Development

Requires Node 24 (see `.nvmrc`) and pnpm through Corepack.

```sh
corepack enable pnpm
pnpm install
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
```

Dependencies are pinned exactly in `pnpm-workspace.yaml`. Packages published
less than three days ago are refused unless listed by exact version under
`minimumReleaseAgeExclude`, and each such exception is removed once it ages past
the window.

## License

The code license has not been chosen yet. No license is granted until a LICENSE
file is added.
