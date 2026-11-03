# Operations

How the app is deployed to Cloudflare, what the owner provides, and how to check a deploy.

## What runs where

Each stage is one Cloudflare Worker declared in `apps/infra/alchemy.run.ts`:

| Stage | Worker | URL |
|---|---|---|
| preview | `reformed-bible-preview` | https://reformed-bible-preview.howtocode.workers.dev |
| production | `reformed-bible` | https://reformed-bible.howtocode.workers.dev |

The Worker's static assets hold the web build, the locked dataset release's files under `/data/<release>/`, and the discovery files (`/llms.txt`, `/llms-full.txt`, `/.well-known/mcp.json`). Assets are served without invoking the Worker. The Worker answers only `/v1/*`, `/mcp`, the OAuth discovery probes under `/.well-known/`, and `/data/*` paths outside the locked release, which get a 404 instead of the app page.

The Worker's bindings:

- `API_RATE_LIMIT`, `MCP_RATE_LIMIT` and `VENDOR_RATE_LIMIT`: rate-limit namespaces at 120, 60 and 600 requests a minute. Each stage gets its own namespace ids, derived from the stage and binding name.
- `LEGACY_MCP`: the Durable Object that keeps sessions for MCP clients on protocol revisions older than 2026-07-28.
- `MCP_SESSION_SECRET`: the key that signs those sessions' ids. Alchemy generates it once per stage and keeps it in its state; it is never in the repository or the CI secrets.
- `SITE_ORIGIN`: the stage's public origin, which `/mcp` accepts as a browser `Origin`.

Alchemy keeps deployment state in the account's `alchemy-state-store` Worker, so CI and a laptop share it.

## Owner setup (once)

1. **Workers Paid.** Enable it under Workers & Pages > Plans. The rate limits above assume it: on the free plan, one caller staying inside its own limits can spend the 100,000 daily requests for everyone.
2. **Cloudflare API token for CI.** Create a token scoped to this account with:
   - Account > Workers Scripts > Edit
   - Account > Secrets Store > Edit (Alchemy's state store keeps its credentials there)
   - Account > Account Settings > Read
   - Account > Notifications > Edit (the production usage alert)
3. **GitHub environments.** Create `preview` and `production`, each limited to the `main` branch. Give `production` required reviewers.
4. **GitHub secrets and variables.**
   - Repository variable `CLOUDFLARE_ACCOUNT_ID`: `3be56c3c31972ae39fd3478cdd4eb34f`
   - Secret `CLOUDFLARE_API_TOKEN` in both environments: the token from step 2
   - Secret `ALERT_EMAIL` in `production`: where the usage alert is sent

## Deploying

`.github/workflows/deploy.yml` runs on every push to `main`. It deploys preview, runs the smoke probes against it, then waits for a reviewer before deploying production and probing that.

Each job:

1. downloads the archive named in `dataset/release.lock.json` from the GitHub release;
2. runs `pnpm dataset:from-archive`, which rebuilds the static data from the archive and fails unless the archive matches the lock's SHA-256 and the rebuild reproduces the locked release id. Sources are never re-ingested at deploy time;
3. builds the web app, then `pnpm deploy:assemble --stage <stage>` collects the web build, the release data and the stage's discovery files into `dist/site/<stage>`;
4. runs `alchemy deploy --stage <stage>`;
5. runs `pnpm deploy:smoke --stage <stage>`.

A new dataset release reaches the site when its lock PR merges, because that merge is a push to `main`.

To deploy preview from a laptop, with `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` set:

```sh
gh release download "dataset-$(node -p "require('./dataset/release.lock.json').release")" \
  --pattern "$(node -p "require('./dataset/release.lock.json').archive")" --dir dist/release
pnpm dataset:from-archive
pnpm --filter @reformed-bible/web build
pnpm deploy:assemble --stage preview
pnpm --filter @reformed-bible/infra exec alchemy plan --stage preview
pnpm --filter @reformed-bible/infra exec alchemy deploy --stage preview
pnpm deploy:smoke --stage preview
```

Read the plan before deploying. Deploy production only through the workflow.

## Smoke probes

`pnpm deploy:smoke --stage <stage>` checks, against the stage's origin:

- `/` and a deep link such as `/romans/8/28` return the app page;
- `/v1/openapi.json` and `/v1/passages/Rom.8.28?translation=bsb` answer;
- `/llms.txt` and `/.well-known/mcp.json` name the stage's own origin;
- the locked release's `catalog.json` is served, and a data path from another release returns 404;
- an MCP `tools/list` on protocol 2026-07-28 lists the tools.

To confirm that page views and data reads do not invoke the Worker, send only static requests for a full minute and check that minute in the Worker's metrics (Workers & Pages > the Worker > Metrics, or the `workersInvocationsAdaptive` GraphQL dataset). It should show no invocations.

## Rotating the MCP session key

Rename `McpSessionSecret` in `apps/infra/alchemy.run.ts` (for example to `McpSessionSecret2`) and deploy. Alchemy generates a new key and the Worker rejects every session id signed with the old one, so older-protocol clients reconnect and start a new session. Clients on 2026-07-28 are stateless and unaffected.

## Not yet in place

- **Custom domain.** Both stages use workers.dev. To move a stage, add the zone to the account, give the Worker a `domain` in `alchemy.run.ts`, and point `origin` in `apps/infra/src/stage.ts` at it.
- **Firewall rate-limit rule.** Cloudflare's WAF rules belong to a zone, and workers.dev is not one. Once a custom domain is attached, add a rate-limit rule on `/v1`, `/mcp` and `/.well-known/*` that blocks an address sending more than 100 requests in 10 seconds. The Worker's own limits still make every normal throttling decision.
- **Public dataset archive.** The discovery files link the archive on the repository's GitHub release. While the repository is private, that link fails for everyone else.
