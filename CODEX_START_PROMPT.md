# Build BlastPath from beginning to end

Build BlastPath from beginning to end in this repository:

`/home/stanley/blastpath`

Do not stop after planning. Implement the complete P0 application.

The repository contains the approved product, architecture, data, quality, execution, and demo specifications. Treat these files as requirements.

## Important execution override

For this implementation run, use these three stages:

1. Write all application code first.
2. Run non-live checks only.
3. Stop and give me the manual live-test procedure.

I will run all live tests myself.

This instruction overrides any repository instruction that tells you to start HydraDB, start the application, run integration tests, run browser tests, use curl against a running service, or perform another live test during this run.

Do not remove or weaken the live tests. Write them completely, but do not run them.

## Communication

Follow `AGENTS.md`.

Always use ASD-STE100 Simplified Technical English when you communicate with me.

Do not ask me routine questions. Make the smallest reasonable decision that agrees with the specifications. Ask only if a missing choice can materially change the product or requires new authority.

## Stage 0 — Read and map the specification

Before you edit files:

1. Read `AGENTS.md`.
2. Read `CONTEXT_INDEX.md`.
3. Read every required file in the order in `CONTEXT_INDEX.md`.
4. Read all fixture files.
5. Inspect the repository.
6. Create an internal requirement checklist that maps each P0 requirement to its source file, implementation file, and test file.

Do not show me a long plan and wait for approval. Start implementation after you finish the read-only inspection.

If two documents conflict:

1. Follow the canonical owner in `CONTEXT_INDEX.md`.
2. Follow this prompt for the execution and test order.
3. Record any important implementation decision in `docs/execution/DECISION_LOG.md`.
4. Do not silently change product behavior.

## Stage 1 — Write all code before testing

Implement the complete P0 application.

During this stage, do not:

- install packages;
- run npm scripts;
- run a formatter;
- run ESLint;
- run TypeScript checks;
- run unit or contract tests;
- run a production build;
- start Next.js;
- start Docker;
- start HydraDB;
- call a live HTTP endpoint;
- run seed or smoke commands;
- run integration tests;
- run Playwright;
- open a browser;
- test partial work.

You can use read-only inspection commands. You can edit files.

Create and implement the complete target tree in:

`docs/engineering/SYSTEM_ARCHITECTURE.md`

This includes:

- repository configuration;
- `package.json` and all required npm scripts;
- strict TypeScript configuration;
- Next.js application routes;
- API Route Handlers;
- domain types and Zod schemas;
- environment validation;
- HydraDB HTTP client;
- HydraDB tagged-value decoder;
- all Cypher query templates;
- HydraDB repository layer;
- stable JSON-safe numeric IDs;
- npm `package-lock.json` v3 parser;
- Node-style dependency resolution;
- advisory parser;
- build-event parser;
- graph normalization;
- collision checks;
- idempotent batch ingestion;
- seed command;
- HydraDB smoke command;
- exposure classification;
- path validation and hydration;
- chokepoint ranking;
- non-destructive containment replay;
- all dashboard components;
- all loading, empty, error, disconnected, unseeded, and mobile states;
- safe error responses;
- query inspector;
- accessibility behavior;
- Docker Compose configuration;
- `.env.example`;
- `.gitignore`;
- an OSI-approved license;
- unit tests;
- contract tests;
- real-HydraDB integration tests;
- Playwright end-to-end tests;
- manual live-test documentation.

Use the committed fixtures as seed inputs. Do not replace them with hard-coded API responses.

The baseline blast-radius result must come from HydraDB. Do not add an in-memory, mock, or static production fallback for the main result.

All Cypher must stay in `lib/hydradb/queries.ts`.

Do not accept user-provided Cypher.

Do not expose the HydraDB token to browser code, logs, API responses, or the query inspector.

Do not download, install, or execute the malicious packages. Do not add malicious payload content.

Preserve the required golden outcomes:

- Checkout Service has a transitive path to `@tanstack/router-core@1.169.5`.
- Checkout Service has a matching build at 19:23 UTC and is classified as confirmed execution.
- Admin Console has a transitive path to `@tanstack/router-core@1.169.5`.
- Admin Console has matching build evidence outside the incident window and is classified as current resolution only.
- Analytics Worker uses `@tanstack/router-core@1.169.9` and is safe.
- `@blastpath/demo-platform@2.4.0` is the top shared chokepoint.
- The containment simulation reduces two impacted services and two paths to zero.
- The simulation does not change the baseline graph.

Do not change fixture expectations to make incorrect code pass.

## Frontend requirements

Implement the complete incident-command interface in `docs/engineering/FRONTEND_SPEC.md`.

The interface must look like an intentional security operations product. It must not look like a generic template.

The most important visual sequence is:

1. Incident and six-minute window.
2. Impact metrics.
3. Ranked services.
4. Exact evidence path.
5. Build timeline and evidence classification.
6. Real HydraDB query inspector.
7. Shared chokepoint.
8. Containment simulation from two impacted services to zero.

