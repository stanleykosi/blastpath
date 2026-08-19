import { rankChokepoints } from "@/lib/domain/rank-chokepoints";
import type { EvidencePath, NormalizedIncident } from "@/lib/domain/types";

function affectedPath(id: string, serviceId: string, serviceName: string): EvidencePath {
  return {
    id,
    length: 2,
    nodes: [
      { id: serviceId, label: "Service", key: `service:${serviceId}`, name: serviceName },
      {
        id: "20",
        label: "PackageVersion",
        key: "pkg:npm/%40blastpath%2Fdemo-platform@2.4.0",
        name: "@blastpath/demo-platform",
        version: "2.4.0",
      },
      {
        id: "30",
        label: "PackageVersion",
        key: "pkg:npm/%40tanstack%2Frouter-core@1.169.5",
        name: "@tanstack/router-core",
        version: "1.169.5",
      },
    ],
    edges: [
      {
        id: `10${serviceId}`,
        type: "DEPENDS_ON",
        source: serviceId,
        target: "20",
        sourceRef: "node_modules/@blastpath/demo-platform",
      },
      {
        id: "200",
        type: "DEPENDS_ON",
        source: "20",
        target: "30",
        sourceRef: "node_modules/@tanstack/router-core",
      },
    ],
  };
}

describe("chokepoint ranking", () => {
  it("returns the deterministic shared-platform replay upgrade", () => {
    const incident: NormalizedIncident = {
      id: "40",
      key: "advisory:GHSA-g7cv-rxg3-hmpx",
      osvId: "GHSA-g7cv-rxg3-hmpx",
      summary: "Affected router version",
      severity: "critical",
      windowStart: "2026-05-11T19:20:00Z",
      windowStartMs: 0,
      windowEnd: "2026-05-11T19:26:00Z",
      windowEndMs: 1,
      sourceUrl: "https://osv.dev/vulnerability/GHSA-g7cv-rxg3-hmpx",
      affected: [],
    };

    const result = rankChokepoints(
      [affectedPath("a", "1", "Checkout Service"), affectedPath("b", "2", "Admin Console")],
      incident,
    );

    expect(result[0]?.recommendation).toBe("Upgrade @blastpath/demo-platform from 2.4.0 to 2.4.1");
    expect(result[0]?.edgeId).toBe("200");
  });
});
