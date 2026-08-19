import path from "node:path";
import { loadNormalizedFixtures } from "@/lib/ingestion/seed";
import { parseAdvisory } from "@/lib/ingestion/advisory";
import { readFile } from "node:fs/promises";
import {
  organizationFixtureSchema,
  incidentFixtureSchema,
  buildEventsFixtureSchema,
  evidencePathSchema,
} from "@/lib/domain/schemas";

describe("committed fixture contracts", () => {
  it("passes all fixture schemas and exact lockfile digests", async () => {
    const root = path.resolve(process.cwd(), "fixtures");
    const dataset = await loadNormalizedFixtures(root);
    expect(dataset.lockfiles.map((value) => value.digest).sort()).toEqual([
      "16833e86d798db8da8780c70cfbad2992693eaf18549f3b051436d16132f8d9e",
      "36e87f8dbf5b024802cefc0371c07871b4503540ca79ab2864c4be161318b57e",
      "6ef87b87178490c8b2fd82303da8ea9498e206d3b36c0a697fbba9c2bba1167e",
    ]);
    const organization = JSON.parse(
      await readFile(path.join(root, "organizations/blastpath-demo-organization.json"), "utf8"),
    ) as unknown;
    const incident = JSON.parse(
      await readFile(path.join(root, "incidents/tanstack-ghsa-g7cv-rxg3-hmpx.json"), "utf8"),
    ) as unknown;
    const builds = JSON.parse(
      await readFile(path.join(root, "build-events/demo-build-events.json"), "utf8"),
    ) as unknown;
    expect(organizationFixtureSchema.safeParse(organization).success).toBe(true);
    expect(incidentFixtureSchema.safeParse(incident).success).toBe(true);
    expect(buildEventsFixtureSchema.safeParse(builds).success).toBe(true);
    expect(parseAdvisory(incident).osvId).toBe("GHSA-g7cv-rxg3-hmpx");
  });

  it("keeps path DTOs bounded and ordered", () => {
    expect(
      evidencePathSchema.safeParse({
        id: "0123456789abcdef",
        length: 1,
        nodes: [
          { id: "1", label: "Service", key: "a", name: "a" },
          { id: "2", label: "PackageVersion", key: "b", name: "b", version: "1.0.0" },
        ],
        edges: [
          { id: "3", type: "DEPENDS_ON", source: "1", target: "2", sourceRef: "node_modules/b" },
        ],
      }).success,
    ).toBe(true);
  });
});
