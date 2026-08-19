# API contract

All responses are JSON. Success: `{ "data": ..., "meta": { "requestId": "..." } }`. Failure: `{ "error": { "code": "...", "message": "safe text", "requestId": "...", "retryable": false } }`. Generate request IDs server-side. Set `Cache-Control: no-store` on incident and seed routes.

IDs are decimal strings. Timestamps are UTC ISO strings. Arrays use the explicit stable order below.

## `GET /api/health`

200 data: `{status:"ok", app:"ok", hydradb:"ok", graphSeeded:true, seedVersion:"blastpath-demo-v1"}`. Return 503 with the same fields and safe error if HydraDB or marker is unavailable.

## `POST /api/seed`

Local/demo convenience only; disabled unless `ENABLE_SEED_ROUTE=true`. Body must be `{confirm:"seed-demo-fixtures"}`. 200 returns ingestion summary. 403 if disabled; 409 if another seed is active. Never accept a filesystem path from the request.

## `GET /api/incidents`

200 data: array of `{id,osvId,summary,severity,windowStart,windowEnd,sourceUrl}` sorted by `osvId`. P0 contains one incident.

## `GET /api/incidents/:incidentId`

`incidentId` is encoded advisory key or OSV ID; normalize only these two accepted forms.

200 data:

```ts
type IncidentOverview = {
  incident: { id:string; osvId:string; summary:string; severity:"critical"; windowStart:string; windowEnd:string; sourceUrl:string };
  metrics: { totalServices:3; impactedServices:2; confirmedExecution:1; safeServices:1; exposurePaths:2 };
  services: Array<{
    id:string; name:string; owner:string; criticality:"critical"|"high"|"medium";
    status:"confirmed_execution"|"current_resolution_only"|"historical_status_unknown"|"safe";
    reason:string; shortestPathLength:number|null; pathCount:number; chokepoints:string[];
  }>;
  chokepoints: Array<{ packageVersionId:string; name:string; version:string; pathCount:number; serviceCount:number; recommendation:string }>;
  query: QueryEvidence;
}
```

Service order: status risk (`confirmed`, `current`, `unknown`, `safe`), then criticality, then name. Chokepoints: service count descending, path count descending, key ascending.

## `GET /api/incidents/:incidentId/services/:serviceId`

200 data includes the service summary, `paths`, `buildEvidence`, and `query`. Each path is `{id,length,nodes,edges}` in service-first order. Node: `{id,label,key,name,version?,sourceRef?}`. Edge: `{id,type,source,target,sourceRef}`. Build evidence: `{buildId,timestamp,environment,lockfileDigest,inWindow}`. Never return raw lockfile content.

## `POST /api/incidents/:incidentId/replay`

Body:

```json
{
  "action": "exclude_dependency_edge",
  "edgeIds": ["<shared vulnerable edge id>"],
  "label": "Upgrade @blastpath/demo-platform to 2.4.1"
}
```

Validate 1–10 unique numeric-string edge IDs and label length 1–120. All edge IDs must occur in baseline affected paths. Response: `{baseline:{impactedServices,exposurePaths}, simulated:{impactedServices,exposurePaths}, removedServiceIds,removedPathIds,remainingServiceIds,action,disclaimer}`. Disclaimer must state that this is a path simulation, not a package-manager resolution or committed change. Do not mutate HydraDB.

## Query evidence

```ts
type QueryEvidence = {
  engine:"HydraDB";
  procedure:"algo.SSpaths"|"algo.SPpaths";
  templateId:"blast-radius-v1"|"exact-path-v1";
  query:string;
  parameters:Record<string,string|number|boolean>;
  consistency:"causal"|"strong";
  maxDepth:8;
  elapsedMs:number;
  resultCount:number;
  queryIds:string[];
};
```

## Status/error map

- 400 `INVALID_REQUEST`; 404 `INCIDENT_NOT_FOUND` or `SERVICE_NOT_FOUND`.
- 409 `SEED_IN_PROGRESS` or `GRAPH_NOT_SEEDED`.
- 422 `INVALID_FIXTURE` only from seed.
- 502 `HYDRADB_PROTOCOL_ERROR`; 503 `HYDRADB_UNAVAILABLE`; 504 `HYDRADB_TIMEOUT`.
- Unexpected error: 500 `INTERNAL_ERROR`, generic message, server-side log with request ID.
