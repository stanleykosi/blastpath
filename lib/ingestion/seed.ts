import { createHash } from "node:crypto";
import { open } from "node:fs/promises";
import path from "node:path";
import { organizationFixtureSchema } from "@/lib/domain/schemas";
import { parseAdvisory } from "@/lib/ingestion/advisory";
import { parseBuildEvents } from "@/lib/ingestion/build-events";
import { parseLockfileV3 } from "@/lib/ingestion/lockfile-v3";
import {
  normalizeFixtureSet,
  type NormalizedDataset,
  type OrganizationFixture,
  type LockfileInput,
} from "@/lib/ingestion/normalize";
import {
  FIXTURE_FILES,
  REQUIRED_LOCKFILE_SLUGS,
  SEED_VERSION,
  DEFAULT_FIXTURE_ROOT,
} from "@/lib/fixtures/paths";
import { getServerEnv } from "@/lib/config/env";
import { HydraRepository, type SeedVerification } from "@/lib/hydradb/repository";
import type { SeedSummary } from "@/lib/domain/types";
import { InvalidFixtureError } from "@/lib/ingestion/errors";

const MAX_FILE_BYTES = 2 * 1024 * 1024;

export async function readLimitedFixture(filePath: string): Promise<Buffer> {
  const handle = await open(filePath, "r");
  try {
    const bounded = Buffer.allocUnsafe(MAX_FILE_BYTES + 1);
    let totalBytes = 0;
    while (totalBytes < bounded.byteLength) {
      const { bytesRead } = await handle.read(
        bounded,
        totalBytes,
        bounded.byteLength - totalBytes,
        null,
      );
      if (bytesRead === 0) break;
      totalBytes += bytesRead;
    }
    if (totalBytes > MAX_FILE_BYTES)
      throw new Error(`INVALID_FIXTURE file too large: ${path.basename(filePath)}`);
    return Buffer.from(bounded.subarray(0, totalBytes));
  } finally {
    await handle.close();
  }
}

function parseJson(bytes: Buffer, sourceName: string): unknown {
  try {
    return JSON.parse(bytes.toString("utf8")) as unknown;
  } catch {
    throw new Error(`INVALID_FIXTURE ${sourceName}: JSON`);
  }
}

function fixturePath(root: string, value: string): string {
  const relative = value.replace(/^fixtures[\\/]/, "");
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, relative);
  if (resolved !== resolvedRoot && !resolved.startsWith(`${resolvedRoot}${path.sep}`))
    throw new Error("INVALID_FIXTURE unsafe fixture path");
  return resolved;
}

export async function loadNormalizedFixtures(
  fixtureRoot = DEFAULT_FIXTURE_ROOT,
  createdAtIso = "2026-08-18T00:00:00.000Z",
): Promise<NormalizedDataset> {
  const root = path.resolve(fixtureRoot);
  const organizationBytes = await readLimitedFixture(fixturePath(root, FIXTURE_FILES.organization));
  const incidentBytes = await readLimitedFixture(fixturePath(root, FIXTURE_FILES.incident));
  const buildBytes = await readLimitedFixture(fixturePath(root, FIXTURE_FILES.builds));
  const organizationParsed = organizationFixtureSchema.safeParse(
    parseJson(organizationBytes, FIXTURE_FILES.organization),
  );
  if (!organizationParsed.success)
    throw new Error(
      `INVALID_FIXTURE ${FIXTURE_FILES.organization}: ${organizationParsed.error.issues[0]?.path.join(".") ?? "root"}`,
    );
  const organization = organizationParsed.data as OrganizationFixture;
  const incident = parseAdvisory(parseJson(incidentBytes, FIXTURE_FILES.incident));
  const builds = parseBuildEvents(parseJson(buildBytes, FIXTURE_FILES.builds));
  const seen = new Set<string>();
  const lockfiles: LockfileInput[] = [];
  for (const repository of organization.repositories) {
    if (seen.has(repository.lockfilePath))
      throw new Error(`INVALID_FIXTURE duplicate lockfile path ${repository.lockfilePath}`);
    seen.add(repository.lockfilePath);
    const relativePath = repository.lockfilePath.replace(/^fixtures[\\/]/, "");
    const bytes = await readLimitedFixture(fixturePath(root, repository.lockfilePath));
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (digest !== repository.expectedLockfileSha256)
      throw new Error(`INVALID_FIXTURE lockfile digest mismatch ${repository.slug}`);
    lockfiles.push({
      repositorySlug: repository.slug,
      relativePath,
      digest,
      parsed: parseLockfileV3(parseJson(bytes, repository.lockfilePath), repository.lockfilePath),
    });
  }
  const slugs = lockfiles.map((lockfile) => lockfile.repositorySlug).sort();
  if (slugs.join(",") !== [...REQUIRED_LOCKFILE_SLUGS].sort().join(","))
    throw new Error("INVALID_FIXTURE lockfile set");
  return normalizeFixtureSet({ organization, incident, builds, lockfiles, createdAtIso });
}

