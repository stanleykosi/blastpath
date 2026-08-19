# BlastPath manual live test

Status: pending manual verification.

Run the cloud procedure after the non-live checks pass. It uses Vercel for the application and Railway for HydraDB. Automated cloud live checks are deferred until an operator selects a trusted test runner.

## Cloud procedure: Vercel plus Railway

This is the recommended live procedure when Docker is not available on the test machine.

### C1. Prerequisite checks

Confirm that you have:

- a GitHub repository that contains this project;
- a Vercel account connected to that repository;
- a Railway account connected to that repository;
- permission to create a Railway Volume and one generated public HTTPS domain;

Do not put a HydraDB token in GitHub workflow text, a Vercel public variable, or a browser variable.

### C2. Create the Railway HydraDB service

In Railway, create a project and add a service from the GitHub repository. Name the service `hydradb`. Set its config file path to `/railway.json`. Do not select the Docker Image source. Railway builds the wrapper from the pinned image `ghcr.io/hydra-db/hydradb:0.1.1`.

The wrapper creates the token file from the `HYDRADB_TOKEN` Railway secret. It does not save the secret in the repository.
After Railway mounts an empty Volume, the wrapper also creates `/data/store` and `/data/cache` before HydraDB starts.

If the pinned GHCR image is private, add a read-only GitHub Container Registry credential in Railway before the first build. Do not change the image tag. If the image is not available to the Railway builder, stop and record the pull error. Do not replace the image with an unapproved image.

### C3. Add the Railway Volume

Add one persistent Volume to the HydraDB service with mount path:

```text
/data
```

The wrapper uses `/data/store` and `/data/cache` inside this single Volume. Do not add a second Volume for the cache.

### C4. Add the private HydraDB variables

Add these service variables. Add `HYDRADB_TOKEN` as a secret variable.

```text
CLOUD_PROVIDER=local
GRAPH_NAMESPACE=default
GRAPH_ID=default
GRAPH_CELL_ID=cell-0
GRAPH_CELLS=cell-0
GRAPH_NODE_ID=hydradb
LOCAL_PATH=/data/store
GRAPH_BOLT_NODE_ADDRESSES=hydradb=hydradb.railway.internal:7687
GRAPH_ADVERTISED_BOLT_ADDR=hydradb.railway.internal:7687
GRAPH_DATA_CACHE_DIR=/data/cache
GRAPH_AUTH_TOKEN_FILE=/tmp/hydradb-token
GRAPH_ALLOW_PLAINTEXT=true
RUST_MIN_STACK=33554432
HYDRADB_TOKEN=<set-as-a-Railway-secret>
```

`CLOUD_PROVIDER=local` selects HydraDB filesystem storage. `LOCAL_PATH=/data/store` supplies its required path in the persistent Railway Volume. The `GRAPH_BOLT_NODE_ADDRESSES` and `GRAPH_ADVERTISED_BOLT_ADDR` variables configure HydraDB node communication. Port `7687` stays private and BlastPath does not use it.

Do not configure a Railway health-check path or `PORT` variable on the private `hydradb` service. The public `gateway` service checks `/readyz` and the private `seeder` service retries until HydraDB is ready.

### C5. Add the Railway gateway service

Add a second service from the same GitHub repository. Name it `gateway` and set its config file path to `/railway.gateway.json`. Add this variable:

```text
PORT=8080
```

Generate one Railway public domain for the gateway and target port `8080`. Do not add a domain to the `hydradb` service. Do not create a TCP proxy.

The gateway sends `/readyz` to the private admin port and all graph query paths to the private query port. Use the same generated HTTPS URL for both application variables:

```text
HYDRADB_HTTP_URL=https://<gateway-domain>
HYDRADB_ADMIN_URL=https://<gateway-domain>
```

### C6. Add the automatic seed service

Add a third service from the same GitHub repository. Name it `seeder` and set its config file path to `/railway.seeder.json`. Add these variables:

```text
HYDRADB_HTTP_URL=http://hydradb.railway.internal:8443
HYDRADB_ADMIN_URL=http://hydradb.railway.internal:9090
HYDRADB_NAMESPACE=default
HYDRADB_GRAPH_ID=default
HYDRADB_CELL_ID=cell-0
HYDRADB_TOKEN=<the-same-secret-as-the-hydradb-service>
HYDRADB_TIMEOUT_MS=15000
BLASTPATH_FIXTURE_ROOT=./fixtures
ENABLE_SEED_ROUTE=false
LOG_LEVEL=info
SEED_MAX_ATTEMPTS=30
SEED_RETRY_SECONDS=10
```

