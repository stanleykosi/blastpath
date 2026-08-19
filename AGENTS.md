# BlastPath agent guide

Read `CONTEXT_INDEX.md` first and follow its order. Treat the referenced documents as requirements, not suggestions.

Always use ASD-STE100 Simplified Technical English when you communicate with the user. Apply this rule to explanations, questions, progress updates, summaries, and final responses. When you write or update `README.md` after implementation and testing, use ASD-STE100 for its prose so that non-technical readers can understand the codebase. Do not put this instruction itself in `README.md`.

## Execution contract

1. Implement every P0 source file and feature before running tests, builds, linters, formatters, servers, or HydraDB.
2. During implementation, perform read-only inspection only. Do not test partial work.
3. After the P0 code-complete gate, run the verification sequence in `docs/execution/CODEX_RUNBOOK.md` once, fix failures in batches, then rerun affected checks.
4. Do not add P1/P2 features until every P0 acceptance criterion passes.
5. Never invent exposure evidence. Use the confidence rules in `docs/engineering/SECURITY_AND_SAFETY.md`.
6. Use HydraDB for dependency traversal; no in-memory or mocked production fallback may produce the main blast-radius result.
7. Keep decisions consistent with `docs/execution/DECISION_LOG.md`; record any necessary deviation there.

Do not commit secrets, malicious payloads, downloaded package tarballs, or real organizational data.
