import {
  EvidencePathProtocolError,
  ReplayValidationError,
  simulateReplay,
  validateEvidencePath,
} from "@/lib/domain/replay";
import { toAppError } from "@/lib/api/errors";
import type { EvidencePath } from "@/lib/domain/types";

const path = (id: string, edgeId: string, serviceId: string): EvidencePath => ({
  id,
  length: 2,
  nodes: [
    { id: serviceId, label: "Service", key: `service:${serviceId}`, name: serviceId },
    {
      id: "20",
      label: "PackageVersion",
      key: "pkg:parent@1",
      name: "@blastpath/demo-platform",
      version: "2.4.0",
    },
    {
      id: "30",
      label: "PackageVersion",
      key: "pkg:affected@1",
      name: "@tanstack/router-core",
      version: "1.169.5",
    },
  ],
  edges: [
    {
      id: `root-${serviceId}`,
      type: "DEPENDS_ON",
      source: serviceId,
      target: "20",
      sourceRef: "node_modules/parent",
    },
    {
      id: edgeId,
      type: "DEPENDS_ON",
      source: "20",
      target: "30",
      sourceRef: "node_modules/demo-platform",
    },
  ],
});

describe("path simulation", () => {
  it("removes both paths and leaves the input unchanged", () => {
    const baseline = [path("p1", "shared", "1"), path("p2", "shared", "2")];
    const before = JSON.stringify(baseline);
    const result = simulateReplay(
      { action: "exclude_dependency_edge", edgeIds: ["shared"], label: "upgrade" },
      baseline,
    );
    expect(result.baseline).toEqual({ impactedServices: 2, exposurePaths: 2 });
    expect(result.simulated).toEqual({ impactedServices: 0, exposurePaths: 0 });
    expect(result.removedServiceIds).toEqual(["1", "2"]);
    expect(JSON.stringify(baseline)).toBe(before);
  });

  it("rejects an edge that is not in the observed paths", () => {
    let failure: unknown;
    try {
      simulateReplay({ action: "exclude_dependency_edge", edgeIds: ["999"], label: "bad" }, [
        path("p1", "shared", "1"),
      ]);
    } catch (error) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(ReplayValidationError);
    expect(toAppError(failure).code).toBe("INVALID_REQUEST");
    expect(toAppError(failure).status).toBe(400);
  });

  it("does not remove a service that still has an affected path", () => {
    const result = simulateReplay(
      { action: "exclude_dependency_edge", edgeIds: ["cut"], label: "partial cut" },
      [path("removed-path", "cut", "1"), path("remaining-path", "keep", "1")],
    );

    expect(result.removedPathIds).toEqual(["removed-path"]);
    expect(result.removedServiceIds).toEqual([]);
    expect(result.remainingServiceIds).toEqual(["1"]);
    expect(result.simulated.impactedServices).toBe(1);
  });

  it("validates an ordered path", () => {
    const value = path("p1", "shared", "1");
    expect(() => validateEvidencePath(value, new Set(["30"]))).not.toThrow();
  });

  it("maps malformed HydraDB paths to a protocol error", () => {
    const value = path("p1", "shared", "1");
    value.nodes[1] = { ...value.nodes[1], id: "1" };

    let failure: unknown;
    try {
      validateEvidencePath(value, new Set(["30"]));
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(EvidencePathProtocolError);
    expect(toAppError(failure).code).toBe("HYDRADB_PROTOCOL_ERROR");
    expect(toAppError(failure).status).toBe(502);
  });
});
