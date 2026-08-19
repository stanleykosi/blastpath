# Judging alignment

The organizer did not publish weights. This mapping is a design checklist, not an official score.

| Criterion | What judges must see | Concrete artifact |
|---|---|---|
| Technical execution | Input becomes correct evidence, not a static mock | Real lockfile parser, idempotent seed, timestamps, five golden cases |
| HydraDB / graph-native | Core answer comes from traversal | Visible `SSpaths`/`SPpaths` request, returned ordered path, reverse dependency closure |
| Completeness / usability | One finished incident workflow | Overview → service evidence → replay; loading/error/empty states |
| Quality of results | Deterministic and appropriately uncertain | Golden expected output; three confidence classes; no historical overclaim |
| Originality | Response and containment rather than scanning | Cross-repo time proof, shared chokepoint, before/after path collapse |

## Best Use of HydraDB evidence

- Typed version-level graph, not package-name-only aggregation.
- Stable identity and reproducible batch ingestion.
- Incoming bounded traversal from affected version to dependent service roots.
- Exact native path procedure for explanation.
- Strong read after seed, snapshot-consistent visible results.
- Query inspector names HydraDB, procedure, parameters, limits, timing, and result count.

## Judge comprehension test

Within 30 seconds a judge should be able to say: “BlastPath found two exposed services by walking their transitive dependency graph in HydraDB; only one is proven to have built during the six-minute window; upgrading their shared parent removes both paths.”

## Do not claim

- That BlastPath detected the original compromise.
- That a lockfile proves malware executed.
- That the heuristic is a globally minimum graph cut.
- That synthetic repositories represent TanStack’s actual downstream users.
- That a deployed link is required; it is optional on the official form.
