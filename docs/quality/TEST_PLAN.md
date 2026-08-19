# Test plan

Tests are authored with the source in Phase A but none are executed until the code-complete gate.

## Required suites

### Unit (`tests/unit`)

- Stable 53-bit hash: deterministic, positive, JSON-safe, collision guard.
- npm v3 root/nested/hoisted resolution and malformed entry rejection.
- Advisory exact-version normalization and interval validation.
- Build digest join and inclusive boundary timestamps.
- Four exposure classifications and precedence.
- Chokepoint ranking/tie order; replay validation/non-mutation; path validation/order/ID.

### Contract (`tests/contracts`)

- Every committed fixture passes its schema; expected digests/counts are exact.
- API success/error DTOs parse with shared Zod schemas.
- HydraDB tagged cell decoder handles all used tags and rejects unknown/malformed tags.
- Query templates contain required procedure/direction/depth and no interpolated fixture values.
- Environment rejects missing/unsafe token/URL/value bounds.

### Integration (`tests/integration`, real HydraDB)

- HTTP mutation/read/delete smoke.
- Clean seed and strong marker verification.
- G1, G2, G3 exact paths; hydration; query evidence.
- G5 replay plus baseline immutability; G6 reseed.
- Authorization failure and bounded timeout map to safe error.

Integration tests must skip only when an explicit `SKIP_HYDRADB_INTEGRATION=true` is set; `npm run verify` must reject that variable.

### Browser (`tests/e2e`)

One Playwright journey: open incident; verify metrics; select checkout and path; expand query inspector; verify `algo.SPpaths` or `SSpaths`; run replay; observe 2→0 and disclaimer; reset; select analytics safe row. Also assert no horizontal overflow at 390×844 and no console errors.

## Verification order

1. `npm ci`
2. `npm run format:check`
3. `npm run lint`
4. `npm run typecheck`
5. `npm run test:unit`
6. `npm run test:contracts`
7. Start pinned HydraDB; `npm run smoke:hydradb`
8. `npm run seed:dry`; `npm run seed`; `npm run test:integration`
9. `npm run build`
10. Start production app; `npm run test:e2e`
11. Run seed a second time and integration golden summary.

Fix failures in batches by layer (types/contracts, ingestion, HydraDB, API, UI). Re-run the failed suite plus every later dependent suite. Never update expected results merely to achieve green output.
