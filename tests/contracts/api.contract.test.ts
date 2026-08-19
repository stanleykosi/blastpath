import {
  incidentOverviewSchema,
  replayResponseSchema,
  serviceDetailSchema,
} from "@/lib/api/contracts";
import { QUERIES } from "@/lib/hydradb/queries";

describe("API DTO contracts", () => {
  const query = {
    engine: "HydraDB" as const,
    procedure: "algo.SSpaths" as const,
    templateId: "blast-radius-v1" as const,
    query: QUERIES.reverseBlastPaths,
    parameters: { source: 42 },
    consistency: "causal" as const,
    maxDepth: 8 as const,
    elapsedMs: 3,
    resultCount: 2,
    queryIds: ["q"],
  };
  const service = {
    id: "1",
    name: "Checkout Service",
    owner: "Commerce Platform",
    criticality: "critical" as const,
    status: "confirmed_execution" as const,
    reason: "Build used this lockfile during the incident window.",
    shortestPathLength: 3,
    pathCount: 1,
    chokepoints: [],
  };
  it("parses overview and detail DTOs", () => {
    expect(
      incidentOverviewSchema.safeParse({
        incident: {
          id: "1",
          osvId: "GHSA-x",
          summary: "x",
          severity: "critical",
          windowStart: "2026-01-01T00:00:00Z",
          windowEnd: "2026-01-01T00:01:00Z",
          sourceUrl: "https://osv.dev/x",
        },
        metrics: {
          totalServices: 3,
          impactedServices: 2,
          confirmedExecution: 1,
          safeServices: 1,
          exposurePaths: 2,
        },
        services: [service],
        chokepoints: [],
        query,
      }).success,
    ).toBe(true);
    expect(
      serviceDetailSchema.safeParse({
        service,
        paths: [],
        buildEvidence: [],
        query: { ...query, procedure: "algo.SPpaths", templateId: "exact-path-v1" },
      }).success,
    ).toBe(true);
  });
  it("parses replay response", () => {
    expect(
      replayResponseSchema.safeParse({
        baseline: { impactedServices: 2, exposurePaths: 2 },
        simulated: { impactedServices: 0, exposurePaths: 0 },
        removedServiceIds: ["1"],
        removedPathIds: ["abc"],
        remainingServiceIds: [],
        action: "upgrade",
        disclaimer: "Simulation over observed paths",
      }).success,
    ).toBe(true);
  });
});
