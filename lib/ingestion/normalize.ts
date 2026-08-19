import type { ParsedBuildEvent } from "@/lib/ingestion/build-events";
import type { ParsedLockfile } from "@/lib/ingestion/lockfile-v3";
import { resolveDependencyPath, resolvePackageNamePath } from "@/lib/ingestion/lockfile-v3";
import { CollisionGuard, canonicalKey } from "@/lib/ingestion/id";
import type {
  GraphEdge,
  GraphNode,
  NormalizedIncident,
  NodeLabel,
  RelationshipType,
} from "@/lib/domain/types";
import { SEED_VERSION } from "@/lib/fixtures/paths";

export type LockfileInput = {
  repositorySlug: string;
  relativePath: string;
  digest: string;
  parsed: ParsedLockfile;
};

export type NormalizedDataset = {
  seedVersion: string;
  incident: NormalizedIncident;
  nodes: GraphNode[];
  edges: GraphEdge[];
  lockfiles: LockfileInput[];
  affectedVersionIds: string[];
  nodesByLabel: Record<string, number>;
  edgesByType: Record<string, number>;
};

export type OrganizationFixture = {
  schemaVersion: 1;
  organization: { slug: string; name: string; synthetic: true };
  repositories: Array<{
    slug: string;
    name: string;
    url: string;
    service: {
      slug: string;
      name: string;
      owner: string;
      criticality: "critical" | "high" | "medium";
    };
    lockfilePath: string;
    expectedLockfileSha256: string;
  }>;
};

export type NormalizeInput = {
  organization: OrganizationFixture;
  incident: NormalizedIncident;
  builds: ParsedBuildEvent[];
  lockfiles: LockfileInput[];
  createdAtIso: string;
};

function packageKey(name: string): string {
  return `pkg:npm/${encodeURIComponent(name)}`;
}

function packageVersionKey(name: string, version: string): string {
  return `${packageKey(name)}@${version}`;
}

