# System architecture

## Fixed stack

- Node.js 22 LTS, npm, TypeScript strict mode.
- Next.js 16 App Router with React 19; one deployable application.
- Tailwind CSS 4 for styling; no component framework required.
- Zod for runtime validation at fixture, environment, HydraDB, and API boundaries.
- Native `fetch` for HydraDB HTTP; do not use the Neo4j/Bolt driver.
- Vitest for unit/contract tests and Playwright for one browser journey.
- Docker Compose for a single pinned HydraDB node and its bind-mounted local store.

## Deployment variants

- Local fallback: Docker Compose runs HydraDB on loopback ports and the Next.js production server runs locally.
- Cloud live demo: Vercel runs Next.js. Railway runs private HydraDB, a one-domain HTTP gateway, and an automatic one-shot seed service.
- Cloud verification stays pending until an operator selects a trusted test runner.
- The cloud variant keeps the same HTTP client, query templates, fixture inputs, graph identities, and golden outcomes. It does not add a second application backend.

Pin exact resolved versions in `package-lock.json`. Do not add a second backend, ORM, relational database, auth system, state library, or graph-computation library.

## Runtime boundaries

```text
Browser
  -> Next.js pages/client interactions
  -> Next.js Route Handlers (validation and response mapping)
  -> application services (classification, ranking, replay)
  -> repositories (HydraDB query templates and response decoding)
  -> HydraDB HTTP :8443
  -> local object-store directory mounted by Docker

Seed CLI
  -> fixture readers -> parsers -> normalized graph -> HydraDB batch writer
```

Only server-side modules may read `HYDRADB_TOKEN` or call HydraDB. Browser code calls `/api/*` only.

## Exact target tree

The implementation agent must create this whole tree during Phase A. Small helper files may be added inside the named directories, but do not rename the public routes or canonical modules.

```text
app/
  api/health/route.ts
  api/incidents/route.ts
  api/incidents/[incidentId]/route.ts
  api/incidents/[incidentId]/services/[serviceId]/route.ts
  api/incidents/[incidentId]/replay/route.ts
  api/seed/route.ts
  incidents/[incidentId]/page.tsx
  error.tsx  loading.tsx  not-found.tsx  layout.tsx  page.tsx  globals.css
components/
  app-shell.tsx  incident-header.tsx  metric-card.tsx  service-table.tsx
  evidence-path.tsx  exposure-badge.tsx  incident-timeline.tsx
  query-inspector.tsx  containment-panel.tsx  empty-state.tsx  error-panel.tsx
lib/
  api/contracts.ts  api/errors.ts
  config/env.ts
  domain/types.ts  domain/schemas.ts  domain/classify-exposure.ts
  domain/rank-chokepoints.ts  domain/replay.ts
  hydradb/client.ts  hydradb/codec.ts  hydradb/queries.ts  hydradb/repository.ts
  ingestion/id.ts  ingestion/lockfile-v3.ts  ingestion/advisory.ts
  ingestion/build-events.ts  ingestion/normalize.ts  ingestion/seed.ts
  fixtures/paths.ts
scripts/seed.ts  scripts/smoke-hydradb.ts
tests/unit/  tests/contracts/  tests/integration/  tests/e2e/
public/
docker-compose.yml  railway.json  railway.gateway.json  railway.seeder.json  vercel.json
.env.example  .gitignore  package.json  package-lock.json
next.config.ts  tsconfig.json  postcss.config.mjs  vitest.config.ts
playwright.config.ts  eslint.config.mjs  LICENSE
deploy/railway/Dockerfile  deploy/railway/hydradb-entrypoint.sh
deploy/railway/gateway/  deploy/railway/seeder/
```

## Module rules

- `domain/*` is pure TypeScript: no filesystem, network, React, or environment reads.
- `ingestion/*` parses inputs and produces canonical `GraphNode[]` and `GraphEdge[]`; only `seed.ts` writes.
- `hydradb/queries.ts` owns every Cypher string. No inline Cypher elsewhere.
- `hydradb/client.ts` owns auth, timeout, response envelope decoding, and redaction.
- `hydradb/repository.ts` converts database values to domain objects; route handlers never decode HydraDB wire values.
- Route handlers are thin: validate → call service/repository → map error → return contract.
- React components never receive tokens, raw exceptions, or unbounded raw fixtures.

## Data flow

1. Seed reads fixture JSON and lockfiles.
2. Parsers validate v3 shape and incident schema.
3. Normalizer creates stable numeric IDs, nodes, and directed relationships.
4. Writer upserts nodes in label groups, then relationships in type groups, in batches of at most 200 rows.
5. A strong read confirms seed marker and counts.
6. Overview resolves affected version IDs for the incident, calls reverse traversal for each, deduplicates paths, and classifies services.
7. Detail calls exact path, attaches source/build evidence, and returns query metadata.
8. Replay excludes specified baseline edge IDs in the application result set and recomputes reachability over the already-returned bounded candidate paths; it never claims a stored HydraDB mutation. The UI labels it “simulation.”

## Architectural invariants

- Main baseline exposure paths must originate from HydraDB procedure results.
- Fixtures are seed inputs, never API response stubs.
- Replay may analyze HydraDB-returned baseline paths in pure code, but must not replace the baseline query.
- One failed affected-version traversal produces a whole-request error, not partial silent results.
- Sort all API arrays deterministically before returning them.
