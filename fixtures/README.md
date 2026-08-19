# Fixture set

Safe deterministic demo data for BlastPath.

- `incidents/`: normalized, attributed subset of a real OSV advisory; no payload.
- `organizations/`, `lockfiles/`, `build-events/`: wholly synthetic Acme Demo data.
- `expected/golden-cases.json`: machine-readable acceptance outcomes.

The lockfiles are parser fixtures only: no `package.json`, integrity URLs, tarball URLs, scripts, or actual package contents are provided. Never run `npm install` inside these directories. `@blastpath/*` names and all Acme metadata are fictional.

Every lockfile is npm lockfile v3. Build events reference its exact SHA-256 digest so timestamp evidence cannot attach to the wrong dependency snapshot.
