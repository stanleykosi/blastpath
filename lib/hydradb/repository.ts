import {
  EDGE_COUNT_QUERY_BY_TYPE,
  EDGE_IDENTITIES_QUERY_BY_TYPE,
  EDGE_QUERY_BY_KIND,
  NODE_COUNT_QUERY_BY_LABEL,
  NODE_QUERY_BY_LABEL,
  QUERIES,
  QUERY_IDS,
} from "@/lib/hydradb/queries";
import { HydradbClient, isDecodedPath, type QueryConsistency } from "@/lib/hydradb/client";
import { rowsAsRecords, type DecodedPath } from "@/lib/hydradb/codec";
import { HydradbBatchError, HydradbError, AppError } from "@/lib/api/errors";
import type {
  EvidencePath,
  GraphEdge,
  GraphNode,
  Id,
  NormalizedIncident,
  NodeLabel,
  ServiceEvidence,
} from "@/lib/domain/types";
import { pathId } from "@/lib/ingestion/id";

const BATCH_SIZE = 200;
const HYDRATION_CONCURRENCY = 6;
const NODE_LABELS: readonly NodeLabel[] = [
  "Organization",
  "Service",
  "Repository",
  "Lockfile",
  "Build",
  "Package",
  "PackageVersion",
  "Advisory",
  "SeedRun",
];
type EdgeWriteKind = keyof typeof EDGE_QUERY_BY_KIND;

function edgeWriteKind(edge: GraphEdge): EdgeWriteKind {
  if (edge.type !== "DEPENDS_ON") return edge.type;
  if (edge.key.startsWith("edge:DEPENDS_ON:service:")) return "DEPENDS_ON_SERVICE";
  if (edge.key.startsWith("edge:DEPENDS_ON:pkg:npm/")) return "DEPENDS_ON_PACKAGE_VERSION";
  throw new HydradbError(
    "HYDRADB_PROTOCOL_ERROR",
    "A DEPENDS_ON edge has an invalid canonical source key.",
  );
}

function asString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0)
    throw new HydradbError("HYDRADB_PROTOCOL_ERROR", `HydraDB returned an invalid ${field}.`);
  return value;
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asId(value: unknown, field: string): Id {
  const stringValue =
    typeof value === "number" && Number.isSafeInteger(value) ? String(value) : value;
  if (typeof stringValue !== "string" || !/^[1-9]\d*$/.test(stringValue))
    throw new HydradbError("HYDRADB_PROTOCOL_ERROR", `HydraDB returned an invalid ${field}.`);
  return stringValue;
}

function asNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value))
    throw new HydradbError("HYDRADB_PROTOCOL_ERROR", `HydraDB returned an invalid ${field}.`);
  return value;
}

function asHttpsUrl(value: unknown, field: string): string {
  const stringValue = asString(value, field);
  try {
    const parsed = new URL(stringValue);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) throw new Error();
  } catch {
    throw new HydradbError("HYDRADB_PROTOCOL_ERROR", `HydraDB returned an invalid ${field}.`);
  }
  return stringValue;
}

function asAdvisorySourceUrl(value: unknown, osvId: string): string {
  const sourceUrl = asHttpsUrl(value, "source URL");
  if (sourceUrl !== `https://osv.dev/vulnerability/${osvId}`)
    throw new HydradbError("HYDRADB_PROTOCOL_ERROR", "HydraDB returned an invalid source URL.");
  return sourceUrl;
}

function chunks<T>(values: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size)
    result.push(values.slice(index, index + size));
  return result;
}

export type ExecutedQuery = {
  queryId: string;
  elapsedMs: number;
  resultCount: number;
  rows: Array<Record<string, unknown>>;
};

export type SeedVerification = {
  nodesByLabel: Record<string, number>;
  edgesByType: Record<string, number>;
  affectedVersionIds: Id[];
};

export type SeedIdentities = {
  nodeIds: Id[];
  edgeIds: Id[];
};

export class HydraRepository {
  constructor(private readonly client = new HydradbClient()) {}

  async ready(): Promise<boolean> {
    return this.client.ready();
  }

  private async execute(
    operation: string,
    query: string,
    parameters: Record<string, unknown>,
    consistency: QueryConsistency = "causal",
    retry = false,
  ): Promise<ExecutedQuery> {
    const result = retry
      ? await this.client.readWithRetry(operation, query, parameters, consistency)
      : await this.client.query(operation, query, parameters, consistency);
    return {
      queryId: result.queryId,
      elapsedMs: result.elapsedMs,
      resultCount: result.rows.length,
      rows: rowsAsRecords(result),
    };
  }

