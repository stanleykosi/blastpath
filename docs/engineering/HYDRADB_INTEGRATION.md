# HydraDB integration

## Runtime pin and transport

Use `ghcr.io/hydra-db/hydradb:0.1.1` initially and record the resolved image digest in `DECISION_LOG.md` after the first pull. Never use `latest` in final Compose. Use plaintext HTTP only on loopback/local Docker networking. Default values:

- query URL: `http://127.0.0.1:8443/v1/graphs/default/query`
- admin readiness: `http://127.0.0.1:9090/readyz`
- namespace header: `X-Graph-Namespace: default`
- cell: `cell-0`
- bearer token read from `HYDRADB_TOKEN`

HTTP request body:

```json
{
  "cell_id": "cell-0",
  "query_id": "blastpath-<operation>-<uuid>",
  "query": "<one Cypher statement>",
  "parameters": {},
  "timeout_ms": 15000,
  "page_size": 1000,
  "consistency": "causal"
}
```

Response is `{query_id, columns, rows, read_epoch, next_cursor, bookmark}`. Each cell is tagged, for example `{type:"integer",value:1}`, `{type:"vertex_id",value:2}`, `{type:"string",value:"x"}`, or `{type:"path",value:{...}}`. Decoder must reject an unknown tag with `HYDRADB_PROTOCOL_ERROR`; do not cast blindly.

## Startup configuration

Compose must reproduce the official local-node environment: `CLOUD_PROVIDER=local`, existing `/data/store`, graph namespace/id `default`, cell `cell-0`, node `node-0`, Bolt and advertised address, `/data/cache`, token file, plaintext enabled, and `RUST_MIN_STACK=33554432`. Mount a named or ignored host directory; never commit state or token files.

## Required smoke proof

After Phase A and before the full suite:

1. `/readyz` returns success.
2. Create two disposable `Smoke` nodes and one `SMOKE_LINK` edge through HTTP.
3. Match the edge and assert the destination ID.
4. Delete both nodes with `DETACH DELETE`.

Listening ports alone are not success.

## Write templates

All values are parameters. Batch size is 200 rows maximum and should also remain below the default 1 MiB body limit.

```cypher
UNWIND $rows AS row
MERGE (n {id: row.id})
SET n:PackageVersion, n.key = row.key, n.name = row.name, n.version = row.version, n.ecosystem = row.ecosystem, n.fixture = row.fixture
```

Create a separate literal query per node label because labels cannot be parameters. For relationships:

```cypher
UNWIND $rows AS row
MATCH (s {id: row.source}), (d {id: row.target})
MERGE (s)-[r:DEPENDS_ON {id: row.id}]->(d)
SET r.source_ref = row.source_ref, r.fixture = row.fixture
```

Create a separate literal template per allowed relationship type. Never interpolate user input; select from a closed mapping in code. HydraDB requires one directed one-hop relationship pattern per batch.

## Read templates

Affected entry points:

```cypher
MATCH (a:Advisory {key: $advisory_key})-[:AFFECTS]->(v:PackageVersion)
RETURN v.id AS version_id
ORDER BY version_id
```

Reverse blast paths, once per affected version:

```cypher
CALL algo.SSpaths({sourceNode: $source, relTypes: ['DEPENDS_ON'], relDirection: 'incoming', maxLen: 8, pathCount: 100, resultLimit: 500})
YIELD path
RETURN path
```

Exact explanation from affected version toward one service:

```cypher
CALL algo.SPpaths({sourceNode: $affected, targetNode: $service, relTypes: ['DEPENDS_ON'], relDirection: 'incoming', maxLen: 8, pathCount: 5})
YIELD path, pathWeight, pathCost
RETURN path, pathWeight, pathCost
```

Because stored dependency edges point `Service -> PackageVersion -> PackageVersion`, incoming traversal begins at the affected version and ends at the service. Normalize the displayed path to service-first order.

Metadata hydration should use bounded ID lookups. If one multi-ID query is unsupported, issue capped parallel scalar lookups (concurrency 6); never run an unbounded label scan in a request.

## Consistency and idempotency

- Writes use unique `query_id`; deterministic `MERGE` IDs make reruns safe.
- Preserve the latest returned bookmark during a seed run.
- The final seed verification uses `consistency:"strong"` and checks `SeedRun.key = "blastpath-demo-v1"`.
- Normal dashboard reads use `causal`; retry once on transient network/5xx with 150 ms jitter. Do not retry validation, auth, or Cypher 4xx errors.

## Known limitations to design around

Numeric non-negative node IDs; scalar node/edge properties; bounded paths only; default maximum 16 hops; no `RETURN *`, undirected patterns, `IN`, `IS NULL`, unbounded traversal, or arbitrary projections. Prefer HTTP because current repository research identified intermittent Bolt decoding. Avoid anonymous interior multi-hop `MATCH`; use native procedures and named single-hop ingestion.

## Query inspector safety

Return a static query template identifier and sanitized template text, safe numeric parameters, elapsed milliseconds, consistency, result count, and query ID. Never return bearer token, Authorization header, filesystem path, raw stack, or unrelated environment data.
