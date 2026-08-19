# Golden cases

Fixture identifiers and outcomes are immutable unless a fixture defect is proven and recorded in `DECISION_LOG.md`.

## G1 — confirmed transitive exposure

- Service: `service:acme-demo/checkout-service`.
- Path: checkout service → `@blastpath/checkout-shell@4.2.0` → `@blastpath/demo-platform@2.4.0` → `@tanstack/router-core@1.169.5`.
- Advisory affects exact final version.
- Matching build uses exact checkout lockfile digest at `2026-05-11T19:23:00Z`, inside inclusive 19:20–19:26 window.
- Expected: `confirmed_execution`, path length 3, one dangerous path.

## G2 — current resolution, outside-window evidence

- Service: `service:acme-demo/admin-console`.
- Path: admin console → `@blastpath/admin-shell@3.8.0` → demo platform 2.4.0 → router-core 1.169.5.
- Matching build timestamp: `2026-05-11T18:45:00Z`.
- Expected: `current_resolution_only`, path length 3, one dangerous path.

## G3 — safe fixed version

- Service: `service:acme-demo/analytics-worker`.
- Path ends at `@tanstack/router-core@1.169.9`, not affected.
- Expected: `safe`, no dangerous path, no false match by package name alone.

## G4 — unknown history classifier

Pure unit case: reuse an impacted path with an empty build-event list. Expected `historical_status_unknown`. This verifies absence of evidence is not converted to safe or confirmed.

## G5 — shared containment

The edge from demo platform 2.4.0 to router-core 1.169.5 occurs in both dangerous paths and ranks first. Simulating its exclusion returns baseline `2 services / 2 paths`, simulated `0 / 0`, removes checkout and admin, and leaves analytics safe. A fresh baseline request remains `2 / 2`.

## G6 — idempotent ingestion

Seed twice. Node IDs, edge IDs, label/type counts, incident metrics, and path ID sets are identical. No duplicate relationship appears.

## Path ID

Canonical path ID is SHA-256 hex of service-first decimal node IDs joined with `>` and edge IDs interleaved as `node/edge/node`; expose first 16 lowercase hex characters. Sort paths by length, then full canonical sequence.
