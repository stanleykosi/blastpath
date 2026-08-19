# Security and safety

## Exposure truth table

Classification runs only after HydraDB establishes a current affected path.

| Current affected path | Matching build evidence | Classification |
|---|---|---|
| no | any | `safe` |
| yes | same lockfile digest, timestamp inside inclusive incident interval | `confirmed_execution` |
| yes | one or more matching builds, all outside interval | `current_resolution_only` |
| yes | no matching build record | `historical_status_unknown` |

If both inside and outside events exist, `confirmed_execution` wins. Interval endpoints are inclusive. Compare epoch milliseconds, display UTC. Never use local timezone for logic.

`confirmed_execution` means the build/install workflow used the affected lockfile during the window. It does not prove credentials were stolen. Copy must say “treat the environment as potentially compromised and investigate/rotate accessible credentials,” not “credentials were stolen.”

## Fixture safety

- Store advisory metadata and exact affected name/version pairs only.
- Never store or download the malicious tarball, `router_init.js`, executable payload, credential samples, attacker scripts, or live exfiltration endpoints beyond non-clickable research description where necessary.
- Synthetic `@blastpath/*` packages are data records only and must never be published or installed.
- The lockfiles contain no integrity/download URLs and are parser fixtures, not installable projects.

## Input and API safety

- Zod-validate all external data and impose file/body/array/string limits.
- No user-provided Cypher. Cypher templates are constants; relationship/label selection uses allowlists.
- Parameterize all values.
- Do not accept arbitrary fixture paths through HTTP.
- Escape UI text through React defaults; no `dangerouslySetInnerHTML`.
- Source links must be fixed `https` URLs from fixture validation.
- Apply same-origin POST checks and JSON content-type checks to seed/replay.

## Secret handling

HydraDB token stays in server environment and ignored token file. Redact keys matching `authorization`, `token`, `secret`, `password`, or `cookie` from logs/errors recursively. Never serialize environment objects. Query inspector receives a dedicated safe DTO.

## Availability and bounds

15-second HydraDB timeout, one retry only for transient reads, batches <=200, traversal depth 8, path result limit 500 per affected version, hydration concurrency 6, replay edge list <=10. Abort oversized/unknown protocol data.

## Honest demo labels

Persistent banner: “Demo organization and build records are synthetic. Advisory/package facts are sourced from OSV and TanStack.” Replay disclaimer: “Simulation over observed paths; no lockfile, repository, or HydraDB baseline was changed.”