  async listIncidents(): Promise<
    Array<{
      id: Id;
      osvId: string;
      summary: string;
      severity: "critical";
      windowStart: string;
      windowEnd: string;
      sourceUrl: string;
    }>
  > {
    const marker = await this.seedMarker();
    if (!marker.seeded) throw new AppError("GRAPH_NOT_SEEDED", "The graph is not seeded.", true);
    const result = await this.execute("list-incidents", QUERIES.listIncidents, {}, "causal", true);
    return result.rows.map((row) => {
      const osvId = asString(row.osv_id, "OSV ID");
      return {
        id: asId(row.id, "incident ID"),
        osvId,
        summary: asString(row.summary, "summary"),
        severity: "critical",
        windowStart: asString(row.window_start_iso, "window start"),
        windowEnd: asString(row.window_end_iso, "window end"),
        sourceUrl: asAdvisorySourceUrl(row.source_url, osvId),
      };
    });
  }

  async getIncident(advisoryKey: string): Promise<NormalizedIncident> {
    const normalizedKey = advisoryKey.startsWith("advisory:")
      ? advisoryKey
      : `advisory:${advisoryKey}`;
    const marker = await this.seedMarker();
    if (!marker.seeded) throw new AppError("GRAPH_NOT_SEEDED", "The graph is not seeded.", true);
    const result = await this.execute(
      "incident",
      QUERIES.incident,
      { advisory_key: normalizedKey },
      "causal",
      true,
    );
    const row = result.rows[0];
    if (!row) throw new AppError("INCIDENT_NOT_FOUND", "The requested incident was not found.");
    const osvId = asString(row.osv_id, "OSV ID");
    return {
      id: asId(row.id, "incident ID"),
      key: normalizedKey,
      osvId,
      summary: asString(row.summary, "summary"),
      severity: "critical",
      windowStart: asString(row.window_start_iso, "window start"),
      windowStartMs: asNumber(row.window_start_ms, "window start"),
      windowEnd: asString(row.window_end_iso, "window end"),
      windowEndMs: asNumber(row.window_end_ms, "window end"),
      sourceUrl: asAdvisorySourceUrl(row.source_url, osvId),
      affected: [],
    };
  }

  async getAffectedVersionIds(advisoryKey: string): Promise<Id[]> {
    const normalizedKey = advisoryKey.startsWith("advisory:")
      ? advisoryKey
      : `advisory:${advisoryKey}`;
    const result = await this.execute(
      "affected-versions",
      QUERIES.affectedVersions,
      { advisory_key: normalizedKey },
      "causal",
      true,
    );
    return result.rows.map((row) => asId(row.version_id, "affected version ID")).sort();
  }

  async getReversePaths(versionId: Id): Promise<{ paths: DecodedPath[]; query: ExecutedQuery }> {
    const query = await this.execute(
      "blast-radius",
      QUERIES.reverseBlastPaths,
      { source: Number(versionId) },
      "causal",
      true,
    );
    const paths = query.rows.map((row) => row.path).filter(isDecodedPath);
    if (paths.length !== query.rows.length)
      throw new HydradbError("HYDRADB_PROTOCOL_ERROR", "HydraDB returned a row without a path.", {
        queryId: query.queryId,
      });
    return { paths, query };
  }

  async getExactPaths(
    affectedId: Id,
    serviceId: Id,
  ): Promise<{ paths: DecodedPath[]; query: ExecutedQuery }> {
    const query = await this.execute(
      "exact-path",
      QUERIES.exactPath,
      { affected: Number(affectedId), service: Number(serviceId) },
      "causal",
      true,
    );
    const paths = query.rows.map((row) => row.path).filter(isDecodedPath);
    if (paths.length !== query.rows.length)
      throw new HydradbError(
        "HYDRADB_PROTOCOL_ERROR",
        "HydraDB returned an exact path row without a path.",
        { queryId: query.queryId },
      );
    return { paths, query };
  }

  async hydrateNode(id: Id): Promise<GraphNode> {
    const result = await this.execute(
      "hydrate-node",
      QUERIES.hydrateNode,
      { id: Number(id) },
      "causal",
      true,
    );
    const row = result.rows[0];
    if (!row)
      throw new HydradbError("HYDRADB_PROTOCOL_ERROR", "HydraDB could not hydrate a path node.");
    const rawLabel = asString(row.label, "node label");
    const label = NODE_LABELS.includes(rawLabel as NodeLabel) ? (rawLabel as NodeLabel) : undefined;
    if (!label)
      throw new HydradbError(
        "HYDRADB_PROTOCOL_ERROR",
        "HydraDB returned a path node with an unknown label.",
      );
    return {
      id: asId(row.id, "node ID"),
      label,
      key: asString(row.key, "node key"),
      properties: {
        name: asString(row.name, "node name"),
        ...(asOptionalString(row.version)
          ? { version: asOptionalString(row.version) as string }
          : {}),
        ...(asOptionalString(row.source_ref)
          ? { source_ref: asOptionalString(row.source_ref) as string }
          : {}),
      },
    };
  }

