# Source ledger

All sources accessed 2026-08-18. Official/primary sources are preferred.

## Event

- https://hackhydra.hydradb.com — tracks, prizes, judging, rules, submission, FAQ, canonical event facts.
- https://hackhydra.hydradb.com/#tracks — Track 2A exact prompt.
- https://luma.com/h038glzk — machine-readable `America/Los_Angeles` dates and global/free/team summary.
- https://forms.gle/WEwqEmmN7Bkp4HyJ6 — official submission form landing page.

## HydraDB

- https://github.com/hydra-db/hydradb — official AGPL repository; researched main commit `6a2fbb192f37f51a93690a2ae2d2f5e27e6e4219`.
- https://github.com/hydra-db/hydradb/blob/main/README.md — startup, HTTP body, paths, consistency.
- https://github.com/hydra-db/hydradb/blob/main/architecture.md — snapshots, storage, indexes, failures.
- https://github.com/hydra-db/hydradb/blob/main/cypher-compat.md — exact query subset/batch/path syntax.
- Issues https://github.com/hydra-db/hydradb/issues/81, /88, /95, /98 — local storage, scripts, multi-hop correctness, Bolt decoding risks.

## Incident and machine-readable data

- https://tanstack.com/blog/npm-supply-chain-compromise-postmortem — official 84 versions/42 packages, six-minute window, mechanism/response.
- https://osv.dev/vulnerability/GHSA-g7cv-rxg3-hmpx and https://api.osv.dev/v1/vulns/GHSA-g7cv-rxg3-hmpx — exact affected package/version evidence. Fixture is a documented safe subset, not a verbatim full record.
- https://openssf.org/blog/2026/05/20/detecting-malicious-packages-using-the-osv-api/ — malicious-package records and lockfile/SBOM scanning.
- https://docs.deps.dev/api/v3/ — optional public resolved dependency/version data; not required at demo runtime.

## Competitive baseline

- https://github.com/google/osv-scanner — existing lockfile/SBOM vulnerability/malware scan baseline.
- https://docs.github.com/en/enterprise-cloud@latest/code-security/concepts/supply-chain-security/supply-chain-security — GitHub dependency graph/Dependabot baseline.
- https://docs.guac.sh/guac/ — graph-based supply-chain metadata, paths, response, and patch planning baseline.

## Codex context design

- https://learn.chatgpt.com/docs/agent-configuration/agents-md — official OpenAI documentation for repository instruction discovery; basis for short `AGENTS.md` plus routed detailed documents.

Do not add a source without stating why it changes implementation, validation, positioning, or attribution.
