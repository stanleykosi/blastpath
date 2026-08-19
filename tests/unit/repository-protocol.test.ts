import { HydradbError, type AppError } from "@/lib/api/errors";
import type { GraphEdge, GraphNode } from "@/lib/domain/types";
import type { QueryConsistency, QueryResult } from "@/lib/hydradb/client";
import { HydraRepository } from "@/lib/hydradb/repository";

function result(columns: string[], rows: unknown[][]): QueryResult {
  return { queryId: "query-id", columns, rows, elapsedMs: 1 };
}

describe("HydraDB repository protocol boundaries", () => {
  it("rejects an unknown hydrated node label", async () => {
    const client = {
      readWithRetry: async () =>
        result(
          ["id", "labels", "key", "name", "version", "source_ref"],
          [["1", ["Mystery"], "mystery:1", "Mystery", null, null]],
        ),
    };
    const repository = new HydraRepository(client as never);

    await expect(repository.hydrateNode("1")).rejects.toMatchObject({
      code: "HYDRADB_PROTOCOL_ERROR",
      status: 502,
    });
  });

  it("returns GRAPH_NOT_SEEDED when an incident and the marker are absent", async () => {
    const client = {
      readWithRetry: async () => result([], []),
      query: async () => result(["key", "version"], []),
    };
    const repository = new HydraRepository(client as never);

    await expect(repository.getIncident("GHSA-missing")).rejects.toMatchObject({
      code: "GRAPH_NOT_SEEDED",
      status: 409,
    } satisfies Partial<AppError>);
  });

  it("rejects a partial graph even when the advisory row exists", async () => {
    let incidentQueries = 0;
    const client = {
      query: async () => result(["key", "version"], []),
      readWithRetry: async () => {
        incidentQueries += 1;
        return result(
          [
            "id",
            "osv_id",
            "summary",
            "window_start_iso",
            "window_start_ms",
            "window_end_iso",
            "window_end_ms",
            "source_url",
          ],
          [
            [
              "1",
              "GHSA-partial",
              "Partial incident",
              "2026-01-01T00:00:00Z",
              1,
              "2026-01-01T00:01:00Z",
              2,
              "https://osv.dev/vulnerability/GHSA-partial",
            ],
          ],
        );
      },
    };
    const repository = new HydraRepository(client as never);

    await expect(repository.getIncident("GHSA-partial")).rejects.toMatchObject({
      code: "GRAPH_NOT_SEEDED",
      status: 409,
    } satisfies Partial<AppError>);
    expect(incidentQueries).toBe(0);
  });

  it("rejects incident listing when the completeness marker is absent", async () => {
    let listQueries = 0;
    const client = {
      query: async () => result(["key", "version"], []),
      readWithRetry: async () => {
        listQueries += 1;
        return result([], []);
      },
    };
    const repository = new HydraRepository(client as never);

    await expect(repository.listIncidents()).rejects.toMatchObject({
      code: "GRAPH_NOT_SEEDED",
      status: 409,
    } satisfies Partial<AppError>);
    expect(listQueries).toBe(0);
  });

  it("sends the canonical relationship key in every write row", async () => {
    let parameters: Record<string, unknown> | undefined;
    const client = {
      query: async (
        _operation: string,
        _query: string,
        nextParameters: Record<string, unknown>,
      ) => {
        parameters = nextParameters;
        return result([], []);
      },
    };
    const repository = new HydraRepository(client as never);
    const edge: GraphEdge = {
      id: "3",
      type: "DEPENDS_ON",
      key: "edge:DEPENDS_ON:source->target:default",
      source: "1",
      target: "2",
      sourceRef: "default",
      properties: {},
    };

    await repository.upsertEdges([edge], "fixtures");

    expect(parameters).toMatchObject({ rows: [{ key: edge.key }] });
  });

  it("preserves node batch context and the HydraDB query ID", async () => {
    const client = {
      query: async () => {
        throw new HydradbError("HYDRADB_TIMEOUT", "HydraDB timed out.", {
          queryId: "write-node-query",
        });
      },
    };
    const repository = new HydraRepository(client as never);
    const node: GraphNode = {
      id: "1",
      label: "Service",
      key: "service:test",
      properties: { name: "Test Service", owner: "Platform", criticality: "high" },
    };

    await expect(repository.upsertNodes([node], "fixtures")).rejects.toMatchObject({
      code: "HYDRADB_TIMEOUT",
      status: 504,
      queryId: "write-node-query",
      batchKind: "node",
      batchValue: "Service",
      batchIndex: 0,
    });
  });

  it("preserves relationship batch context and the HydraDB query ID", async () => {
    const client = {
      query: async () => {
        throw new HydradbError("HYDRADB_UNAVAILABLE", "HydraDB is unavailable.", {
          queryId: "write-edge-query",
        });
      },
    };
    const repository = new HydraRepository(client as never);
    const edge: GraphEdge = {
      id: "3",
      type: "DEPENDS_ON",
      key: "edge:DEPENDS_ON:source->target:default",
      source: "1",
      target: "2",
      sourceRef: "default",
      properties: {},
    };

    await expect(repository.upsertEdges([edge], "fixtures")).rejects.toMatchObject({
      code: "HYDRADB_UNAVAILABLE",
      status: 503,
      queryId: "write-edge-query",
      batchKind: "relationship",
      batchValue: "DEPENDS_ON",
      batchIndex: 0,
    });
  });

  it("rejects a noncanonical advisory source URL from HydraDB", async () => {
    const client = {
      query: async () =>
        result(["key", "version"], [["seed:blastpath-demo-v1", "blastpath-demo-v1"]]),
      readWithRetry: async () =>
        result(
          [
            "id",
            "osv_id",
            "summary",
            "window_start_iso",
            "window_start_ms",
            "window_end_iso",
            "window_end_ms",
            "source_url",
          ],
          [
            [
              "1",
              "GHSA-unsafe",
              "Unsafe source URL",
              "2026-01-01T00:00:00Z",
              1,
              "2026-01-01T00:01:00Z",
              2,
              "https://example.com/vulnerability/GHSA-unsafe",
            ],
          ],
        ),
    };
    const repository = new HydraRepository(client as never);

    await expect(repository.getIncident("GHSA-unsafe")).rejects.toMatchObject({
      code: "HYDRADB_PROTOCOL_ERROR",
      status: 502,
    });
  });

  it("strong-reads seed counts and affected IDs", async () => {
    const consistencies: QueryConsistency[] = [];
    const client = {
      query: async (
        operation: string,
        _query: string,
        _parameters: Record<string, unknown>,
        consistency: QueryConsistency,
      ) => {
        consistencies.push(consistency);
        if (operation === "seed-node-counts")
          return result(["labels", "count"], [[["Service"], 3]]);
        if (operation === "seed-edge-counts") return result(["type", "count"], [["DEPENDS_ON", 7]]);
        return result(["version_id"], [["42"]]);
      },
    };
    const repository = new HydraRepository(client as never);

    const verification = await repository.seedVerification("advisory:GHSA-demo");

    expect(verification).toEqual({
      nodesByLabel: { Service: 3 },
      edgesByType: { DEPENDS_ON: 7 },
      affectedVersionIds: ["42"],
    });
    expect(consistencies).toEqual(["strong", "strong", "strong"]);
  });

  it("strong-reads every stored node and relationship identity", async () => {
    const consistencies: QueryConsistency[] = [];
    const client = {
      query: async (
        operation: string,
        _query: string,
        _parameters: Record<string, unknown>,
        consistency: QueryConsistency,
      ) => {
        consistencies.push(consistency);
        return operation === "seed-node-identities"
          ? result(["id"], [["20"], ["10"]])
          : result(["id"], [["40"], ["30"]]);
      },
    };
    const repository = new HydraRepository(client as never);

    await expect(repository.seedIdentities()).resolves.toEqual({
      nodeIds: ["10", "20"],
      edgeIds: ["30", "40"],
    });
    expect(consistencies).toEqual(["strong", "strong"]);
  });
});
