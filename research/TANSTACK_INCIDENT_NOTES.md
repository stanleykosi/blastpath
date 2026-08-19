# TanStack incident notes

## Confirmed source facts

TanStack’s official postmortem and OSV advisory report 84 malicious versions across 42 `@tanstack/*` npm packages, published on 2026-05-11 in two batches between approximately 19:20 and 19:26 UTC. The malicious install behavior targeted developer/CI credentials and could propagate through maintained packages. Environments that installed an affected version during the period warrant incident response.

The committed fixture uses OSV `GHSA-g7cv-rxg3-hmpx`, severity critical, and only one exact affected pair needed for a safe deterministic demo: `@tanstack/router-core@1.169.5`, with `1.169.9` as the fixed negative control. This is a subset of the advisory, not a claim that only one version was affected.

## Safety and presentation

- Never download/execute affected packages or store payload content.
- Do not claim the synthetic services were real victims or that their dependency chains existed publicly.
- “Confirmed execution” is limited to a synthetic build using the exact lockfile during the window; it does not prove exfiltration.
- Cite https://tanstack.com/blog/npm-supply-chain-compromise-postmortem and https://osv.dev/vulnerability/GHSA-g7cv-rxg3-hmpx.

## Why this incident works for the demo

The six-minute window makes timestamp evidence visually meaningful, affected package versions are machine-readable, and the speed/scale makes a clear case for graph-assisted response without depending on an LLM or huge benchmark.