  async hydrateEdge(id: Id): Promise<GraphEdge> {
    const result = await this.execute(
      "hydrate-edge",
      QUERIES.hydrateEdge,
      { id: Number(id) },
      "causal",
      true,
    );
    const row = result.rows[0];
    if (!row)
      throw new HydradbError("HYDRADB_PROTOCOL_ERROR", "HydraDB could not hydrate a path edge.");
    return {
      id: asId(row.id, "edge ID"),
      type: "DEPENDS_ON",
      key: asString(row.key, "edge key"),
      source: asId(row.source, "edge source"),
      target: asId(row.target, "edge target"),
      sourceRef: asString(row.source_ref, "edge source reference"),
      properties: {},
    };
  }

  async getServiceEvidence(serviceId: Id): Promise<ServiceEvidence> {
    const result = await this.execute(
      "service-evidence",
      QUERIES.serviceEvidence,
      { service_id: Number(serviceId) },
      "causal",
      true,
    );
    const first = result.rows[0];
    if (!first) throw new AppError("SERVICE_NOT_FOUND", "The requested service was not found.");
    const builds = result.rows.flatMap((row) => {
      const buildId = asOptionalString(row.build_id);
      if (!buildId) return [];
      return [
        {
          buildId,
          timestamp: asString(row.timestamp_iso, "build timestamp"),
          timestampMs: asNumber(row.timestamp_ms, "build timestamp"),
          environment: asString(row.environment, "build environment"),
          lockfileDigest: asString(row.build_lockfile_digest, "build lockfile digest"),
          inWindow: false,
        },
      ];
    });
    return {
      service: {
        id: asId(first.service_id, "service ID"),
        label: "Service",
        key: asString(first.service_key, "service key"),
        name: asString(first.service_name, "service name"),
        owner: asString(first.owner, "service owner"),
        criticality: asString(first.criticality, "service criticality") as
          | "critical"
          | "high"
          | "medium",
      },
      repositoryId: asId(first.repository_id, "repository ID"),
      repositoryName: asString(first.repository_name, "repository name"),
      lockfileDigest: asString(first.lockfile_digest, "lockfile digest"),
      builds,
    };
  }

  async listServices(): Promise<Id[]> {
    const result = await this.execute("services", QUERIES.services, {}, "causal", true);
    return result.rows.map((row) => asId(row.id, "service ID")).sort();
  }

  async seedMarker(): Promise<{ seeded: boolean; version: string }> {
    const result = await this.execute("seed-marker", QUERIES.seedMarker, {}, "strong", false);
    const row = result.rows[0];
    return {
      seeded: Boolean(row && row.key === "seed:blastpath-demo-v1"),
      version: typeof row?.version === "string" ? row.version : "blastpath-demo-v1",
    };
  }

  async seedVerification(advisoryKey: string): Promise<SeedVerification> {
    const normalizedKey = advisoryKey.startsWith("advisory:")
      ? advisoryKey
      : `advisory:${advisoryKey}`;
    const nodesByLabel: Record<string, number> = {};
    for (const [label, query] of Object.entries(NODE_COUNT_QUERY_BY_LABEL)) {
      const result = await this.execute(
        `seed-node-count-${label.toLowerCase()}`,
        query,
        {},
        "strong",
        false,
      );
      const count = asNumber(result.rows[0]?.count, "seed node count");
      if (count > 0) nodesByLabel[label] = count;
    }
    const edgesByType: Record<string, number> = {};
    for (const [type, query] of Object.entries(EDGE_COUNT_QUERY_BY_TYPE)) {
      const result = await this.execute(
        `seed-edge-count-${type.toLowerCase()}`,
        query,
        {},
        "strong",
        false,
      );
      const count = asNumber(result.rows[0]?.count, "seed relationship count");
      if (count > 0) edgesByType[type] = count;
    }
    const affected = await this.execute(
      "seed-affected-versions",
      QUERIES.affectedVersions,
      { advisory_key: normalizedKey },
      "strong",
      false,
    );
    return {
      nodesByLabel,
      edgesByType,
      affectedVersionIds: affected.rows
        .map((row) => asId(row.version_id, "affected version ID"))
        .sort(),
    };
  }

