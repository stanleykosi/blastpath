# Decision log

Append only. Implementation agents record deviations and dependency additions here.

## D001 — Track and concept

- Decision: Track 2A, BlastPath incident-response product.
- Why: strongest two-day graph-native fit and deterministic demo.
- Consequence: no parallel Track 1/3 work.

## D002 — Fixed stack

- Decision: one Next.js 16/TypeScript application, native HydraDB HTTP, Zod, Tailwind, Vitest, Playwright, Docker Compose.
- Why: one language/deployable and minimal boundaries.
- Consequence: no Bolt driver, ORM, second API service, or database.

## D003 — Version-level graph

- Decision: exact `PackageVersion` nodes and directed dependency edges; JSON-safe deterministic 53-bit IDs.
- Why: advisories affect versions and HydraDB needs numeric IDs.

## D004 — Truth model

- Decision: current path and build-window evidence are separate; three impacted confidence states plus safe.
- Why: lockfiles cannot prove historical execution.

## D005 — Replay semantics

- Decision: non-mutating simulation excludes selected edges from HydraDB-returned candidate paths; it is not a resolver or persisted graph mutation.
- Why: deterministic safety and demo reliability.

## D006 — Code before execution

- Decision: author all P0 production/test code before executing any project command, then verify once in ordered layers.
- Requested by: user.
- Consequence: Phase A audit is mandatory; Phase B failures are repaired in subsystem batches.

## Entry template

`## DNNN — title` then date, decision, reason/evidence, alternatives rejected, affected files, and whether scope/acceptance changes. Never rewrite prior entries.

## D007 — Phase A complete under write-first execution override

- Date: 2026-08-18.
- Decision: Complete the P0 source tree, tests, configuration, Compose file, license, and manual live-test guide before any project execution. Run only the user-approved non-live checks in Phase B. Leave HydraDB, application, integration, browser, and end-to-end actions for manual verification.
- Reason/evidence: The user explicitly required write-all-code-first and prohibited all live actions during this run. The read-only audit found the target routes, P0 modules, required UI states, query ownership, tests, and safety boundaries present.
- Alternatives rejected: Running a partial test or starting a local service before the P0 code-complete gate would violate the repository runbook and user execution order.
- Affected files: all P0 source, test, configuration, and documentation files created in this implementation pass.
- Scope/acceptance: no product scope or golden expectation changed. HydraDB image digest and live syntax remain pending manual verification.

## D008 — Non-live build uses Webpack

- Date: 2026-08-18.
- Decision: Set the production build script to `next build --webpack` and disable the Next.js Webpack build worker.
- Reason/evidence: The restricted non-live runner does not permit the Turbopack CSS worker to bind its internal process port. The single-process Webpack path builds the same application bundle without contacting HydraDB.
- Alternatives rejected: Starting a live service or weakening the CSS pipeline would violate the execution override or reduce product quality.
- Affected files: `package.json`, `next.config.ts`.
- Scope/acceptance: no product behavior, query, fixture, or golden expectation changed.

## D009 — Cloud live deployment uses Vercel and Railway

- Date: 2026-08-19.
- Decision: Add Vercel configuration for the Next.js application, Railway configuration for a remote HydraDB wrapper, and a manual GitHub Actions cloud live-test workflow.
- Reason/evidence: The user does not want to install Docker dependencies on the test machine. Vercel provides the Node.js application runtime. Railway can build the pinned GHCR image remotely and persist both HydraDB store paths under one `/data` Volume. GitHub Actions can run the live seed and browser checks without local Docker.
- Alternatives rejected: Cloudflare was not selected because the current application already uses the Vercel-compatible Node.js runtime and the user requested Vercel plus Railway. A second application backend was rejected because it would change the fixed architecture.
- Affected files: `vercel.json`, `railway.json`, `deploy/railway/Dockerfile`, `deploy/railway/hydradb-entrypoint.sh`, `.github/workflows/cloud-live-test.yml`, `playwright.config.ts`, `.gitignore`, `docs/quality/MANUAL_LIVE_TEST.md`, `README.md`, and this log.
- Scope/acceptance: no product behavior, query, fixture, or golden expectation changed. Cloud account, image entrypoint, Railway port mapping, and live HydraDB behavior remain pending manual verification.

## D010 — Railway wrapper retains the pinned HydraDB command

