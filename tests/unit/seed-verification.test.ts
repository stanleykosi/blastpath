import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  loadNormalizedFixtures,
  readLimitedFixture,
  runSeed,
  seedVerificationMatches,
  withoutSeedMarker,
} from "@/lib/ingestion/seed";
import { InvalidFixtureError } from "@/lib/ingestion/errors";
import type { HydraRepository, SeedVerification } from "@/lib/hydradb/repository";

const dataset = {
  nodesByLabel: { Advisory: 1, Service: 3 },
  edgesByType: { AFFECTS: 1, DEPENDS_ON: 7 },
  affectedVersionIds: ["42"],
};

describe("seed verification", () => {
  let temporaryRoot: string | undefined;

  afterEach(async () => {
    if (temporaryRoot) await rm(temporaryRoot, { recursive: true, force: true });
    temporaryRoot = undefined;
  });

  it("types fixture-loading failures for the HTTP error boundary", async () => {
    await expect(
      runSeed({ fixtureRoot: `${process.cwd()}/fixtures-that-do-not-exist` }),
    ).rejects.toBeInstanceOf(InvalidFixtureError);
  });

  it("requires exact node counts, relationship counts, and affected IDs", () => {
    expect(
      seedVerificationMatches(dataset, {
        nodesByLabel: { Service: 3, Advisory: 1 },
        edgesByType: { DEPENDS_ON: 7, AFFECTS: 1 },
        affectedVersionIds: ["42"],
      }),
    ).toBe(true);
    expect(
      seedVerificationMatches(dataset, {
        nodesByLabel: { Advisory: 1, Service: 2 },
        edgesByType: { AFFECTS: 1, DEPENDS_ON: 7 },
        affectedVersionIds: ["42"],
      }),
    ).toBe(false);
    expect(
      seedVerificationMatches(dataset, {
        nodesByLabel: { Advisory: 1, Service: 3 },
        edgesByType: { AFFECTS: 1, DEPENDS_ON: 6 },
        affectedVersionIds: ["42"],
      }),
    ).toBe(false);
    expect(
      seedVerificationMatches(dataset, {
        nodesByLabel: { Advisory: 1, Service: 3 },
        edgesByType: { AFFECTS: 1, DEPENDS_ON: 7 },
        affectedVersionIds: ["43"],
      }),
    ).toBe(false);
  });

  it("stops fixture reads at the two MiB limit", async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "blastpath-fixture-limit-"));
    const fixturePath = path.join(temporaryRoot, "oversized.json");
    await writeFile(fixturePath, Buffer.alloc(2 * 1024 * 1024 + 1, 32));

    await expect(readLimitedFixture(fixturePath)).rejects.toThrow(
      "INVALID_FIXTURE file too large: oversized.json",
    );
  });

  it("removes the marker when final seed verification fails", async () => {
    const fixtureRoot = path.resolve(process.cwd(), "fixtures");
    const normalized = await loadNormalizedFixtures(fixtureRoot);
    const unmarked = withoutSeedMarker(normalized);
    const invalidFinal: SeedVerification = {
      nodesByLabel: normalized.nodesByLabel,
      edgesByType: { ...normalized.edgesByType, DEPENDS_ON: 6 },
      affectedVersionIds: normalized.affectedVersionIds,
    };
    const repository = {
      removeSeedMarker: vi.fn().mockResolvedValue(undefined),
      upsertNodes: vi.fn().mockResolvedValue(undefined),
      upsertEdges: vi.fn().mockResolvedValue(undefined),
      seedVerification: vi.fn().mockResolvedValueOnce(unmarked).mockResolvedValueOnce(invalidFinal),
      writeSeedMarker: vi.fn().mockResolvedValue(undefined),
      seedMarker: vi.fn().mockResolvedValue({
        seeded: true,
        version: "blastpath-demo-v1",
      }),
    };
    const priorToken = process.env.HYDRADB_TOKEN;
    process.env.HYDRADB_TOKEN = "local-token-that-is-long-enough";
    try {
      await expect(
        runSeed({ repository: repository as unknown as HydraRepository, fixtureRoot }),
      ).rejects.toThrow("SEED_VERIFICATION_FAILED");
    } finally {
      if (priorToken === undefined) delete process.env.HYDRADB_TOKEN;
      else process.env.HYDRADB_TOKEN = priorToken;
    }

    expect(repository.removeSeedMarker).toHaveBeenCalledTimes(2);
    expect(repository.writeSeedMarker).toHaveBeenCalledTimes(1);
    expect(repository.seedVerification).toHaveBeenCalledTimes(2);
    expect(repository.removeSeedMarker.mock.invocationCallOrder[0]).toBeLessThan(
      repository.upsertNodes.mock.invocationCallOrder[0],
    );
    expect(repository.seedVerification.mock.invocationCallOrder[0]).toBeLessThan(
      repository.writeSeedMarker.mock.invocationCallOrder[0],
    );
    expect(repository.writeSeedMarker.mock.invocationCallOrder[0]).toBeLessThan(
      repository.removeSeedMarker.mock.invocationCallOrder[1],
    );
  });
});
