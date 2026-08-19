# Data ingestion

## Inputs

- `fixtures/organizations/blastpath-demo-organization.json`
- three lockfiles under `fixtures/lockfiles/*/package-lock.json`
- `fixtures/incidents/tanstack-ghsa-g7cv-rxg3-hmpx.json`
- `fixtures/build-events/demo-build-events.json`

No seed step may call npm, execute lifecycle scripts, download a package tarball, or require a third-party API.

## Pipeline

1. Read UTF-8 with a 2 MiB per-file cap and reject duplicate input paths.
2. Parse JSON; report filename and JSON path, never the full document, on validation error.
3. Validate organization slugs, service/repository linkage, incident UTC interval, exact affected pairs, build timestamps/digests, and npm lockfile version `3`.
4. Compute each lockfile SHA-256 over its exact bytes and require organization `expectedLockfileSha256` and every build reference to match. Committed digests are final; any mismatch is an error.
5. Parse lockfile `packages`, ignoring the root `""` as a package-version node. Reject entries missing name/version unless they are link/workspace entries; fixtures contain no workspaces.
6. Resolve root and nested dependency edges according to `GRAPH_SCHEMA.md`.
7. Normalize OSV affected pairs; fixture contains only the exact pairs used by the demo plus provenance and incident window.
8. Normalize build events and join each to repository plus exact lockfile digest. An unknown digest is `BUILD_LOCKFILE_NOT_FOUND`.
9. Generate nodes/edges, check ID collision and graph invariants, then sort by label/type, ID, and edge key.
10. Upsert nodes by label in batches of 200, then relationships by type in batches of 200.
11. Upsert `SeedRun` last and attach `SEEDED` only after every previous write succeeds.
12. Strong-read the marker, counts, and affected version IDs. Print a concise JSON summary.

## Expected normalized counts

The implementation must derive and document exact node/edge counts from the committed fixtures during Phase A. Store them as constants in the seed contract test, not in production logic. A change to fixtures requires a deliberate update to `GOLDEN_CASES.md` and `DECISION_LOG.md`.

## Idempotency

Running `npm run seed` twice must produce identical graph identities and user-visible results. Use `MERGE` by numeric node ID and relationship ID. Do not use timestamps in identity; `SeedRun.created_at_iso` may update, but keys and counts may not grow.

## Failure behavior

- Validate and normalize the entire dataset before the first write.
- Stop on first HydraDB batch failure and report label/type, batch index, request ID, status, and sanitized error code.
- Never write `SeedRun` after partial failure.
- Rerun is the recovery mechanism because writes are idempotent.
- `--dry-run` must parse/normalize/count without network access. It is authored in Phase A but not executed until Phase B.

## CLI contract

`npm run seed -- --fixtures ./fixtures` seeds. `npm run seed -- --fixtures ./fixtures --dry-run` validates only. Exit 0 on success; exit 1 with one JSON error object on failure. Successful output fields: `seedVersion`, `fixtureRoot`, `lockfiles`, `nodesByLabel`, `edgesByType`, `affectedVersions`, `durationMs`, and `verified`.