- Date: 2026-08-19.
- Decision: Set `CMD ["graph-node"]` after the custom token-file entrypoint.
- Reason/evidence: A new Docker `ENTRYPOINT` removes the command inherited from the pinned base image. The official HydraDB image documentation identifies `graph-node` as the image entrypoint. The wrapper must receive that command after it creates the token file.
- Alternatives rejected: Starting the wrapper with no command stops the container. Using `latest` or a guessed binary would break the pinned deployment contract.
- Affected files: `deploy/railway/Dockerfile`, `tests/contracts/railway-image.contract.test.ts`, and this log.
- Scope/acceptance: no product scope or golden expectation changed. The pinned image startup command is no longer pending verification.

## D011 — Vercel uses one deterministic npm installation path

- Date: 2026-08-19.
- Decision: Pin Node.js 22 and npm 10.9.2, use `npm ci` for Vercel, CI, local setup, and verification, and reserve `npm install <package>` for explicit dependency changes.
- Reason/evidence: Vercel blocked the original Next.js 16.0.1 deployment. The security update requires a committed lockfile and one repeatable installation command.
- Alternatives rejected: `npm install` for deployments can change the dependency tree. The Vercel vulnerable-version bypass would keep a known security defect.
- Affected files: `package.json`, `package-lock.json`, `vercel.json`, `.github/workflows/cloud-live-test.yml`, `README.md`, `docs/quality/MANUAL_LIVE_TEST.md`, `next.config.ts`, and this log.
- Scope/acceptance: no product behavior, query, fixture, or golden expectation changed. Next.js is 16.3.1, React is 19.2.6, and the production dependency audit has zero findings.

## D012 — Defer the GitHub Actions live-test runner

- Date: 2026-08-19.
- Decision: Remove the manual GitHub Actions cloud live-test workflow until it is needed.
- Reason/evidence: The user requested that the repository not include this workflow now.
- Alternatives rejected: Keeping an unused workflow would add configuration and secret-management work before Railway is ready.
- Affected files: `.github/workflows/cloud-live-test.yml`, `README.md`, `docs/quality/MANUAL_LIVE_TEST.md`, `docs/engineering/SYSTEM_ARCHITECTURE.md`, `docs/engineering/CONFIGURATION.md`, and this log.
- Scope/acceptance: no production code or test file changed. Live HydraDB, integration, and Playwright checks remain pending.

## D013 — Railway uses a generated-domain gateway and automatic seeder

- Date: 2026-08-19.
- Decision: Keep HydraDB private, route its two HTTP ports through one Railway gateway domain, and run fixture ingestion from a private one-shot Railway seed service on each deployment.
- Reason/evidence: The user has no custom domain and requires automatic seed after deployment. Railway provides one generated domain per service and private `railway.internal` DNS between services.
- Alternatives rejected: Exposing Bolt is unnecessary. Two custom domains require domain ownership. A public seed route increases attack surface.
- Affected files: Railway deployment files, environment validation, Railway contract tests, cloud documentation, and this log.
- Scope/acceptance: fixtures, Cypher, graph identities, and golden outcomes do not change. Live Railway behavior remains pending manual verification.

## D014 — Gateway owns the Railway readiness check

- Date: 2026-08-19.
- Decision: Remove the direct Railway HTTP health check and `PORT` variable from the private HydraDB service. Keep `/readyz` as the gateway deployment health check and as the authenticated application readiness check.
- Reason/evidence: The private database does not need a Railway public-web health gate. The gateway has one HTTP port and can route readiness to HydraDB port `9090`.
- Alternatives rejected: A direct Railway probe cannot supply the HydraDB bearer token. Keeping two readiness owners caused an avoidable deployment failure.
- Affected files: `railway.json`, Railway contract tests, the manual live-test guide, and this log.
- Scope/acceptance: no graph, fixture, query, or application behavior changed. Live Railway verification remains pending.

## D015 — Use the HydraDB 0.1.1 plaintext variable name

- Date: 2026-08-19.
- Decision: Set `GRAPH_ALLOW_PLAINTEXT=true` for the pinned HydraDB runtime.
- Reason/evidence: The real Railway runtime rejected `ENABLE_PLAINTEXT` and reported that `GRAPH_ALLOW_PLAINTEXT` is required when graph TLS certificate files are absent.
- Alternatives rejected: Adding graph TLS certificate secrets is unnecessary because HydraDB stays inside Railway private networking and the public gateway provides HTTPS.
- Affected files: `docker-compose.yml`, the manual live-test guide, Railway contract tests, and this log.
- Scope/acceptance: no application behavior, fixtures, Cypher, or golden outcomes changed. Railway startup must be manually retried.

