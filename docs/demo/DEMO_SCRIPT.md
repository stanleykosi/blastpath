# Demo script (target 2:45)

## 0:00–0:18 — stakes

“In May, 84 malicious TanStack versions appeared across 42 packages in two batches six minutes apart. A scanner can name the bad version. During response, I need to know where it reached and what to contain first.” Show incident header/window.

## 0:18–0:36 — real ingestion

“BlastPath ingested three npm lockfiles, build evidence, and the real OSV advisory into HydraDB. The organization is synthetic and clearly labeled; the advisory facts are real.” Show connected badge and counts, not terminal typing.

## 0:36–1:05 — blast radius

“HydraDB reverse-traverses from the affected version. Checkout and admin are exposed through transitive chains; analytics is safe on the fixed version.” Select checkout and trace service → checkout shell → shared platform → affected router-core.

## 1:05–1:28 — temporal proof

“Checkout built at 19:23, inside the malicious window, so execution is confirmed at the build level. Admin’s observed build is earlier, so we report current resolution only. We never turn missing history into false certainty.” Show timeline and status copy.

## 1:28–1:50 — HydraDB proof

Expand inspector. “This is not a precomputed graph or LLM answer. Here is the actual bounded HydraDB incoming path procedure, parameters, query IDs, timing, and returned path.” Keep token absent.

## 1:50–2:20 — contain

“Both services share the same dependency chokepoint. BlastPath recommends upgrading the shared platform. In simulation, that one edge change removes both dangerous paths—from two impacted services to zero—without mutating evidence.” Click and show 2→0/disclaimer.

## 2:20–2:45 — close

“BlastPath turns a known indicator into defensible organizational evidence and a prioritized response. Next: CI provenance, more ecosystems, and maintainer infrastructure. Most scanners tell you a package is bad. BlastPath proves where it reached and which action cuts the paths.”

Record at 1080p, hide notifications/bookmarks, pre-seed, use 100% zoom, and retain 15 seconds of deadline margin.