The service waits for private HydraDB readiness, runs the idempotent fixture seed, prints the verified seed summary, and exits successfully. Railway starts it again on each repository deployment. It has no public domain.

### C7. Check remote HydraDB readiness

Run this from any shell with `curl`. This does not start Docker:

```bash
export HYDRADB_TOKEN='<copy-the-Railway-secret-without-printing-it>'
export HYDRADB_ADMIN_URL='https://<gateway-domain>'
curl --fail --silent --show-error \
  --header "Authorization: Bearer ${HYDRADB_TOKEN}" \
  "${HYDRADB_ADMIN_URL}/readyz"
unset HYDRADB_TOKEN HYDRADB_ADMIN_URL
```

Expected: a successful readiness response. Do not continue if this check fails.

### C8. Connect the Vercel application

In Vercel, import the same GitHub repository. Use these settings:

```text
Framework preset: Next.js
Install command: npm ci
Build command: npm run build
Root directory: ./
```

Add these variables to the Vercel Production environment:

```text
HYDRADB_HTTP_URL=https://<gateway-domain>
HYDRADB_ADMIN_URL=https://<gateway-domain>
HYDRADB_NAMESPACE=default
HYDRADB_GRAPH_ID=default
HYDRADB_CELL_ID=cell-0
HYDRADB_TOKEN=<the-same-Railway-secret>
HYDRADB_TIMEOUT_MS=15000
BLASTPATH_FIXTURE_ROOT=./fixtures
ENABLE_SEED_ROUTE=false
LOG_LEVEL=info
```

Redeploy after you add or change variables. Keep `HYDRADB_TOKEN` server-only. Never add `NEXT_PUBLIC_` to its name.

### C9. Record the Vercel URL

Replace the value below with the Vercel production URL:

```bash
export BLASTPATH_BASE_URL='https://<vercel-production-domain>'
```

The application can report an unseeded graph while the seed service is running. After the `seeder` deployment exits successfully, run:

```bash
curl --fail --silent --show-error \
  "${BLASTPATH_BASE_URL}/api/health"
```

Expected data after the seed is:

```json
{
  "status": "ok",
  "app": "ok",
  "hydradb": "ok",
  "graphSeeded": true,
  "seedVersion": "blastpath-demo-v1"
}
```

The response is wrapped in the API `data` and `meta` fields. This check passes only after the graph is seeded.

### C10. Defer automated cloud live checks

No GitHub Actions live-test workflow is committed. Do not put the HydraDB token in repository settings or a public application route. After Railway is ready, select a trusted test runner before you run the smoke, seed, integration, and Playwright commands.

### C11. Open the cloud dashboard

Open:

```text
https://<vercel-production-domain>/incidents/GHSA-g7cv-rxg3-hmpx
```

Use the dashboard workflow in the local procedure below. The expected values are the same in both environments.

### C12. Cloud reset and shutdown

For a normal repeat test:

1. Keep the Railway Volume.
2. Run the approved seed command again from the selected trusted runner.
3. Confirm that IDs, counts, paths, and classifications stay the same.

For a fresh graph, stop the Railway service and delete its Volume. Volume deletion removes the graph data. Create a new `/data` Volume before the next seed. Keep the Vercel deployment unless you also want to remove the application.

## Local procedure: fallback

Use this procedure only when you choose to run the pinned HydraDB node on the test machine. It starts HydraDB and the production application. Do not run package installs in any fixture directory.

## 1. Prerequisite checks

Run from the repository root:

```bash
node --version
npm --version
docker --version
docker compose version
```

Expected: Node.js 22, npm 10, Docker, and Docker Compose are available.

## 2. Create the environment file

```bash
openssl rand -hex 32 > hydradb-token
chmod 600 hydradb-token
cp .env.example .env.local
sed -i "s#^HYDRADB_TOKEN=.*#HYDRADB_TOKEN=$(tr -d '\\n' < hydradb-token)#" .env.local
```

Check that `.env.local` has the local URL and a token. Do not paste the token into a report.

## 3. Prepare the HydraDB directories

```bash
mkdir -p hydradb-data hydradb-cache
```

These directories are ignored by Git. They contain only local HydraDB state.

## 4. Start the pinned HydraDB node

```bash
docker compose up -d
```

The Compose file uses `ghcr.io/hydra-db/hydradb:0.1.1`, loopback ports, the local store, and the local token file.