## D016 — Set the HydraDB local-provider path

- Date: 2026-08-19.
- Decision: Set `LOCAL_PATH=/data/store` when `CLOUD_PROVIDER=local`.
- Reason/evidence: The real HydraDB 0.1.1 Railway runtime rejected a null `LOCAL_PATH` value after it accepted the plaintext setting.
- Alternatives rejected: Removing persistent local storage would lose the graph on redeployment. `STORE_PATH` alone does not configure the local provider.
- Affected files: `docker-compose.yml`, HydraDB integration documentation, the manual live-test guide, Railway contract tests, and this log.
- Scope/acceptance: no application behavior, fixture, Cypher, or golden outcome changed. Railway startup must be manually retried.

## D017 — Create HydraDB directories after the Railway Volume mount

- Date: 2026-08-19.
- Decision: Create `LOCAL_PATH`, `STORE_PATH`, and `CACHE_PATH` in the HydraDB entrypoint before `graph-node` starts.
- Reason/evidence: Railway mounted the Volume at `/data`, but a new Volume did not contain `/data/store`. HydraDB failed while canonicalizing the missing local-provider path.
- Alternatives rejected: Creating the directories during the image build does not work because the runtime Volume mount hides image-layer contents at `/data`.
- Affected files: the Railway HydraDB entrypoint, Railway contract tests, the manual live-test guide, and this log.
- Scope/acceptance: no graph, fixture, Cypher, or golden outcome changed. Railway startup must be manually retried with the new image.

## D018 — Use the official HydraDB 0.1.1 graph runtime variable names

- Date: 2026-08-19.
- Decision: Replace the generic cell, node, Bolt, cache, and token-file variable names with `GRAPH_CELL_ID`, `GRAPH_CELLS`, `GRAPH_NODE_ID`, `GRAPH_BOLT_NODE_ADDRESSES`, `GRAPH_ADVERTISED_BOLT_ADDR`, `GRAPH_DATA_CACHE_DIR`, and `GRAPH_AUTH_TOKEN_FILE`.
- Reason/evidence: The official HydraDB 0.1.1 startup example uses these names. The Railway runtime ignored the generic names and failed during placement initialization with an unspecified missing file.
- Alternatives rejected: Adding more directories cannot correct ignored runtime configuration. The pinned image and persistent `/data` Volume remain unchanged.
- Affected files: `docker-compose.yml`, the Railway HydraDB entrypoint, HydraDB configuration documentation, the manual live-test guide, Railway contract tests, and this log.
- Scope/acceptance: no graph, fixture, Cypher, application API, or golden outcome changed. Railway startup requires manual verification.

## D019 — Make seed failures visible in Railway logs

- Date: 2026-08-20.
- Decision: Prefix the safe JSON seed-failure record with `BlastPath seed failed:`.
- Reason/evidence: Railway received the JSON record on standard error but displayed a blank structured-log message. A text prefix makes the existing safe code, message, query ID, and batch fields visible.
- Alternatives rejected: Raw stack traces can disclose internal details. An unstructured generic error would not identify the failed HydraDB operation.
- Affected files: the seed command, Railway contract tests, and this log.
- Scope/acceptance: seed behavior and retry behavior do not change. The next manual deployment must provide the visible failure record.

## D020 — Retain bounded HydraDB error details for seed diagnostics

- Date: 2026-08-20.
- Decision: On a non-success HTTP response, retain only HydraDB's JSON error code and message. Limit the body to 4 KiB, limit the detail to 240 characters, remove control characters, and redact sensitive assignments.
- Reason/evidence: The relationship batch error proved that transport and node writes worked, but the client discarded the server reason needed to correct the mutation query.
- Alternatives rejected: Logging the raw response can expose internal data. Keeping only the HTTP status cannot distinguish parser, identity, and mutation failures.
- Affected files: the HydraDB client, HydraDB error type, seed-failure record, unit tests, and this log.
- Scope/acceptance: successful query behavior does not change. Tokens, headers, parameters, and unapproved response fields remain excluded.
