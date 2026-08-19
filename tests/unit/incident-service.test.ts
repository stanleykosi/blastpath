import { serviceEndingPaths, validateExactPaths } from "@/lib/api/incident-service";
import { toAppError } from "@/lib/api/errors";
import { compareEvidencePaths } from "@/lib/domain/path-order";
import type { EvidencePath } from "@/lib/domain/types";

function path(firstLabel: "Service" | "PackageVersion", id: string): EvidencePath {
  return {
    id,
    length: 1,
    nodes: [
      { id: "1", label: firstLabel, key: `node:${id}:1`, name: "start" },
      {
        id: "2",
        label: "PackageVersion",
        key: `node:${id}:2`,
        name: "@tanstack/router-core",
        version: "1.169.5",
      },
    ],
    edges: [
      {
        id: "3",
        type: "DEPENDS_ON",
        source: "1",
        target: "2",
        sourceRef: "node_modules/@tanstack/router-core",
      },
    ],
  };
}

describe("reverse incident paths", () => {
  it("keeps only paths that end at a service root", () => {
    const servicePath = path("Service", "service-path");
    const intermediatePath = path("PackageVersion", "intermediate-path");

    expect(serviceEndingPaths([intermediatePath, servicePath])).toEqual([servicePath]);
  });

  it("sorts equal-length paths by their full canonical sequence", () => {
    const laterSequence = path("Service", "a-hash");
    laterSequence.nodes[1] = { ...laterSequence.nodes[1], id: "9" };
    laterSequence.edges[0] = { ...laterSequence.edges[0], target: "9" };
    const earlierSequence = path("Service", "z-hash");

    expect([laterSequence, earlierSequence].sort(compareEvidencePaths)).toEqual([
      earlierSequence,
      laterSequence,
    ]);
  });

  it("rejects exact evidence for the wrong requested service", () => {
    const exactPath = path("Service", "wrong-service");

    expect(() => validateExactPaths([exactPath], ["2"], "99")).toThrow(/wrong service endpoint/);
  });

  it("rejects exact evidence when the affected node is not the final endpoint", () => {
    const exactPath = path("Service", "wrong-affected-endpoint");
    exactPath.nodes.push({
      id: "4",
      label: "PackageVersion",
      key: "pkg:after-affected@1",
      name: "after-affected",
      version: "1.0.0",
    });
    exactPath.edges = [
      { ...exactPath.edges[0], target: "2" },
      {
        id: "5",
        type: "DEPENDS_ON",
        source: "2",
        target: "4",
        sourceRef: "node_modules/after-affected",
      },
    ];
    exactPath.length = 2;

    let failure: unknown;
    try {
      validateExactPaths([exactPath], ["2"], "1");
    } catch (error) {
      failure = error;
    }
    expect(toAppError(failure)).toMatchObject({ code: "HYDRADB_PROTOCOL_ERROR", status: 502 });
  });
});