## 5. Verify HydraDB readiness

```bash
export HYDRADB_TOKEN="$(tr -d '\\n' < hydradb-token)"
curl --fail --silent --show-error --header "Authorization: Bearer ${HYDRADB_TOKEN}" http://127.0.0.1:9090/readyz
```

Expected: a successful readiness response. A listening port alone is not a pass.

## 6. Run the real HydraDB write/read/delete smoke proof

```bash
npm run smoke:hydradb
```

Expected JSON contains `"ready":true`, one numeric-string `destination`, and `"deleted":true`. The command creates two `Smoke` nodes, creates one `SMOKE_LINK`, reads the destination, and deletes the nodes.

## 7. Run the fixture dry-run

```bash
npm run seed:dry -- --fixtures ./fixtures
```

Expected: exit code 0, `"verified":false`, 3 lockfiles, 25 nodes, 38 edges, and one affected version ID. This command must not contact HydraDB.

## 8. Seed HydraDB

```bash
npm run seed -- --fixtures ./fixtures
```

Expected: exit code 0 and JSON with these stable fields:

```json
{
  "seedVersion": "blastpath-demo-v1",
  "lockfiles": 3,
  "nodesByLabel": {
    "Advisory": 1,
    "Build": 3,
    "Lockfile": 3,
    "Organization": 1,
    "Package": 4,
    "PackageVersion": 6,
    "Repository": 3,
    "SeedRun": 1,
    "Service": 3
  },
  "edgesByType": {
    "AFFECTS": 1,
    "DEPENDS_ON": 7,
    "HAS_BUILD": 3,
    "HAS_LOCKFILE": 3,
    "OWNS": 3,
    "PRODUCES": 3,
    "RESOLVES": 8,
    "SEEDED": 1,
    "USES": 3,
    "VERSION_OF": 6
  },
  "verified": true
}
```

The output also has `fixtureRoot`, `affectedVersions`, and `durationMs`. The affected version ID is a stable positive decimal string. Do not replace it with a guessed value.

## 9. Run the integration tests

```bash
npm run test:integration
```

Expected: the real HydraDB journey passes. Do not set `SKIP_HYDRADB_INTEGRATION=true` for this test.

## 10. Start the production application

In a second terminal, from the repository root:

```bash
npm run start
```

## 11. Check the health endpoint

```bash
curl --fail --silent --show-error http://127.0.0.1:3000/api/health
```

Expected data is:

```json
{
  "status": "ok",
  "app": "ok",
  "hydradb": "ok",
  "graphSeeded": true,
  "seedVersion": "blastpath-demo-v1"
}
```

The response is wrapped in the API `data` and `meta` fields.

## 12. Open the dashboard

Open: <http://127.0.0.1:3000/incidents/GHSA-g7cv-rxg3-hmpx>

## 13. Manual dashboard workflow

1. Confirm the top bar shows `HydraDB connected` and `DEMO DATA`.
2. Confirm the incident shows `GHSA-g7cv-rxg3-hmpx` and the window `19:20 — 19:26 UTC`.
3. Confirm the metrics are `2` impacted, `1` confirmed in window, `2` exposure paths, and `1` safe.
4. Select `Checkout Service`. Confirm `Confirmed execution`, `3 hops`, and this path: `Checkout Service → @blastpath/checkout-shell@4.2.0 → @blastpath/demo-platform@2.4.0 → @tanstack/router-core@1.169.5`.
5. Confirm the timeline shows build `checkout-1842` at `19:23 UTC` inside the window.
6. Select `Admin Console`. Confirm `Current resolution only`, the same affected path, and build `admin-731` at `18:45 UTC` outside the window.
7. Expand `How HydraDB proved this`. Confirm `HydraDB`, `algo.SPpaths` or `algo.SSpaths`, `incoming`, max depth `8`, safe query text, and no token.
8. Select `Analytics Worker`. Confirm `No affected path`; version `@tanstack/router-core@1.169.9` is not affected.
9. Select an impacted service again. Confirm the shared chokepoint is `@blastpath/demo-platform@2.4.0`, shared by 2 services and 2 paths.
10. Select `Simulate containment`. Confirm `2 → 0` impacted services, `2 → 0` exposure paths, and the simulation disclaimer.
11. Select `Reset simulation`. Confirm the panel returns to baseline.
12. Repeat the core actions with keyboard Tab, Enter, and Escape. Confirm visible focus and status text.
13. Test a 390 px wide browser window. Confirm there is no horizontal page scroll.

