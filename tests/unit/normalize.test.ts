import path from "node:path";
import { loadNormalizedFixtures } from "@/lib/ingestion/seed";

describe("fixture normalization", () => {
  it("derives the expected deterministic graph counts", async () => {
    const dataset = await loadNormalizedFixtures(path.resolve(process.cwd(), "fixtures"));
    expect(dataset.nodes.length).toBe(25);
    expect(dataset.edges.length).toBe(38);
    expect(dataset.nodesByLabel).toEqual({
      Advisory: 1,
      Build: 3,
      Lockfile: 3,
      Organization: 1,
      Package: 4,
      PackageVersion: 6,
      Repository: 3,
      SeedRun: 1,
      Service: 3,
    });
    expect(dataset.edgesByType).toEqual({
      AFFECTS: 1,
      DEPENDS_ON: 7,
      HAS_BUILD: 3,
      HAS_LOCKFILE: 3,
      OWNS: 3,
      PRODUCES: 3,
      RESOLVES: 8,
      SEEDED: 1,
      USES: 3,
      VERSION_OF: 6,
    });
    const resolves = dataset.edges.filter((edge) => edge.type === "RESOLVES");
    expect(resolves).toHaveLength(8);
    expect(resolves.every((edge) => edge.sourceRef === "default")).toBe(true);
    expect(resolves.every((edge) => edge.key.endsWith(":default"))).toBe(true);
  });
});
