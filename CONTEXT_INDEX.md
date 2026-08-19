# BlastPath context index

This file is the entry point for implementation. Read documents in the order below. Each subject has exactly one canonical owner; linked files may summarize but must not override it.

## Required read order

1. `AGENTS.md` — non-negotiable work rules.
2. `docs/product/PRODUCT_BRIEF.md` — product behavior and success statement.
3. `docs/product/SCOPE_AND_NON_GOALS.md` — P0/P1/P2 boundaries.
4. `docs/quality/ACCEPTANCE_CRITERIA.md` — definition of code-complete and done.
5. `docs/engineering/SYSTEM_ARCHITECTURE.md` — stack, boundaries, and exact target tree.
6. `docs/engineering/GRAPH_SCHEMA.md` — identities, nodes, relationships, and invariants.
7. `docs/engineering/HYDRADB_INTEGRATION.md` — transport, queries, batching, and limitations.
8. `docs/engineering/DATA_INGESTION.md` — deterministic parse/normalize/write pipeline.
9. `docs/engineering/API_CONTRACT.md` — HTTP request/response schemas and errors.
10. `docs/engineering/FRONTEND_SPEC.md` — routes, components, states, and interactions.
11. `docs/engineering/CONFIGURATION.md` and `SECURITY_AND_SAFETY.md`.
12. `docs/quality/GOLDEN_CASES.md` and `TEST_PLAN.md`.
13. `docs/execution/TWO_DAY_BUILD_PLAN.md` and `CODEX_RUNBOOK.md`.
14. `docs/demo/DEMO_DATA_NARRATIVE.md` and `DEMO_SCRIPT.md`.

Read `docs/hackathon/*`, `docs/product/WINNING_THESIS.md`, and `research/*` when writing the public README, submission, or pitch. They explain why the fixed requirements exist.

## Canonical ownership

| Subject | Canonical file |
|---|---|
| Product promise and user workflow | `docs/product/PRODUCT_BRIEF.md` |
| Included/excluded work and priority | `docs/product/SCOPE_AND_NON_GOALS.md` |
| Implementation structure and dependencies | `docs/engineering/SYSTEM_ARCHITECTURE.md` |
| Graph semantics and stable IDs | `docs/engineering/GRAPH_SCHEMA.md` |
| HydraDB API and Cypher | `docs/engineering/HYDRADB_INTEGRATION.md` |
| REST API | `docs/engineering/API_CONTRACT.md` |
| UI behavior | `docs/engineering/FRONTEND_SPEC.md` |
| Exposure truth/confidence | `docs/engineering/SECURITY_AND_SAFETY.md` |
| Pass/fail outcomes | `docs/quality/ACCEPTANCE_CRITERIA.md` |
| Work ordering | `docs/execution/CODEX_RUNBOOK.md` |

If two documents appear inconsistent, obey the canonical owner, record the conflict in `docs/execution/DECISION_LOG.md`, and make the smallest consistent change. Do not silently reinterpret requirements.

## Code-complete-before-test rule

Implementation has two macro phases:

- **Phase A — write all P0 code:** create the entire target tree, implement all modules, wire all routes, add all tests without executing them, and complete static self-review against the specs. Allowed commands are read-only inspection (`pwd`, `ls`, `find`, `rg`, `sed`, `git diff`).
- **Phase B — verify:** only after every Phase A checkbox in `CODEX_RUNBOOK.md` is complete, install dependencies, start HydraDB, run formatting/type/build/unit/integration/E2E checks in the prescribed order, repair failures by subsystem, and re-run.

This rule delays execution; it does not permit untested final work. Do not run one test after each file. Do not suppress checks, weaken assertions, replace HydraDB with mocks, or mark incomplete work as passing.

## Change policy

- P0 changes are allowed when required to make the specified product work.
- P1 requires all P0 acceptance criteria to pass first.
- P2 is out of scope for this hackathon build.
- New production dependencies require a short entry in `DECISION_LOG.md` stating purpose and why an existing dependency cannot do it.
- Never modify fixture expected outcomes merely to match faulty code; correct the code or document a proven fixture defect.