export function normalizeFixtureSet(input: NormalizeInput): NormalizedDataset {
  const guard = new CollisionGuard();
  const nodeByKey = new Map<string, GraphNode>();
  const edgeByKey = new Map<string, GraphEdge>();

  function addNode(
    label: NodeLabel,
    key: string,
    properties: Record<string, string | number | boolean>,
  ): GraphNode {
    const normalizedKey = canonicalKey(key);
    const existing = nodeByKey.get(normalizedKey);
    if (existing) return existing;
    const node: GraphNode = {
      id: guard.claim(normalizedKey),
      label,
      key: normalizedKey,
      properties,
    };
    nodeByKey.set(normalizedKey, node);
    return node;
  }

  function addEdge(
    type: RelationshipType,
    source: GraphNode,
    target: GraphNode,
    sourceRef = "default",
  ): GraphEdge {
    const key = `edge:${type}:${source.key}->${target.key}:${canonicalKey(sourceRef)}`;
    const existing = edgeByKey.get(key);
    if (existing) return existing;
    const edge: GraphEdge = {
      id: guard.claim(key),
      type,
      key,
      source: source.id,
      target: target.id,
      sourceRef: canonicalKey(sourceRef),
      properties: {},
    };
    edgeByKey.set(key, edge);
    return edge;
  }

  const fixture = "fixtures";
  const org = addNode("Organization", `org:${input.organization.organization.slug}`, {
    name: input.organization.organization.name,
    fixture,
  });
  const repos = new Map<
    string,
    {
      node: GraphNode;
      service: GraphNode;
      lockfile: LockfileInput;
      repository: OrganizationFixture["repositories"][number];
    }
  >();

  for (const repository of input.organization.repositories) {
    const repo = addNode(
      "Repository",
      `repo:${input.organization.organization.slug}/${repository.slug}`,
      { name: repository.name, url: repository.url, fixture },
    );
    const service = addNode(
      "Service",
      `service:${input.organization.organization.slug}/${repository.service.slug}`,
      {
        name: repository.service.name,
        owner: repository.service.owner,
        criticality: repository.service.criticality,
        fixture,
      },
    );
    addEdge("OWNS", org, repo);
    addEdge("PRODUCES", repo, service);
    const lockfile = input.lockfiles.find((value) => value.repositorySlug === repository.slug);
    if (!lockfile) throw new Error(`INVALID_FIXTURE missing lockfile for ${repository.slug}`);
    const lockNode = addNode("Lockfile", `lockfile:${repo.key}/${lockfile.digest}`, {
      digest: lockfile.digest,
      path: lockfile.relativePath,
      lockfile_version: 3,
      fixture,
    });
    addEdge("HAS_LOCKFILE", repo, lockNode);
    repos.set(repository.slug, { node: repo, service, lockfile, repository });
  }

  for (const [repositorySlug, record] of repos) {
    const lockfile = record.lockfile;
    const versionByPath = new Map<string, GraphNode>();
    for (const packageRecord of lockfile.parsed.packages.values()) {
      const pkg = addNode("Package", packageKey(packageRecord.name), {
        name: packageRecord.name,
        ecosystem: "npm",
        fixture,
      });
      const version = addNode(
        "PackageVersion",
        packageVersionKey(packageRecord.name, packageRecord.version),
        { name: packageRecord.name, version: packageRecord.version, ecosystem: "npm", fixture },
      );
      addEdge("VERSION_OF", version, pkg);
      versionByPath.set(packageRecord.path, version);
      const lockNode = nodeByKey.get(`lockfile:${record.node.key}/${lockfile.digest}`);
      if (!lockNode)
        throw new Error(`INVALID_FIXTURE missing normalized lockfile ${repositorySlug}`);
      addEdge("RESOLVES", lockNode, version);
    }
    for (const packageRecord of lockfile.parsed.packages.values()) {
      const source = versionByPath.get(packageRecord.path);
      if (!source) throw new Error(`INVALID_FIXTURE missing package node ${packageRecord.path}`);
      for (const dependencyName of packageRecord.dependencies) {
        const targetPath = resolveDependencyPath(
          packageRecord.path,
          dependencyName,
          lockfile.parsed.packages,
        );
        if (!targetPath)
          throw new Error(
            `INVALID_FIXTURE unresolved dependency ${packageRecord.path} -> ${dependencyName}`,
          );
        const target = versionByPath.get(targetPath);
        if (!target) throw new Error(`INVALID_FIXTURE missing dependency node ${targetPath}`);
        addEdge("DEPENDS_ON", source, target, packageRecord.path);
      }
    }
    const rootService = record.service;
    for (const dependencyName of lockfile.parsed.rootDependencies) {
      const rootPath = resolvePackageNamePath(dependencyName);
      const targetPath =
        resolveDependencyPath("", dependencyName, lockfile.parsed.packages) ?? rootPath;
      const target = versionByPath.get(targetPath);
      if (!target) throw new Error(`INVALID_FIXTURE unresolved root dependency ${dependencyName}`);
      addEdge("DEPENDS_ON", rootService, target, rootPath);
    }
  }

  for (const event of input.builds) {
    const record = repos.get(event.repositorySlug);
    if (!record)
      throw new Error(`INVALID_FIXTURE unknown build repository ${event.repositorySlug}`);
    if (event.lockfileSha256 !== record.lockfile.digest)
      throw new Error(`BUILD_LOCKFILE_NOT_FOUND ${event.buildId}`);
    const build = addNode("Build", `build:${record.node.key}/${event.buildId}`, {
      build_id: event.buildId,
      commit_sha: event.commitSha,
      timestamp_iso: event.timestamp,
      timestamp_ms: event.timestampMs,
      environment: event.environment,
      lockfile_digest: event.lockfileSha256,
      fixture,
    });
    const lockNode = nodeByKey.get(`lockfile:${record.node.key}/${record.lockfile.digest}`);
    if (!lockNode) throw new Error(`INVALID_FIXTURE missing build lockfile ${event.buildId}`);
    addEdge("USES", build, lockNode);
    addEdge("HAS_BUILD", record.node, build);
  }

  const advisory = addNode("Advisory", `advisory:${input.incident.osvId}`, {
    osv_id: input.incident.osvId,
    summary: input.incident.summary,
    severity: input.incident.severity,
    window_start_iso: input.incident.windowStart,
    window_start_ms: input.incident.windowStartMs,
    window_end_iso: input.incident.windowEnd,
    window_end_ms: input.incident.windowEndMs,
    source_url: input.incident.sourceUrl,
    fixture,
  });
  const affectedVersionIds: string[] = [];
  for (const affected of input.incident.affected) {
    const version = nodeByKey.get(packageVersionKey(affected.name, affected.version));
    if (!version)
      throw new Error(
        `INVALID_FIXTURE affected version not present: ${affected.name}@${affected.version}`,
      );
    addEdge("AFFECTS", advisory, version);
    affectedVersionIds.push(version.id);
  }

  const seed = addNode("SeedRun", `seed:${SEED_VERSION}`, {
    version: SEED_VERSION,
    created_at_iso: input.createdAtIso,
    fixture,
  });
  addEdge("SEEDED", seed, org);

  const nodes = [...nodeByKey.values()].sort(
    (a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id),
  );
  const edges = [...edgeByKey.values()].sort(
    (a, b) => a.type.localeCompare(b.type) || a.id.localeCompare(b.id),
  );
  const nodesByLabel = Object.fromEntries(
    [...new Set(nodes.map((node) => node.label))]
      .sort()
      .map((label) => [label, nodes.filter((node) => node.label === label).length]),
  );
  const edgesByType = Object.fromEntries(
    [...new Set(edges.map((edge) => edge.type))]
      .sort()
      .map((type) => [type, edges.filter((edge) => edge.type === type).length]),
  );
  return {
    seedVersion: SEED_VERSION,
    incident: input.incident,
    nodes,
    edges,
    lockfiles: input.lockfiles,
    affectedVersionIds: affectedVersionIds.sort(),
    nodesByLabel,
    edgesByType,
  };
}
