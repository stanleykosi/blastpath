# Configuration

## Environment schema

Validate once in `lib/config/env.ts`; fail fast server-side with variable names but never values.

| Variable                 | Required | Default                 | Rule                                                                      |
| ------------------------ | -------: | ----------------------- | ------------------------------------------------------------------------- | ---- | ---- | ------ |
| `HYDRADB_HTTP_URL`       |       no | `http://127.0.0.1:8443` | `http` allowed only for loopback/private local demo; strip trailing slash |
| `HYDRADB_ADMIN_URL`      |       no | `http://127.0.0.1:9090` | same local rule                                                           |
| `HYDRADB_NAMESPACE`      |       no | `default`               | `^[a-zA-Z0-9_-]{1,64}$`                                                   |
| `HYDRADB_GRAPH_ID`       |       no | `default`               | same                                                                      |
| `HYDRADB_CELL_ID`        |       no | `cell-0`                | same                                                                      |
| `HYDRADB_TOKEN`          |      yes | none                    | minimum 16 characters; server only                                        |
| `HYDRADB_TIMEOUT_MS`     |       no | `15000`                 | integer 1000–30000                                                        |
| `BLASTPATH_FIXTURE_ROOT` |       no | `<repo>/fixtures`       | resolve server-side; CLI only, never from HTTP                            |
| `ENABLE_SEED_ROUTE`      |       no | `false`                 | exact `true` or `false`                                                   |
| `LOG_LEVEL`              |       no | `info`                  | `debug                                                                    | info | warn | error` |

Only `NEXT_PUBLIC_*` values may enter the browser bundle; P0 requires none.

## Cloud deployment values

For the Vercel plus Railway live demo, set `HYDRADB_HTTP_URL` and `HYDRADB_ADMIN_URL` to the two Railway HTTPS domains. Keep `HYDRADB_TOKEN` in the Vercel Production environment as a server-only secret. Set `ENABLE_SEED_ROUTE=false` in Vercel. Run seed and integration commands from the GitHub Actions cloud workflow, not from the public application.

Railway sets its HydraDB service values separately. Mount one Volume at `/data`, set `STORE_PATH=/data/store`, `CACHE_PATH=/data/cache`, and use `TOKEN_FILE=/tmp/hydradb-token`. The repository entrypoint writes that file from the Railway `HYDRADB_TOKEN` secret at startup.

`BLASTPATH_BASE_URL` is a Playwright test variable only. When set, the Playwright config tests the remote Vercel URL and does not start a local Next.js server.

## `.env.example`

Must use placeholders only:

```dotenv
HYDRADB_HTTP_URL=http://127.0.0.1:8443
HYDRADB_ADMIN_URL=http://127.0.0.1:9090
HYDRADB_NAMESPACE=default
HYDRADB_GRAPH_ID=default
HYDRADB_CELL_ID=cell-0
HYDRADB_TOKEN=replace-with-local-development-token
HYDRADB_TIMEOUT_MS=15000
BLASTPATH_FIXTURE_ROOT=./fixtures
ENABLE_SEED_ROUTE=false
LOG_LEVEL=info
```

## npm scripts required

`dev`, `build`, `start`, `lint`, `typecheck`, `format:check`, `seed`, `seed:dry`, `smoke:hydradb`, `test:unit`, `test:contracts`, `test:integration`, `test:e2e`, and `verify`. `verify` follows `TEST_PLAN.md` order and assumes HydraDB is already running/seeded; it must not hide output.

## Git ignore

Ignore `.env*` except `.env.example`, `.vercel`, `node_modules`, `.next`, Playwright output, coverage, logs, `hydradb-data`, `hydradb-cache`, auth-token files, and OS/editor artifacts. Fixtures and documentation remain tracked.
