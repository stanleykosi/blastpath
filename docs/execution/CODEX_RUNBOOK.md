# Codex implementation runbook

## Phase A — write, do not execute

Allowed: read docs/files, `rg`, `find`, `sed`, `git diff`, and file edits. Forbidden until Step A9: package installation, formatter, generator, linter, typechecker, tests, build, Docker, server, database, curl smoke, browser, or any command that executes project code.

A1. Read files in `CONTEXT_INDEX.md` order. Create a checklist mapping every P0 acceptance item to target modules/tests.

A2. Create repository metadata/config manually: package manifest/scripts, TS/Next/Tailwind/Vitest/Playwright/ESLint configs, ignore/env example, Compose, license. Do not run scaffolding generators.

A3. Implement domain and boundary schemas first: types, API contracts, safe errors, environment validation, HydraDB wire codec.

A4. Implement ingestion in dependency order: stable IDs → npm v3 parser → advisory/build parser → graph normalizer → batch seed. Fill exact fixture SHA-256/count expectations by read-only reasoning; if exact digests require execution, leave one clearly marked Phase-B pre-seed task, never a guessed value.

A5. Implement HydraDB templates/client/repository, then classifier/chokepoint/replay. Every query stays in `queries.ts`.

A6. Implement route handlers and shared response/error wrapper. Trace each contract field to a real repository/domain source.

A7. Implement entire UI and all required states. Keep server/client boundaries explicit; use client components only for selection, detail fetching, inspector, and replay interaction.

A8. Author all unit/contract/integration/E2E tests and final public README/setup/architecture/attribution. Tests must assert golden outcomes, not implementation details alone.

A9. Read-only audit: compare tree to architecture, routes to API contract, components to frontend states, tests to golden cases, and dependencies to decision log. Search for `TODO`, `FIXME`, mock/fallback exposure logic, inline Cypher, token leakage, `any`, and P2 features. Resolve every P0 issue. Mark Phase A complete in `DECISION_LOG.md` with date/time and code files present. Only now may execution begin.

## Phase B — execute and repair

B1. Run the exact `TEST_PLAN.md` order. Capture the first full result; do not interleave new features.

B2. Group failures by root cause. Fix all same-layer failures in one edit batch. Re-run the affected suite and downstream suites only.

B3. For HydraDB failure, preserve sanitized HTTP body/status/query ID, compare to `HYDRADB_INTEGRATION.md`, and reduce to smoke request. Never add a mock baseline. If native path is broken on the pinned release, document proof and use a bounded typed `MATCH` only if it returns whole evidence needed; expose the actual query in UI.

B4. After green verification, perform two cold rehearsals: remove only ignored local state through the documented safe reset, start HydraDB, seed, production build/start, complete demo. Record timings and any manual step.

B5. Freeze features, complete submission artifacts, record video, verify public links logged out, submit.

## Stop conditions

Stop P1 immediately if any P0 check fails. Stop visual polish if integration is not green. Ask the user only for a choice that materially changes scope, credentials, deployment destination, or submission identity; otherwise follow the canonical docs.
