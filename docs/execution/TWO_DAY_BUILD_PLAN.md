# Two-day build plan

The clock starts when implementation begins. Preserve a 10-hour submission buffer.

| Time | Deliverable | Cut/response if late |
|---|---|---|
| 0–2h | Read specs; create all configs/source/test skeletons; lock dependency list | No visual experiments |
| 2–7h | Implement types, schemas, IDs, fixture parsers, normalization, HydraDB client/templates/writer | Support only committed npm v3 fixtures |
| 7–12h | Implement repository, path codec/hydration, classification, chokepoint, replay | Keep one path per service if needed, never mock |
| 12–17h | Implement all API handlers and error mapping | No P1 upload/export |
| 17–24h | Implement all components/states and responsive command center | Static deterministic path layout |
| 24–27h | Author/finish all tests, README, Compose, env, license; Phase A audit | Freeze P0 design |
| 27–31h | First execution: install, static checks, unit/contracts; batch fixes | Remove unnecessary dependency, not assertions |
| 31–35h | HydraDB smoke, seed, integration; batch fixes | Ask Discord with minimal repro; use documented bounded query alternative only if native procedure is proven broken |
| 35–38h | Production build and E2E; accessibility/responsive pass | Cut animations/decorative polish |
| 38–40h | Two cold rehearsals; capture screenshots | Freeze code |
| 40–44h | Record/edit ≤2:50 video; finish README/submission copy | Local reliable demo beats unstable deploy |
| 44–48h | Upload, verify public links/form, submit with buffer | No feature work |

## Gates

- At 12h: normalized graph and query repository are code-complete by inspection.
- At 24h: full user workflow source exists; no P0 blank states.
- At 27h: Phase A checklist complete; testing may begin.
- At 35h: if HydraDB remains blocked, escalate with exact HTTP request/error. Do not conceal with mock data.
- At 40h: feature freeze.

The user explicitly chose write-all-code-first. That optimizes command latency but increases integration risk; compensate with unusually precise contracts and a single ordered verification pass after code completion.
