# BlastPath

BlastPath is an incident command console for software supply-chain incidents.

Most scanners say that a package is unsafe. BlastPath shows where the package reached, which build evidence exists, and which shared dependency can reduce the most exposure.

## The problem

An affected package can reach many services through transitive dependencies. A current lockfile does not prove that a service executed the affected version during an incident window. An old build record does not prove current exposure.

BlastPath keeps these facts separate. It shows:

- current dependency paths;
- build evidence inside or outside the incident window;
- confidence labels for each service;
- the exact evidence path returned by HydraDB;
- the shared dependency with the largest path impact;
- a safe containment replay that does not change the graph.

## Demo data

The repository contains synthetic organization, repository, lockfile, and build-event data. The fixtures contain no secrets and no executable malicious package content.

The demo uses the real advisory identifier `GHSA-g7cv-rxg3-hmpx` and the real package names in the approved fixture set. BlastPath does not install or execute the affected package.

## Why HydraDB is essential

The main blast-radius result comes from HydraDB. BlastPath sends bounded, allowlisted native path queries to HydraDB and records the query procedure, parameters, query IDs, and result count.

There is no in-memory or static production fallback for the main result. If HydraDB is unavailable or the graph is not seeded, the application shows a safe state and does not claim exposure evidence.

## Architecture

The application uses Next.js App Router with strict TypeScript.

- Server Route Handlers call the HydraDB repository.
- The repository owns HydraDB reads and idempotent batch writes.
- `lib/hydradb/queries.ts` is the only file that contains Cypher.
- Zod schemas validate environment values, fixture data, graph data, and API data.
- Fixture ingestion validates file size, lockfile digests, stable IDs, and collision safety.
- The browser receives safe DTOs only. It never receives the HydraDB token.
- The containment action is a pure replay over returned paths. It does not write to HydraDB.

## Graph schema

BlastPath loads these node labels:

`Organization`, `Repository`, `Service`, `Lockfile`, `Package`, `PackageVersion`, `Build`, `Advisory`, and `SeedRun`.

It loads these relationship types:

`OWNS`, `PRODUCES`, `HAS_LOCKFILE`, `DEPENDS_ON`, `RESOLVES`, `USES`, `HAS_BUILD`, `VERSION_OF`, `AFFECTS`, and `SEEDED`.

Every graph identity uses a stable positive decimal string. IDs stay safe when they pass through JSON and browser code.

## Setup

For the live demo, the recommended setup is Vercel plus Railway:

- Vercel runs the Next.js application.
- Railway runs the pinned HydraDB image and stores the graph in one persistent Volume.
- Live checks stay pending until an operator selects a trusted test runner.
- The test machine does not need Docker.

Use [docs/quality/MANUAL_LIVE_TEST.md](docs/quality/MANUAL_LIVE_TEST.md) for the exact cloud setup.

For local fallback testing, requirements are:

- Node.js 22;
- npm;
- Docker and Docker Compose;
- an authenticated local HydraDB node.

Install the declared packages and create the local environment file:

```bash
npm ci
cp .env.example .env.local
```

Create a local token and set the same value in `.env.local` and `hydradb-token`. Prepare the local HydraDB directories:

```bash
openssl rand -hex 32 > hydradb-token
chmod 600 hydradb-token
mkdir -p hydradb-data hydradb-cache
```

Start HydraDB and run the seed only after the readiness check passes. Use the complete procedure in [docs/quality/MANUAL_LIVE_TEST.md](docs/quality/MANUAL_LIVE_TEST.md).

## Non-live checks

The required check order is:

```bash
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run test:unit
npm run test:contracts
npm run build
```

Unit and contract tests read local fixtures only. The real HydraDB integration test and Playwright test are separate live checks. This implementation run did not run them.

## Expected demo result

After a valid HydraDB seed, open the Vercel URL or the local URL:

`/incidents/GHSA-g7cv-rxg3-hmpx`

Expected values:

- 3 total services;
- 2 impacted services;
- 1 confirmed execution;
- 2 exposure paths;
- 1 safe service;
- Checkout Service has a path to `@tanstack/router-core@1.169.5` and a build at 19:23 UTC;
- Admin Console has the same affected path, but its matching build is outside the incident window;
- Analytics Worker uses `@tanstack/router-core@1.169.9` and is safe;
- `@blastpath/demo-platform@2.4.0` is the top shared chokepoint;
- containment replay changes the observed result from 2 services and 2 paths to zero and leaves the baseline unchanged.

## Security limits

BlastPath is a demo and decision-support tool. It does not prove that a real package executed when build evidence is missing. It does not inspect runtime process data, package contents, source code, or real organizational systems.

The application does not accept user Cypher. It uses query templates and allowlists. API errors are safe and do not expose tokens or raw HydraDB credentials. The fixture set is synthetic.

## Known limitations

- The current P0 flow supports the committed npm lockfile v3 fixture shape.
- The UI displays one selected service path at a time.
- Containment is a non-destructive simulation. It does not update a lockfile, deploy a fix, or mutate HydraDB.
- HydraDB schema and native procedure behavior need live verification with the pinned Railway or local image.
- Railway must be able to pull the pinned GHCR image. A private image needs a read-only Railway registry credential.
- A real deployment needs secret management, access control, audit storage, and operational monitoring.

## Manual live test

Run the exact cloud procedure in [docs/quality/MANUAL_LIVE_TEST.md](docs/quality/MANUAL_LIVE_TEST.md). It covers Railway readiness, the real write/read/delete smoke proof, dry-run and real seed, Vercel health, integration tests, the dashboard workflow, remote Playwright, idempotency, baseline verification, shutdown, reset, and troubleshooting. A local Docker procedure remains in the same guide as a fallback.

Live verification is pending until that procedure is run with a real HydraDB node.

## Attribution and license

BlastPath uses HydraDB concepts and the approved Hack Hydra 2026 Track 2A product specification. The demo uses the approved OSV advisory reference and synthetic fixture data. See [research/SOURCE_LEDGER.md](research/SOURCE_LEDGER.md) for source notes.

This project is released under the [MIT License](LICENSE).

## Hackathon context

BlastPath is a Hack Hydra 2026 Track 2A submission. The product focus is evidence-first software supply-chain incident response with a small, reproducible demo graph.
