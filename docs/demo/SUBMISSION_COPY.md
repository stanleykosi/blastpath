# Submission copy

## Short description

BlastPath is a HydraDB-powered software-supply-chain incident command center that proves organization-wide transitive exposure, separates current resolution from incident-window execution evidence, and simulates the containment action that cuts the most dangerous paths.

## Problem

When a malicious package version is disclosed, security teams already know the indicator. They still lack a fast, defensible answer to which services resolve it transitively, which builds ran during the attack window, why each service is implicated, and what to contain first.

## What we built

BlastPath parses npm lockfiles, a real OSV advisory, and timestamped build evidence into a version-level HydraDB graph. It reverse-traverses affected versions to services, returns exact evidence paths, applies honest temporal confidence labels, ranks shared dependency chokepoints, and replays a proposed containment change without mutating baseline evidence.

## Why HydraDB

HydraDB is the core computation. Directed `DEPENDS_ON` relationships and native bounded `algo.SSpaths`/`algo.SPpaths` queries calculate cross-repository blast radius and exact explanations. Batch `UNWIND` ingestion makes the graph reproducible. A vector or keyword search cannot guarantee complete transitive closure or ordered path evidence.

## Data disclosure

The TanStack advisory and affected-version facts are real and attributed. The organization, repositories, dependency arrangement, and build events are synthetic demonstration data. BlastPath contains no malicious payload and executes no package installs.

## Tech stack

Next.js, React, TypeScript, HydraDB HTTP/OpenCypher/native path procedures, Zod, Tailwind CSS, Vitest, Playwright, and Docker Compose.

Replace placeholders only after verification: repository `[URL]`, demo `[URL]`, deployed app `[optional URL]`, team/contributions `[names]`.
