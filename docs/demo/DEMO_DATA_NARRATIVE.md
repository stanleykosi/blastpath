# Demo data narrative

All company, repository, build, owner, and `@blastpath/*` data is synthetic. The OSV ID, incident window, affected `@tanstack/router-core@1.169.5`, and fixed `1.169.9` are sourced facts.

Acme Demo has three services:

- Checkout is customer-critical. Its checkout shell depends on shared demo platform 2.4.0, which resolves affected router-core 1.169.5. Build `checkout-1842` used the exact fixture lockfile at 19:23 UTC, inside the 19:20–19:26 window.
- Admin Console uses a different shell but the same platform 2.4.0 and affected router-core. Its matching observed build is 18:45, outside the window. It remains currently exposed, but BlastPath does not claim incident-window execution.
- Analytics Worker uses demo platform 2.4.1 and fixed router-core 1.169.9. It provides the necessary package-name-versus-version negative control.

The shared platform 2.4.0 is the top chokepoint because it occurs on both dangerous service paths. Simulation excludes its edge to affected router-core, representing an upgrade to platform 2.4.1; both paths disappear. The simulator is explicitly not a package resolver.

Do not imply these are real Acme systems or real downstream TanStack dependency chains.