export function summaryFromDataset(
  dataset: NormalizedDataset,
  fixtureRoot: string,
  durationMs: number,
  verified: boolean,
): SeedSummary {
  return {
    seedVersion: SEED_VERSION,
    fixtureRoot,
    lockfiles: dataset.lockfiles.length,
    nodesByLabel: dataset.nodesByLabel,
    edgesByType: dataset.edgesByType,
    affectedVersions: dataset.affectedVersionIds,
    durationMs,
    verified,
  };
}

function recordsMatch(expected: Record<string, number>, actual: Record<string, number>): boolean {
  const expectedEntries = Object.entries(expected).sort(([left], [right]) =>
    left.localeCompare(right),
  );
  const actualEntries = Object.entries(actual).sort(([left], [right]) => left.localeCompare(right));
  return JSON.stringify(expectedEntries) === JSON.stringify(actualEntries);
}

export function seedVerificationMatches(
  dataset: Pick<NormalizedDataset, "nodesByLabel" | "edgesByType" | "affectedVersionIds">,
  verification: SeedVerification,
): boolean {
  return (
    recordsMatch(dataset.nodesByLabel, verification.nodesByLabel) &&
    recordsMatch(dataset.edgesByType, verification.edgesByType) &&
    dataset.affectedVersionIds.join(",") === verification.affectedVersionIds.join(",")
  );
}

export function withoutSeedMarker(
  dataset: Pick<NormalizedDataset, "nodesByLabel" | "edgesByType" | "affectedVersionIds">,
): Pick<NormalizedDataset, "nodesByLabel" | "edgesByType" | "affectedVersionIds"> {
  const nodesByLabel = { ...dataset.nodesByLabel };
  const edgesByType = { ...dataset.edgesByType };
  delete nodesByLabel.SeedRun;
  delete edgesByType.SEEDED;
  return { nodesByLabel, edgesByType, affectedVersionIds: dataset.affectedVersionIds };
}

export async function runSeed(options: {
  fixtureRoot?: string;
  dryRun?: boolean;
  repository?: HydraRepository;
}): Promise<SeedSummary> {
  const started = performance.now();
  const fixtureRoot = path.resolve(options.fixtureRoot ?? DEFAULT_FIXTURE_ROOT);
  let dataset: NormalizedDataset;
  try {
    dataset = await loadNormalizedFixtures(fixtureRoot);
  } catch (error) {
    throw new InvalidFixtureError(error);
  }
  if (options.dryRun)
    return summaryFromDataset(dataset, fixtureRoot, Math.round(performance.now() - started), false);
  getServerEnv();
  const repository = options.repository ?? new HydraRepository();
  await repository.removeSeedMarker();
  await repository.upsertNodes(dataset.nodes, fixtureRoot);
  await repository.upsertEdges(dataset.edges, fixtureRoot);
  const unmarkedVerification = await repository.seedVerification(dataset.incident.key);
  if (!seedVerificationMatches(withoutSeedMarker(dataset), unmarkedVerification))
    throw new Error("SEED_VERIFICATION_FAILED");
  try {
    await repository.writeSeedMarker(dataset.nodes, dataset.edges, fixtureRoot);
    const marker = await repository.seedMarker();
    if (!marker.seeded) throw new Error("SEED_MARKER_NOT_FOUND");
    const verification = await repository.seedVerification(dataset.incident.key);
    if (!seedVerificationMatches(dataset, verification))
      throw new Error("SEED_VERIFICATION_FAILED");
  } catch (error) {
    await repository.removeSeedMarker();
    throw error;
  }
  return summaryFromDataset(dataset, fixtureRoot, Math.round(performance.now() - started), true);
}
