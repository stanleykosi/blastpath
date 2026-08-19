# P0 implementation checklist

This checklist maps the P0 requirements to the canonical source, implementation, and test locations.

| P0 requirement | Source | Implementation | Test coverage |
|---|---|---|---|
| Next.js 16 application and strict TypeScript | `SYSTEM_ARCHITECTURE.md` | `app/`, `next.config.ts`, `tsconfig.json`, `package.json` | build, typecheck, E2E |
| Server-only HydraDB access | `SYSTEM_ARCHITECTURE.md`, `SECURITY_AND_SAFETY.md` | `lib/config/env.ts`, `lib/hydradb/client.ts`, route handlers | environment and integration tests |
| Runtime schemas and safe API DTOs | `API_CONTRACT.md` | `lib/domain/schemas.ts`, `lib/api/contracts.ts`, `lib/api/errors.ts` | contract tests |
| Stable JSON-safe IDs and collision checks | `GRAPH_SCHEMA.md` | `lib/ingestion/id.ts` | ID unit tests |
| npm lockfile v3 and Node resolution | `DATA_INGESTION.md`, `GRAPH_SCHEMA.md` | `lib/ingestion/lockfile-v3.ts` | lockfile unit tests |
| Advisory and build parsing | `DATA_INGESTION.md` | `lib/ingestion/advisory.ts`, `build-events.ts` | classifier and fixture contract tests |
| Graph normalization and invariants | `GRAPH_SCHEMA.md`, `DATA_INGESTION.md` | `lib/ingestion/normalize.ts` | normalization and fixture tests |
| Idempotent HydraDB batch seed | `HYDRADB_INTEGRATION.md`, `DATA_INGESTION.md` | `lib/ingestion/seed.ts`, `lib/hydradb/repository.ts`, `scripts/seed.ts` | integration seed and reseed tests |
| Tagged HydraDB protocol decoder | `HYDRADB_INTEGRATION.md` | `lib/hydradb/codec.ts` | codec contract tests |
| Cypher ownership and bounded procedures | `HYDRADB_INTEGRATION.md` | `lib/hydradb/queries.ts` | query contract tests |
| Smoke write/read/delete proof | `HYDRADB_INTEGRATION.md` | `scripts/smoke-hydradb.ts`, repository smoke method | integration test and manual guide |
| Exposure truth classification | `SECURITY_AND_SAFETY.md` | `lib/domain/classify-exposure.ts` | classification unit tests |
| Path validation, hydration, and exact path evidence | `GRAPH_SCHEMA.md`, `API_CONTRACT.md` | repository path methods, `incident-service.ts`, `replay.ts` | integration and E2E tests |
| Chokepoint ranking | `PRODUCT_BRIEF.md`, `GOLDEN_CASES.md` | `lib/domain/rank-chokepoints.ts` | normalization/integration golden tests |
| Non-destructive containment replay | `FRONTEND_SPEC.md`, `GOLDEN_CASES.md` | `lib/domain/replay.ts`, replay route, containment panel | replay unit, integration, E2E tests |
| Incident API routes and safe errors | `API_CONTRACT.md` | `app/api/**`, `lib/api/**` | API contract and integration tests |
| Command console and required states | `FRONTEND_SPEC.md` | `components/**`, `app/**`, `app/globals.css` | E2E and responsive checks |
| HydraDB query inspector and accessibility | `FRONTEND_SPEC.md`, `SECURITY_AND_SAFETY.md` | `components/query-inspector.tsx`, semantic controls, focus styles | E2E and manual workflow |
| Reproducible local runtime | `CONFIGURATION.md`, `HYDRADB_INTEGRATION.md` | `docker-compose.yml`, `.env.example`, `.gitignore`, `LICENSE` | format, build, manual guide |
