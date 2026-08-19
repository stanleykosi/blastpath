# Acceptance criteria

P0 is done only when every item passes. “Implemented” means reachable through the product, not a dead module or mocked response.

## Phase A: code-complete gate

- [ ] Entire target tree in `SYSTEM_ARCHITECTURE.md` exists; production code, tests, configuration, license, and final README are authored.
- [ ] All routes conform to `API_CONTRACT.md`; all UI states in `FRONTEND_SPEC.md` are wired.
- [ ] Fixture parsing, normalization, collision checks, batch writing, marker verification, and idempotent seed are implemented.
- [ ] Baseline blast radius and exact path use HydraDB HTTP/native procedures; no mock/in-memory baseline fallback exists.
- [ ] Exposure classifier and replay are pure, bounded, deterministic functions.
- [ ] Every environment/input/database/API boundary is runtime-validated.
- [ ] Agent performs a read-only spec-to-code audit and records no known missing P0 item.
- [ ] No install/build/test/lint/format/server/database command has run before this gate.

## Phase B: functional outcomes

- [ ] Fresh HydraDB starts and passes write/read/delete smoke proof.
- [ ] Seed dry-run and real seed succeed; second seed produces identical identities/counts/results.
- [ ] Incident overview returns exactly 3 services, 2 impacted, 1 confirmed, 1 safe, 2 dangerous service paths.
- [ ] Checkout path is service → checkout shell → demo platform 2.4.0 → router-core 1.169.5.
- [ ] Admin path is service → admin shell → demo platform 2.4.0 → router-core 1.169.5.
- [ ] Analytics has no affected path because demo platform 2.4.1 uses router-core 1.169.9.
- [ ] Checkout is confirmed by same-digest build at 19:23 UTC; admin is current resolution only with matching build outside the interval; missing-build classifier unit case returns unknown.
- [ ] Chokepoint ranking puts demo platform 2.4.0 first with 2 services/2 paths.
- [ ] Replay excluding its vulnerable edge removes both impacted services and does not change a subsequent baseline request.
- [ ] Query inspector reports real HydraDB procedure/query IDs and contains no token.

## Quality gates

- [ ] Format, lint, strict typecheck, unit, contracts, integration, production build, and Playwright journey all pass.
- [ ] Malformed fixtures, unsafe replay IDs, absent seed, HydraDB timeout, and unknown wire tag produce specified safe errors.
- [ ] Keyboard workflow works; statuses have text; visible focus and reduced motion are supported; mobile has no page overflow.
- [ ] No secret, malicious payload, installable fixture project, real organizational data, or unsupported security claim is committed.
- [ ] Clean-clone setup is reproducible and documented.

## Demo readiness

- [ ] Cold start, seed, overview, detail, inspector, and replay succeed twice consecutively.
- [ ] Demo works without live OSV/deps.dev access.
- [ ] README explains why HydraDB is essential and labels synthetic data.
- [ ] Submission checklist is completed separately.
