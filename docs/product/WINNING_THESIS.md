# Winning thesis

## Position

Do not pitch BlastPath as a vulnerability scanner or dependency visualizer. Existing products already identify vulnerable dependencies. Pitch it as the incident-response layer after an indicator of compromise arrives:

> Most scanners tell you a package is bad. BlastPath proves where it reached and which action cuts the most exposure paths.

## Differentiation that must be visible

1. **Temporal proof:** a build event inside the incident interval creates stronger evidence than a current lockfile. The UI explains the difference.
2. **Organization scope:** one advisory fans out across repositories, services, lockfiles, builds, and owners.
3. **Exact graph evidence:** every impacted service has an inspectable multi-hop HydraDB path.
4. **Containment replay:** a shared chokepoint is ranked and one proposed dependency change visibly removes multiple paths.
5. **Inspectable HydraDB:** the UI shows the real procedure name, parameters, direction, maximum depth, and sanitized returned path.

## Judging alignment

- Technical execution: real lockfile parsing, normalized graph ingestion, native traversal, temporal classification, deterministic replay.
- Graph-native HydraDB use: reverse dependency closure and exact path evidence are the product, not an add-on.
- Completeness and usability: one coherent incident workflow with loading, empty, error, and evidence states.
- Quality: five golden cases and no unsupported claims about execution.
- Originality: proof and containment over an organization, rather than another alert list.

## Win conditions

- The deepest exposure path is at least four graph edges from service to advisory evidence and is not obvious from a top-level dependency list.
- A timestamp changes the operational classification of at least one service.
- The same dependency chokepoint appears in two service paths.
- One replay action reduces impacted services from two to zero in the seeded scenario.
- The full story fits in 2:50 and works without network access after images/dependencies are available.

## Failure signal

If the product’s main view could be described as “a vulnerability table next to a force-directed graph,” stop adding feeds and complete the evidence, temporal classification, query inspector, and containment replay.
