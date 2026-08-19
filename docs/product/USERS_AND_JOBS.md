# Users and jobs

## Primary persona

**Rina, application-security incident commander**

- Owns response across many services but does not own their code.
- Receives an advisory identifier and a narrow time window.
- Needs defensible answers quickly enough to quarantine builds and rotate credentials.
- Distrusts unexplained AI summaries and needs paths she can hand to service owners.

## Jobs to be done

| Priority | Job | Required product response |
|---|---|---|
| P0 | Find all currently implicated services | Ranked service list derived from HydraDB paths |
| P0 | Explain why a service is implicated | Exact ordered nodes/edges, lockfile source, advisory source |
| P0 | Determine whether execution is proven | Timestamp classification with plain-language reason |
| P0 | Decide what to contain first | Shared-chokepoint count and deterministic proposed change |
| P0 | Validate the recommendation | Before/after replay counts and paths |
| P1 | Import another local npm lockfile | Safe upload or CLI ingestion with validation |
| P2 | Connect a live organization | Explicitly excluded from hackathon scope |

## Questions the UI must answer

- How many services are impacted now?
- Which are confirmed to have built during the malicious window?
- What exact dependency chain reaches the malicious version?
- Which input proves each node and timestamp?
- Which dependency is shared across multiple dangerous paths?
- What changes after the proposed upgrade?
- What remains unknown?

## Terminology

- **Impacted:** a current graph path reaches an affected version.
- **Confirmed execution:** an ingested build/install event references the same lockfile digest and occurred inside the incident window.
- **Current resolution only:** impacted now, but available build events are outside the window.
- **Historical status unknown:** impacted now and no relevant build event exists.
- **Safe:** no graph path to any version affected by the selected advisory.
- **Chokepoint:** a non-root package-version node shared by two or more impacted service paths; this is a heuristic, not a mathematically proven global minimum cut.
