# Scope and non-goals

## P0: implement completely

- Single Next.js TypeScript application with server-only HydraDB access.
- Deterministic CLI seed path for the provided three `package-lock.json` v3 fixtures, normalized advisory, organization metadata, and build events.
- Stable 63-bit IDs, idempotent node/edge upserts, and an ingestion summary.
- HydraDB HTTP client, write/read health proof, reverse blast-radius query, exact-path query, and query metadata for the inspector.
- Incident overview, service ranking, evidence/path detail, timeline classification, chokepoint ranking, and non-destructive what-if replay.
- Responsive desktop-first interface with intentional empty/loading/error states and accessible keyboard interactions.
- Unit, contract, integration, and browser tests authored during code phase and executed only at the verification gate.
- Final README, `.env.example`, Docker Compose or equivalent reproducible HydraDB launcher, license, attribution, and diagrams.

## P1: only after all P0 checks pass

- Upload one additional npm lockfile v3 through the UI.
- Optional deps.dev enrichment cached behind a timeout.
- Public deployment if HydraDB can be hosted reliably.
- Export an incident report as JSON.

## P2: do not implement during the hackathon

- PyPI, Cargo, Maven, pnpm, or Yarn parsing.
- Live GitHub/GitLab OAuth, repository crawling, webhooks, or automated pull requests.
- Full npm registry graph, maintainer/infrastructure propagation, typosquat detection, or credential rotation automation.
- LLM chat, generated remediation prose, embeddings, RAG, or vector databases.
- Authentication, multi-tenancy, billing, persistent user accounts, or production-grade authorization.
- Executing package-manager install commands on fixture packages or downloading malicious tarballs.
- Editing HydraDB source, implementing a second graph engine, or silently falling back to in-memory traversal.
- Globally optimal graph-cut claims. P0 uses a transparent shared-path-frequency heuristic.

## Fixed simplifications

- One advisory and one incident window in the demo.
- Three synthetic services, one organization, one environment per build event.
- Use real package names/affected version facts only where cited; organization and dependency arrangement are synthetic.
- Maximum dependency traversal depth: 8. Fixture paths are no deeper than 5.
- All timestamps are UTC ISO 8601 plus epoch milliseconds.
- Replay is computed from a deterministic edge exclusion/replacement input and must not mutate baseline stored data.

## Scope arbitration

When time is short, preserve in this order: correct HydraDB path result, evidence confidence, exact path detail, replay, usable UI, visual polish, P1. Never cut correctness, truth labels, fixture determinism, or the visible HydraDB proof.
