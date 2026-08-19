# Frontend specification

## Visual direction

An incident command console, not a generic SaaS dashboard: near-black navy background, warm off-white text, restrained red/amber/green status colors, cyan for HydraDB/query evidence, subtle grid/noise texture, and strong monospace accents for package names and IDs. Use system sans for body and a bundled/local monospace fallback; do not depend on remote fonts during demo.

Desktop target is 1440×900 recording at 100% zoom. Responsive down to 390 px without horizontal page scrolling. Respect `prefers-reduced-motion`. Minimum contrast 4.5:1 for normal text.

## Routes

- `/`: server-rendered landing/redirect that loads incident list and sends the user to the only seeded incident. If unseeded, show one clear seed instruction/button when enabled.
- `/incidents/GHSA-g7cv-rxg3-hmpx`: main command center.
- No separate settings, auth, upload, or marketing pages in P0.

## Main page layout

1. Top bar: BlastPath wordmark, “HydraDB connected” state, “Demo data” badge.
2. Incident header: critical badge, OSV ID, one-line summary, six-minute UTC window, source link.
3. Four metric cards: 2 impacted, 1 confirmed in window, 2 exposure paths, 1 safe.
4. Two-column body, 62/38 split:
   - left: service exposure table and selected evidence path;
   - right: timeline and containment panel.
5. Collapsible full-width query inspector below.

## Service table

Columns: status, service, owner, evidence, shortest path, action. Rows are keyboard-selectable buttons, not nested links. Status labels must use text plus icon/color. Safe row remains visible. Default selection is `checkout-service`.

Status copy:

- `Confirmed execution` — “Build used this lockfile during the incident window.”
- `Current resolution only` — “Affected version is resolved now; observed builds are outside the window.”
- `History unknown` — “Affected version is resolved now; no matching build record was supplied.”
- `No affected path` — “HydraDB found no path to an affected version.”

## Evidence path

Render a deterministic left-to-right chain, not a free-moving force graph. Cards show service/package, exact version, and edge source reference. Dangerous endpoint is red; shared chokepoint has amber “shared by 2 services”; root service is off-white. On mobile, render vertical. Provide an ordered text list for screen readers.

Selecting a row fetches detail, shows a skeleton during load, preserves previous overview, and displays a retry panel on failure. No fake client-side path substitution.

## Timeline

Show the interval 19:20–19:26 UTC as a shaded red band. Plot build events with label, exact UTC time, environment, and in/out-of-window state. If none, show “No matching build evidence supplied,” never “not executed.”

## Containment panel

Show top shared chokepoint, affected services count, exact proposed label “Upgrade @blastpath/demo-platform from 2.4.0 to 2.4.1,” and button “Simulate containment.” On click, POST replay, animate counts only when reduced motion is off, and show baseline 2 → simulated 0 plus removed service names. Clearly label “Simulation—no lockfile was changed.” Provide “Reset simulation.”

## Query inspector

Collapsed label: “How HydraDB proved this.” Expanded content: engine, procedure, direction=incoming, max depth=8, sanitized Cypher, parameter table, elapsed time, and result count. Copy button copies only safe query and parameters. Do not expose headers/token.

## Required states

- Initial server loading skeleton; detail loading; replay pending disabled button.
- Unseeded graph with exact `npm run seed` instruction.
- HydraDB unavailable with safe message and retry.
- No impacted paths (valid empty result).
- Malformed protocol/server error without stack trace.
- Narrow/mobile layout.

## Accessibility

Semantic headings, table headers, visible focus, buttons with names, `aria-live="polite"` for replay summary, no status conveyed by color alone, Escape closes any mobile disclosure, and all core workflow usable by keyboard.
