export type Id = string;

export type NodeLabel =
  | "Organization"
  | "Service"
  | "Repository"
  | "Lockfile"
  | "Build"
  | "Package"
  | "PackageVersion"
  | "Advisory"
  | "SeedRun";

export type RelationshipType =
  | "OWNS"
  | "PRODUCES"
  | "HAS_LOCKFILE"
  | "DEPENDS_ON"
  | "RESOLVES"
  | "USES"
  | "HAS_BUILD"
  | "VERSION_OF"
  | "AFFECTS"
  | "SEEDED";

export type Scalar = string | number | boolean;
export type ScalarProperties = Record<string, Scalar>;

export type GraphNode = {
  id: Id;
  label: NodeLabel;
  key: string;
  properties: ScalarProperties;
};

export type GraphEdge = {
  id: Id;
  type: RelationshipType;
  key: string;
  source: Id;
  target: Id;
  sourceRef: string;
  properties: ScalarProperties;
};

export type NormalizedIncident = {
  id: Id;
  key: string;
  osvId: string;
  summary: string;
  severity: "critical";
  windowStart: string;
  windowStartMs: number;
  windowEnd: string;
  windowEndMs: number;
  sourceUrl: string;
  affected: Array<{ ecosystem: "npm"; name: string; version: string; fixedVersion: string }>;
};

export type BuildEvidence = {
  buildId: string;
  timestamp: string;
  timestampMs: number;
  environment: string;
  lockfileDigest: string;
  inWindow: boolean;
};

export type PathNode = {
  id: Id;
  label: NodeLabel;
  key: string;
  name: string;
  version?: string;
  sourceRef?: string;
};

export type PathEdge = {
  id: Id;
  type: RelationshipType;
  source: Id;
  target: Id;
  sourceRef: string;
};

export type EvidencePath = {
  id: string;
  length: number;
  nodes: PathNode[];
  edges: PathEdge[];
};

export type ExposureStatus =
  | "confirmed_execution"
  | "current_resolution_only"
  | "historical_status_unknown"
  | "safe";

export type ServiceEvidence = {
  service: PathNode & { owner: string; criticality: "critical" | "high" | "medium" };
  repositoryId: Id;
  repositoryName: string;
  lockfileDigest: string;
  builds: BuildEvidence[];
};

export type ServiceSummary = {
  id: Id;
  name: string;
  owner: string;
  criticality: "critical" | "high" | "medium";
  status: ExposureStatus;
  reason: string;
  shortestPathLength: number | null;
  pathCount: number;
  chokepoints: string[];
};

export type QueryEvidence = {
  engine: "HydraDB";
  procedure: "algo.SSpaths" | "algo.SPpaths";
  templateId: "blast-radius-v1" | "exact-path-v1";
  query: string;
  parameters: Record<string, string | number | boolean>;
  consistency: "causal" | "strong";
  maxDepth: 8;
  elapsedMs: number;
  resultCount: number;
  queryIds: string[];
};

export type IncidentOverview = {
  incident: {
    id: Id;
    osvId: string;
    summary: string;
    severity: "critical";
    windowStart: string;
    windowEnd: string;
    sourceUrl: string;
  };
  metrics: {
    totalServices: 3;
    impactedServices: 2;
    confirmedExecution: 1;
    safeServices: 1;
    exposurePaths: 2;
  };
  services: ServiceSummary[];
  chokepoints: Array<{
    packageVersionId: Id;
    name: string;
    version: string;
    pathCount: number;
    serviceCount: number;
    recommendation: string;
    edgeId?: Id;
  }>;
  query: QueryEvidence;
};

export type ServiceDetail = {
  service: ServiceSummary;
  paths: EvidencePath[];
  buildEvidence: Array<Omit<BuildEvidence, "timestampMs">>;
  query: QueryEvidence;
};

export type ReplayResult = {
  baseline: { impactedServices: number; exposurePaths: number };
  simulated: { impactedServices: number; exposurePaths: number };
  removedServiceIds: Id[];
  removedPathIds: string[];
  remainingServiceIds: Id[];
  action: string;
  disclaimer: string;
};

export type SeedSummary = {
  seedVersion: string;
  fixtureRoot: string;
  lockfiles: number;
  nodesByLabel: Record<string, number>;
  edgesByType: Record<string, number>;
  affectedVersions: string[];
  durationMs: number;
  verified: boolean;
};
