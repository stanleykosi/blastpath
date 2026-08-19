# Product brief

## One sentence

BlastPath helps an application-security incident commander prove which services are exposed to a malicious npm version, why each service is implicated, whether the dangerous version is known to have executed during the incident, and which single practical dependency change removes the most exposure paths.

## Problem

An advisory answers “which versions are malicious.” It does not answer the urgent organization-specific questions: which repositories resolve those versions, through which transitive chains, which builds ran during the malicious publication window, and what should be changed first. A current lockfile alone cannot prove historical execution.

## Primary user

An application-security or platform-security engineer coordinating a live dependency incident across multiple repositories.

## Required end-to-end workflow

1. The operator opens the seeded TanStack incident.
2. The system reports that the incident, three synthetic repositories, their npm lockfiles, and build evidence were ingested into HydraDB.
3. HydraDB reverse-traverses `DEPENDS_ON` relationships from affected package versions to service roots.
4. The dashboard ranks impacted services and shows one exact dependency path per result.
5. The application classifies each result using build timestamps: `confirmed_execution`, `current_resolution_only`, or `historical_status_unknown`.
6. The operator selects a service to inspect nodes, edges, source files, build evidence, and the executed HydraDB query.
7. The operator simulates upgrading the shared parent dependency in the synthetic scenario.
8. The system recomputes the graph result and shows which paths and services would be removed, without mutating the baseline graph.

## Required headline result

The seeded baseline must produce:

- `checkout-service`: impacted through a non-obvious multi-hop path and confirmed executed inside the window.
- `admin-console`: impacted through the same shared chokepoint, currently resolved, with no build proof inside the window.
- `analytics-worker`: safe because it resolves a non-affected version.

The replay must remove the two dangerous paths by replacing the shared vulnerable parent path with the safe version in an isolated scenario graph or deterministic query overlay. Baseline results must remain unchanged after leaving replay mode.

## Product principles

- Evidence before prose: every conclusion links to a path and input record.
- Honest uncertainty: absence of a build event is not evidence that execution did not occur.
- Graph as computation: HydraDB computes the core paths; visualization is secondary.
- Incident speed: the main answer is visible without configuration or open-ended chat.
- Demo determinism: no live third-party API is required during the recorded demo.

## Success statement

A judge can run one seed command, open one dashboard, understand the incident in under 20 seconds, inspect a real HydraDB path, see timestamp-based evidence change a classification, and watch one containment action eliminate multiple paths.
