# Risk register

| Risk | Likelihood/impact | Early signal | Mitigation | Cut/escalation |
|---|---|---|---|---|
| HydraDB local/image issue | high/high | smoke mutation fails | pin 0.1.1/digest, HTTP, official env, deterministic reseed | minimal repro to Discord; no mock |
| Native path incompatibility | medium/high | SS/SP procedure error/malformed path | exact documented syntax, depth 8, simple named edges | proven bounded MATCH alternative, disclose |
| Write/body limits | medium/medium | 413/timeout | 200-row batches, body cap, one type per statement | smaller batches |
| Incorrect npm hoisting | medium/high | golden path differs | implement nearest-ancestor resolution; fixture contract tests | restrict to committed v3 fixtures |
| Temporal overclaim | medium/high | UI says infected from lockfile | canonical truth table/copy tests | remove claim, not uncertainty |
| Fixture looks fabricated | medium/high | judge confusion | persistent synthetic label; real OSV/TanStack provenance | explain at 0:20 in demo |
| Generic scanner impression | high/high | demo leads with vuln table | show time proof/query/replay first | cut feeds, sharpen flow |
| Delayed testing integration pile-up | high/high | many Phase-B failures | precise boundaries, authored tests, layer batches | freeze features; repair core |
| Demo external outage | medium/high | OSV/API unavailable | committed safe normalized fixture; no live dependency | run local |
| Video exceeds 3:00 | medium/high | rehearsal >2:50 | fixed script/time boxes | cut vision, never product proof |
| Deadline/timezone error | low/critical | work near final hour | use 06:59 UTC, submit 10h early | stop deploy/polish |

Risk owner is the implementing agent until a human name is added. Update status, evidence, and mitigation changes; never delete closed risks.