Use a deterministic path layout. Do not use an uncontrolled force graph.

Make the interface responsive and keyboard accessible. Support reduced motion. Do not use color as the only status indicator.

## Code-complete audit

After you write all production code, test code, configuration, scripts, and documentation, perform a read-only audit.

Check all P0 requirements against:

- `docs/product/SCOPE_AND_NON_GOALS.md`
- `docs/quality/ACCEPTANCE_CRITERIA.md`
- `docs/quality/GOLDEN_CASES.md`
- `docs/engineering/API_CONTRACT.md`
- `docs/engineering/FRONTEND_SPEC.md`
- `docs/engineering/SECURITY_AND_SAFETY.md`

Search for:

- missing target files;
- `TODO` or `FIXME` markers;
- incomplete handlers;
- placeholder production logic;
- mock baseline results;
- inline Cypher outside `queries.ts`;
- unsafe `any` types;
- token leakage;
- unsupported security claims;
- missing UI states;
- missing tests;
- P1 or P2 scope creep.

Correct all P0 omissions before you run any command that executes project code.

## Stage 2 — Non-live checks

Only after the code-complete audit, run the non-live checks.

You may now:

1. Install dependencies and generate the lockfile.
2. Run the formatter check.
3. Run ESLint.
4. Run the strict TypeScript check.
5. Run unit tests.
6. Run contract tests that read local fixtures only.
7. Run the production build without contacting HydraDB or another live service.
8. Inspect the production bundle and static build errors.

Use this order:

1. `npm install`
2. `npm run format:check`
3. `npm run lint`
4. `npm run typecheck`
5. `npm run test:unit`
6. `npm run test:contracts`
7. `npm run build`

If the exact package scripts differ, correct `package.json` so these required commands exist.

A production build must not require a running HydraDB instance. It can use a safe build-time placeholder token if required, but it must not make a HydraDB request.

When checks fail:

1. Group failures by root cause.
2. Fix all related failures in one edit batch.
3. Run the affected non-live check again.
4. Run later dependent checks again.
5. Continue until every allowed non-live check passes.

Do not weaken schemas, assertions, TypeScript strictness, lint rules, or expected results to obtain a pass.

Do not run tests in watch mode.

## Prohibited live actions

Do not run any of these during this task:

- `docker compose up`;
- `docker run`;
- a HydraDB process;
- `npm run dev`;
- `npm run start`;
- `npm run seed`;
- `npm run smoke:hydradb`;
- `npm run test:integration`;
- `npm run test:e2e`;
- Playwright against a running application;
- curl against HydraDB or the application;
- a browser-based test;
- a public deployment;
- a live OSV or deps.dev request.

You must author these commands and tests. You must not execute them.

## Stage 3 — Prepare my manual live test

Create:

`docs/quality/MANUAL_LIVE_TEST.md`

Write exact copy-and-paste steps for me.

The guide must include:

1. Prerequisite checks.
2. Environment-file creation.
3. HydraDB token creation.
4. HydraDB directory preparation.
5. The exact Docker Compose start command.
6. HydraDB readiness verification.
7. The real write/read/delete smoke command.
8. Fixture dry-run.
9. Real seed command.
10. Seed output that I must expect.
11. Integration-test command.
12. Production application start command.
13. Health endpoint check.
14. Browser URL.
15. Manual dashboard workflow.
16. Expected values for every golden case.
17. Playwright end-to-end command.
18. A second seed for the idempotency check.
19. Baseline verification after containment replay.
20. Safe shutdown.
21. Safe local-state reset.
22. Troubleshooting for authentication, readiness, query, path, timeout, and seed failures.
23. A result template that I can paste back into Codex.

Do not claim that live behavior passes. Mark it as pending manual verification.

## README

Do not replace the current README with the final codebase README until:

- implementation is complete; and
- all allowed non-live checks pass.

Then write the final README in ASD-STE100 Simplified Technical English.

The final README is for normal users and judges. Do not include agent instructions or ASD-STE100 instructions in it.

The final README must explain:

- the problem;
- what BlastPath does;
- the synthetic-data disclosure;
- why HydraDB is essential;
- architecture;
- graph schema;
- exact setup;
- non-live checks;
- manual live-test procedure;
- expected demo results;
- security limits;
- known limitations;
- attribution;
- license;
- hackathon submission context.

## Final response

Do not stop until:

- all P0 code exists;
- all required tests exist;
- all allowed non-live checks pass;
- the final README exists;
- `MANUAL_LIVE_TEST.md` exists;
- no live command has been run.

In your final response, use ASD-STE100.

Report:

1. What you implemented.
2. The non-live commands you ran.
3. The result of each command.
4. Important files that changed.
5. Any remaining known limitation.
6. A clear statement that live HydraDB, integration, application, browser, and end-to-end tests were not run.
7. The first exact command that I must run from `MANUAL_LIVE_TEST.md`.
8. Where I must paste the manual results.

Do not say the application is fully verified until I return the live-test results.
