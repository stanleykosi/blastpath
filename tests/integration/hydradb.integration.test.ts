import path from "node:path";
import { HydraRepository } from "@/lib/hydradb/repository";
import { loadNormalizedFixtures, runSeed } from "@/lib/ingestion/seed";
import {
  getIncidentOverview,
  getIncidentSnapshot,
  getServiceDetail,
} from "@/lib/api/incident-service";
import { simulateReplay } from "@/lib/domain/replay";

const integration = process.env.SKIP_HYDRADB_INTEGRATION === "true" ? describe.skip : describe;

integration("real HydraDB golden journey", () => {
  const repository = new HydraRepository();
  let overview: Awaited<ReturnType<typeof getIncidentOverview>>;

  beforeAll(async () => {
    await runSeed({ fixtureRoot: path.resolve(process.cwd(), "fixtures"), repository });
    overview = await getIncidentOverview(repository, "GHSA-g7cv-rxg3-hmpx");
  }, 120_000);

  it("proves the three golden classifications and metrics", () => {
    expect(overview.metrics).toEqual({
      totalServices: 3,
      impactedServices: 2,
      confirmedExecution: 1,
      safeServices: 1,
      exposurePaths: 2,
    });
    expect(overview.services.find((service) => service.name === "Checkout Service")?.status).toBe(
      "confirmed_execution",
    );
    expect(overview.services.find((service) => service.name === "Admin Console")?.status).toBe(
      "current_resolution_only",
    );
    expect(overview.services.find((service) => service.name === "Analytics Worker")?.status).toBe(
      "safe",
    );
    expect(overview.chokepoints[0]?.recommendation).toBe(
      "Upgrade @blastpath/demo-platform from 2.4.0 to 2.4.1",
    );
    expect(overview.query.parameters).toEqual({
      source: expect.any(Number),
    });
  });

  it("returns exact paths, real query evidence, and replay immutability", async () => {
    const checkout = overview.services.find((service) => service.name === "Checkout Service");
    if (!checkout) throw new Error("checkout service missing");
    const detail = await getServiceDetail(repository, "GHSA-g7cv-rxg3-hmpx", checkout.id);
    expect(
      detail.paths[0]?.nodes.map((node) =>
        node.version ? `${node.name}@${node.version}` : node.name,
      ),
    ).toEqual([
      "Checkout Service",
      "@blastpath/checkout-shell@4.2.0",
      "@blastpath/demo-platform@2.4.0",
      "@tanstack/router-core@1.169.5",
    ]);
    expect(detail.query.procedure).toBe("algo.SPpaths");
    expect(detail.query.parameters).toEqual({
      affected: expect.any(Number),
      service: Number(checkout.id),
    });
    const shared = overview.chokepoints[0]?.edgeId;
    if (!shared) throw new Error("shared edge missing");
    const snapshot = await getIncidentSnapshot(repository, "GHSA-g7cv-rxg3-hmpx");
    const replay = simulateReplay(
      { action: "exclude_dependency_edge", edgeIds: [shared], label: "upgrade" },
      snapshot.paths,
    );
    expect(replay.baseline.exposurePaths).toBe(2);
    expect(replay.simulated.exposurePaths).toBe(0);
    expect(replay.simulated.impactedServices).toBe(0);
  });

  it("keeps stored counts, identities, and golden results stable on a second seed", async () => {
    const incidentId = "GHSA-g7cv-rxg3-hmpx";
    const fixtureRoot = path.resolve(process.cwd(), "fixtures");
    const dataset = await loadNormalizedFixtures(fixtureRoot);
    const beforeVerification = await repository.seedVerification(incidentId);
    const beforeIdentities = await repository.seedIdentities();
    expect(beforeIdentities).toEqual({
      nodeIds: dataset.nodes.map((node) => node.id).sort(),
      edgeIds: dataset.edges.map((edge) => edge.id).sort(),
    });
    const beforeSnapshot = await getIncidentSnapshot(repository, incidentId);
    const beforeStoredEvidence = {
      metrics: beforeSnapshot.overview.metrics,
      services: beforeSnapshot.overview.services.map((service) => ({
        id: service.id,
        name: service.name,
        status: service.status,
        pathCount: service.pathCount,
      })),
      paths: beforeSnapshot.paths.map((evidencePath) => ({
        id: evidencePath.id,
        nodeIds: evidencePath.nodes.map((node) => node.id),
        edgeIds: evidencePath.edges.map((edge) => edge.id),
      })),
    };

    const secondSeed = await runSeed({ fixtureRoot, repository });
    const afterVerification = await repository.seedVerification(incidentId);
    const afterIdentities = await repository.seedIdentities();
    const afterSnapshot = await getIncidentSnapshot(repository, incidentId);
    const afterStoredEvidence = {
      metrics: afterSnapshot.overview.metrics,
      services: afterSnapshot.overview.services.map((service) => ({
        id: service.id,
        name: service.name,
        status: service.status,
        pathCount: service.pathCount,
      })),
      paths: afterSnapshot.paths.map((evidencePath) => ({
        id: evidencePath.id,
        nodeIds: evidencePath.nodes.map((node) => node.id),
        edgeIds: evidencePath.edges.map((edge) => edge.id),
      })),
    };

    expect(secondSeed.verified).toBe(true);
    expect(afterVerification).toEqual(beforeVerification);
    expect(afterIdentities).toEqual(beforeIdentities);
    expect(afterStoredEvidence).toEqual(beforeStoredEvidence);
  }, 120_000);
});
