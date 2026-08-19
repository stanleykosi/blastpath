# Graph schema

## Identity algorithm

Every node and edge has a stable non-negative 63-bit integer `id` and a canonical string `key`.

1. Construct the exact key formats below using Unicode NFC and no surrounding whitespace.
2. Compute SHA-256 over UTF-8 bytes.
3. Read the first 8 digest bytes as an unsigned big-endian integer.
4. Clear the highest bit with `value & 0x7fffffffffffffff`.
5. If the result is zero, use `1`.
6. During normalization, maintain `Map<number,string>` and fail with `ID_COLLISION` if one ID maps to two keys.

JavaScript numbers cannot safely represent 63-bit integers. Keep IDs as decimal strings in application/domain/API JSON. Convert to `bigint` for hashing and HydraDB request serialization; encode HTTP parameters as JSON numbers only after asserting `id <= 9007199254740991`. Therefore the implementation must additionally mask to **53 bits** (`value & 0x1fffffffffffff`) before the zero rule. This 53-bit restriction is the canonical implementation rule for JSON safety.

## Node labels and keys

| Label | Key format | Required properties |
|---|---|---|
| `Organization` | `org:<slug>` | `key,name,fixture` |
| `Service` | `service:<org>/<slug>` | `key,name,owner,criticality,fixture` |
| `Repository` | `repo:<org>/<slug>` | `key,name,url,fixture` |
| `Lockfile` | `lockfile:<repo-key>/<sha256>` | `key,digest,path,lockfile_version,fixture` |
| `Build` | `build:<repo-key>/<build-id>` | `key,build_id,commit_sha,timestamp_iso,timestamp_ms,environment,fixture` |
| `Package` | `pkg:npm/<percent-encoded-name>` | `key,name,ecosystem,fixture` |
| `PackageVersion` | `<package-key>@<version>` | `key,name,version,ecosystem,fixture` |
| `Advisory` | `advisory:<osv-id>` | `key,osv_id,summary,severity,window_start_iso,window_start_ms,window_end_iso,window_end_ms,source_url,fixture` |
| `SeedRun` | `seed:blastpath-demo-v1` | `key,version,created_at_iso,fixture` |

All HydraDB properties are strings, integers, floats, or booleans. Do not store arrays, objects, null, or dates.

## Relationships

| Direction | Type | Meaning |
|---|---|---|
| `Organization -> Repository` | `OWNS` | synthetic organization scope |
| `Repository -> Service` | `PRODUCES` | service root for dependency traversal |
| `Repository -> Lockfile` | `HAS_LOCKFILE` | exact source/digest |
| `Service -> PackageVersion` | `DEPENDS_ON` | root dependency edge |
| `PackageVersion -> PackageVersion` | `DEPENDS_ON` | resolved child dependency |
| `Lockfile -> PackageVersion` | `RESOLVES` | version exists in that lockfile |
| `Build -> Lockfile` | `USES` | build used exact digest |
| `Repository -> Build` | `HAS_BUILD` | build provenance |
| `PackageVersion -> Package` | `VERSION_OF` | name-level grouping |
| `Advisory -> PackageVersion` | `AFFECTS` | exact affected version |
| `SeedRun -> Organization` | `SEEDED` | seed completeness marker |

Relationship key: `edge:<TYPE>:<source-key>-><target-key>:<source-ref>`. `source-ref` is lockfile package path for dependencies and `default` otherwise. Required properties: `id,key,source_ref,fixture`.

## Dependency invariants

- A `DEPENDS_ON` edge target is always `PackageVersion`; source is `Service` or `PackageVersion`.
- Create one package-version node per exact resolved name/version, even if repeated in lockfile paths.
- A service connects to each root package at lockfile path `node_modules/<name>`.
- A package version at path `P` connects to its resolved dependency at `P/node_modules/<child>` when present; otherwise follow npm lockfile resolution upward to the nearest ancestor `node_modules/<child>`, then root. The parser must implement Node’s lockfile path resolution deterministically.
- Deduplicate identical source-ID/type/target-ID/source-ref edges.
- Advisory affects only exact package/version pairs listed in the normalized fixture.

## Path validity

A baseline exposure path is valid only if it contains exactly one `Service` endpoint, one affected `PackageVersion` endpoint, only `DEPENDS_ON` edges, no repeated node ID, at most 8 edges, and all metadata IDs can be hydrated. Reject malformed paths rather than guessing.

## Synthetic scenario topology

Both impacted services must share `@blastpath/demo-platform@2.4.0`, which depends on real affected `@tanstack/router-core@1.169.5`. `checkout-service` reaches the shared parent through `@blastpath/checkout-shell@4.2.0`; `admin-console` reaches it through `@blastpath/admin-shell@3.8.0`. `analytics-worker` uses `@blastpath/demo-platform@2.4.1`, which resolves fixed `@tanstack/router-core@1.169.9`. Packages under `@blastpath/*` are synthetic and must be labeled as such in fixture documentation.
