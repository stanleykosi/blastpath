# HydraDB repository notes

Research snapshot: official `main` at `6a2fbb192f37f51a93690a2ae2d2f5e27e6e4219`, 2026-08-18. Reverify before changing pinned runtime.

## Useful surface

- Object-store-native Rust graph database; HTTP `POST /v1/graphs/{graph}/query` and Neo4j-compatible Bolt.
- HTTP requires bearer token, `X-Graph-Namespace`, `cell_id`, and one query statement; parameters accept nested JSON maps/lists for `UNWIND`.
- Tagged response values include vertex IDs, scalar types, lists, and paths.
- Native bounded `algo.SSpaths` and `algo.SPpaths` return whole paths.
- `strong` refreshes storage before snapshot; `causal` is normal hot read.
- Node IDs non-negative numeric; properties scalar; default path ceiling 16, runtime 30 seconds, scan 1M edges, body 1 MiB.

## Constraints encoded in specs

No `RETURN *`, unbounded/undirected path, `IN`, `IS NULL`, arbitrary projection, or assumed Neo4j parity. Use HTTP, max depth 8, literal allowlisted labels/types, 200-row `UNWIND`, strong seed verification, causal dashboard reads, and no user Cypher.

## Current risks

Open research-time issues: local manifest garbage collection (#81), missing scripts (#88), anonymous-interior multi-hop lowering (#95 with PR #99), intermittent Bolt decode (#98). Therefore Compose is demo-local, seed is idempotent, native paths are preferred, and Bolt is excluded.

## Verification obligation

The implementation must prove write/read/delete and actual path queries on the selected image after code-complete. A listening port is insufficient. Record the resolved image digest and any syntax adjustment in `docs/execution/DECISION_LOG.md`.