## 14. Golden values

- Checkout: service → checkout shell 4.2.0 → demo platform 2.4.0 → router-core 1.169.5; `confirmed_execution`.
- Admin: service → admin shell 3.8.0 → demo platform 2.4.0 → router-core 1.169.5; `current_resolution_only`.
- Analytics: demo platform 2.4.1 → router-core 1.169.9; `safe`.
- Top chokepoint: `@blastpath/demo-platform@2.4.0`, shared by 2 services and 2 paths.
- Replay: baseline `2 services / 2 paths`, simulation `0 services / 0 paths`.
- Replay must not mutate the baseline graph.

## 15. Run the Playwright journey

```bash
npm run test:e2e
```

Expected: the incident opens, metrics and statuses appear, the query inspector opens, replay reaches zero, reset works, analytics is safe, and the 390 px overflow check passes.

## 16. Run a second seed for idempotency

```bash
npm run seed -- --fixtures ./fixtures
npm run test:integration
```

Expected: the second seed keeps the same node IDs, edge IDs, counts, metrics, path IDs, and classifications. No duplicate relationship appears.

## 17. Verify baseline after replay

After replay, reload the incident URL or run:

```bash
curl --fail --silent --show-error http://127.0.0.1:3000/api/incidents/GHSA-g7cv-rxg3-hmpx
```

Expected: the response still reports `2` impacted services and `2` exposure paths. The simulation is not a HydraDB write.

## 18. Safe shutdown

Stop the application with `Ctrl+C` in its terminal. Then stop HydraDB:

```bash
docker compose down
```

This keeps the ignored local data directories for another run.

## 19. Safe local-state reset

Use this only when you want a fresh local demo graph:

```bash
docker compose down --volumes --remove-orphans
rm -rf -- hydradb-data hydradb-cache
mkdir -p hydradb-data hydradb-cache
```

This removes only the local HydraDB data directories and containers for this repository. It does not remove fixtures or source files.

## Troubleshooting

- Authentication failure: check that `hydradb-token` is readable by Docker, `.env.local` has the same token, and no token has a trailing line break.
- Railway image pull failure: confirm that Railway can read `ghcr.io/hydra-db/hydradb:0.1.1`. Add only a read-only GHCR package credential if the package is private. Do not use `latest` or replace the pinned image.
- Railway token-file failure: confirm that `HYDRADB_TOKEN` is a Railway secret, `GRAPH_AUTH_TOKEN_FILE=/tmp/hydradb-token`, and the Railway service uses the repository source so the wrapper Dockerfile runs.
- Railway port failure: confirm that the private service is named `hydradb`, has no public domain, has no `PORT` variable, and has no direct health-check path. Confirm that the `gateway` domain targets port `8080`. Do not expose `7687`.
- Vercel environment failure: confirm that all HydraDB variables are set in the Production environment and redeploy Vercel. Do not use a `NEXT_PUBLIC_` prefix for the token.
- Readiness failure: run `docker compose logs hydradb`, confirm ports `8443` and `9090` are free, and retry after the node reports ready.
- Query failure: run `npm run smoke:hydradb` first. If smoke fails, do not continue to seed. Save only the HTTP status, safe error code, and query ID.
- Path failure: confirm the seed returned `"verified":true`, rerun smoke, then run integration. Do not add a fallback graph or edit fixture expectations.
- Timeout: confirm the local node has enough memory, keep the default 15 second timeout, and inspect the bounded query ID. Do not increase traversal depth.
- Seed failure: run `npm run seed:dry -- --fixtures ./fixtures`. Fix the reported fixture or environment issue before a real seed. Never run `npm install` inside a fixture directory.

## Result template

Paste this template back into Codex after the live run:

```text
BlastPath live test result
Date/time and timezone:
Vercel URL:
Railway project/service:
Live-test runner:
Node/npm/Docker versions:
HydraDB image digest:
HydraDB readiness: PASS / FAIL
HydraDB smoke: PASS / FAIL
Fixture dry-run: PASS / FAIL
First seed: PASS / FAIL
Integration tests: PASS / FAIL
Application health: PASS / FAIL
Dashboard workflow: PASS / FAIL
Golden values: PASS / FAIL
Replay 2→0: PASS / FAIL
Baseline after replay: PASS / FAIL
Second seed idempotency: PASS / FAIL
Playwright: PASS / FAIL
Failures and safe error codes:
Notes:
```