  async seedIdentities(): Promise<SeedIdentities> {
    const nodes = await this.execute(
      "seed-node-identities",
      QUERIES.seedNodeIdentities,
      {},
      "strong",
      false,
    );
    const edgeRows: Array<Record<string, unknown>> = [];
    for (const [type, query] of Object.entries(EDGE_IDENTITIES_QUERY_BY_TYPE)) {
      const result = await this.execute(
        `seed-edge-identities-${type.toLowerCase()}`,
        query,
        {},
        "strong",
        false,
      );
      edgeRows.push(...result.rows);
    }
    return {
      nodeIds: nodes.rows.map((row) => asId(row.id, "seed node ID")).sort(),
      edgeIds: edgeRows.map((row) => asId(row.id, "seed relationship ID")).sort(),
    };
  }

  async removeSeedMarker(): Promise<void> {
    await this.execute("remove-seed-marker", QUERIES.removeSeedMarker, {}, "causal", false);
  }

  async upsertNodes(nodes: GraphNode[], fixtureRoot: string, includeSeed = false): Promise<void> {
    const grouped = new Map<NodeLabel, GraphNode[]>();
    for (const node of nodes) {
      if (node.label === "SeedRun" && !includeSeed) continue;
      const values = grouped.get(node.label) ?? [];
      values.push(node);
      grouped.set(node.label, values);
    }
    for (const label of Object.keys(NODE_QUERY_BY_LABEL) as NodeLabel[]) {
      const batches = chunks(
        (grouped.get(label) ?? []).sort((a, b) => a.id.localeCompare(b.id)),
        BATCH_SIZE,
      );
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
        const batch = batches[batchIndex];
        try {
          await this.execute(
            `write-${label.toLowerCase()}`,
            NODE_QUERY_BY_LABEL[label],
            {
              rows: batch.map((node) => ({
                id: Number(node.id),
                node_label: node.label,
                key: node.key,
                ...node.properties,
                fixture: fixtureRoot,
              })),
            },
            "causal",
            false,
          );
        } catch (error) {
          throw new HydradbBatchError("node", label, batchIndex, error);
        }
      }
    }
  }

  async upsertEdges(edges: GraphEdge[], fixtureRoot: string, includeMarker = false): Promise<void> {
    const grouped = new Map<EdgeWriteKind, GraphEdge[]>();
    for (const edge of edges) {
      if (!includeMarker && edge.type === "SEEDED") continue;
      const kind = edgeWriteKind(edge);
      const values = grouped.get(kind) ?? [];
      values.push(edge);
      grouped.set(kind, values);
    }
    for (const kind of Object.keys(EDGE_QUERY_BY_KIND) as EdgeWriteKind[]) {
      const batches = chunks(
        (grouped.get(kind) ?? []).sort((a, b) => a.id.localeCompare(b.id)),
        BATCH_SIZE,
      );
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
        const batch = batches[batchIndex];
        try {
          await this.execute(
            `write-${kind.toLowerCase().replaceAll("_", "-")}`,
            EDGE_QUERY_BY_KIND[kind],
            {
              rows: batch.map((edge) => ({
                id: Number(edge.id),
                key: edge.key,
                source: Number(edge.source),
                target: Number(edge.target),
                source_ref: edge.sourceRef,
                fixture: fixtureRoot,
              })),
            },
            "causal",
            false,
          );
        } catch (error) {
          const relationshipType = batches[batchIndex]?.[0]?.type ?? "DEPENDS_ON";
          throw new HydradbBatchError("relationship", relationshipType, batchIndex, error);
        }
      }
    }
  }

  async writeSeedMarker(
    nodes: GraphNode[],
    edges: GraphEdge[],
    fixtureRoot: string,
  ): Promise<void> {
    const seedNodes = nodes.filter((node) => node.label === "SeedRun");
    const markerEdges = edges.filter((edge) => edge.type === "SEEDED");
    await this.upsertNodes(seedNodes, fixtureRoot, true);
    await this.upsertEdges(markerEdges, fixtureRoot, true);
  }

  async writeSmokeProof(source: Id, target: Id, edge: Id): Promise<Id> {
    await this.execute(
      "smoke-create-nodes",
      QUERIES.smokeCreateNodes,
      {
        rows: [
          { id: Number(source), key: `smoke:${source}` },
          { id: Number(target), key: `smoke:${target}` },
        ],
      },
      "causal",
      false,
    );
    await this.execute(
      "smoke-create-edge",
      QUERIES.smokeCreateEdge,
      { source: Number(source), target: Number(target), id: Number(edge) },
      "causal",
      false,
    );
    const matched = await this.execute("smoke-match", QUERIES.smokeMatch, {}, "strong", false);
    const destination = matched.rows[0]?.destination_id;
    if (asId(destination, "smoke destination") !== target)
      throw new HydradbError(
        "HYDRADB_PROTOCOL_ERROR",
        "HydraDB smoke match returned the wrong destination.",
      );
    await this.execute("smoke-delete", QUERIES.smokeDelete, {}, "causal", false);
    return target;
  }

  private buildEvidencePath(
    path: DecodedPath,
    nodesById: ReadonlyMap<Id, GraphNode>,
    edgesById: ReadonlyMap<Id, GraphEdge>,
  ): EvidencePath {
    const nodeIds = [...path.nodeIds].reverse();
    const edgeIds = [...path.edgeIds].reverse();
    const nodes = nodeIds.map((id) => nodesById.get(id));
    const edges = edgeIds.map((id) => edgesById.get(id));
    if (nodes.some((node) => !node) || edges.some((edge) => !edge))
      throw new HydradbError("HYDRADB_PROTOCOL_ERROR", "HydraDB did not return all path metadata.");
    const hydratedNodes = nodes as GraphNode[];
    const hydratedEdges = edges as GraphEdge[];
    if (hydratedNodes.length < 2 || hydratedEdges.length !== hydratedNodes.length - 1)
      throw new HydradbError("HYDRADB_PROTOCOL_ERROR", "HydraDB returned an invalid path shape.");
    for (let index = 0; index < hydratedEdges.length; index += 1) {
      if (
        hydratedEdges[index].source !== hydratedNodes[index].id ||
        hydratedEdges[index].target !== hydratedNodes[index + 1].id ||
        hydratedEdges[index].type !== "DEPENDS_ON"
      ) {
        throw new HydradbError(
          "HYDRADB_PROTOCOL_ERROR",
          "HydraDB returned a path with invalid edge direction.",
        );
      }
    }
    const pathNodes = hydratedNodes.map((node) => ({
      id: node.id,
      label: node.label,
      key: node.key,
      name: String(node.properties.name ?? node.key),
      version: typeof node.properties.version === "string" ? node.properties.version : undefined,
    }));
    const pathEdges = hydratedEdges.map((edge) => ({
      id: edge.id,
      type: edge.type,
      source: edge.source,
      target: edge.target,
      sourceRef: edge.sourceRef,
    }));
    return {
      id: pathId(nodeIds, edgeIds),
      length: edgeIds.length,
      nodes: pathNodes,
      edges: pathEdges,
    };
  }

  async normalizePaths(paths: DecodedPath[]): Promise<EvidencePath[]> {
    for (const path of paths) {
      if (
        path.edgeIds.length > 8 ||
        path.nodeIds.length < 2 ||
        path.edgeIds.length !== path.nodeIds.length - 1 ||
        new Set(path.nodeIds).size !== path.nodeIds.length
      )
        throw new HydradbError("HYDRADB_PROTOCOL_ERROR", "HydraDB returned an invalid path shape.");
    }
    const nodeIds = [...new Set(paths.flatMap((path) => path.nodeIds))];
    const edgeIds = [...new Set(paths.flatMap((path) => path.edgeIds))];
    const nodesById = new Map<Id, GraphNode>();
    const edgesById = new Map<Id, GraphEdge>();
    const tasks: Array<() => Promise<void>> = [
      ...nodeIds.map((id) => async () => {
        nodesById.set(id, await this.hydrateNode(id));
      }),
      ...edgeIds.map((id) => async () => {
        edgesById.set(id, await this.hydrateEdge(id));
      }),
    ];
    let nextTask = 0;
    const worker = async () => {
      while (nextTask < tasks.length) {
        const task = tasks[nextTask];
        nextTask += 1;
        await task();
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(HYDRATION_CONCURRENCY, tasks.length) }, () => worker()),
    );
    return paths.map((path) => this.buildEvidencePath(path, nodesById, edgesById));
  }

  async normalizePath(path: DecodedPath): Promise<EvidencePath> {
    const normalized = await this.normalizePaths([path]);
    const first = normalized[0];
    if (!first) throw new HydradbError("HYDRADB_PROTOCOL_ERROR", "HydraDB returned an empty path.");
    return first;
  }

  get queryIds(): typeof QUERY_IDS {
    return QUERY_IDS;
  }
}
