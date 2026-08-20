import type { DecodedPath } from "@/lib/hydradb/codec";
import { HydraRepository } from "@/lib/hydradb/repository";
import type { GraphEdge, GraphNode, Id } from "@/lib/domain/types";

class TrackingRepository extends HydraRepository {
  active = 0;
  maximumActive = 0;
  readonly nodeCalls: Id[] = [];
  readonly edgeCalls: Array<{ id: Id; source: Id; target: Id }> = [];

  constructor() {
    super({} as never);
  }

  private async track(): Promise<void> {
    this.active += 1;
    this.maximumActive = Math.max(this.maximumActive, this.active);
    await new Promise((resolve) => setTimeout(resolve, 1));
    this.active -= 1;
  }

  override async hydrateNode(id: Id): Promise<GraphNode> {
    this.nodeCalls.push(id);
    await this.track();
    return {
      id,
      label: id === "1" || id === "2" ? "Service" : "PackageVersion",
      key: `node:${id}`,
      properties: { name: `node-${id}`, version: "1.0.0" },
    };
  }

  override async hydrateEdge(id: Id, source: Id, target: Id): Promise<GraphEdge> {
    this.edgeCalls.push({ id, source, target });
    await this.track();
    return {
      id,
      type: "DEPENDS_ON",
      key: `edge:${id}`,
      source,
      target,
      sourceRef: `node_modules/${target}`,
      properties: {},
    };
  }
}

describe("HydraDB path hydration", () => {
  it("limits all metadata requests to six and hydrates shared IDs once", async () => {
    const paths: DecodedPath[] = [
      { nodeIds: ["30", "20", "11", "1"], edgeIds: ["103", "102", "101"] },
      { nodeIds: ["30", "20", "12", "2"], edgeIds: ["103", "202", "201"] },
    ];
    const repository = new TrackingRepository();

    const result = await repository.normalizePaths(paths);

    expect(result).toHaveLength(2);
    expect(repository.maximumActive).toBeLessThanOrEqual(6);
    expect(repository.nodeCalls.filter((id) => id === "20")).toHaveLength(1);
    expect(repository.nodeCalls.filter((id) => id === "30")).toHaveLength(1);
    expect(repository.edgeCalls.filter((call) => call.id === "103")).toEqual([
      { id: "103", source: "20", target: "30" },
    ]);
  });

  it("rejects one relationship ID with conflicting path endpoints", async () => {
    const repository = new TrackingRepository();
    const paths: DecodedPath[] = [
      { nodeIds: ["30", "20"], edgeIds: ["103"] },
      { nodeIds: ["30", "21"], edgeIds: ["103"] },
    ];

    await expect(repository.normalizePaths(paths)).rejects.toMatchObject({
      code: "HYDRADB_PROTOCOL_ERROR",
      status: 502,
    });
    expect(repository.nodeCalls).toEqual([]);
    expect(repository.edgeCalls).toEqual([]);
  });

  it("rejects an over-depth path before it starts metadata requests", async () => {
    const repository = new TrackingRepository();
    const path: DecodedPath = {
      nodeIds: Array.from({ length: 10 }, (_, index) => String(index + 1)),
      edgeIds: Array.from({ length: 9 }, (_, index) => String(index + 101)),
    };

    await expect(repository.normalizePaths([path])).rejects.toMatchObject({
      code: "HYDRADB_PROTOCOL_ERROR",
      status: 502,
    });
    expect(repository.nodeCalls).toEqual([]);
    expect(repository.edgeCalls).toEqual([]);
  });
});
