import { classifyExposure } from "@/lib/domain/classify-exposure";
import { compareEvidencePaths } from "@/lib/domain/path-order";
import { rankChokepoints } from "@/lib/domain/rank-chokepoints";
import { validateEvidencePath } from "@/lib/domain/replay";
import type {
  BuildEvidence,
  EvidencePath,
  IncidentOverview,
  NormalizedIncident,
  QueryEvidence,
  ServiceDetail,
  ServiceEvidence,
  ServiceSummary,
} from "@/lib/domain/types";

const criticalityRank = { critical: 0, high: 1, medium: 2 } as const;
const statusRank = {
  confirmed_execution: 0,
  current_resolution_only: 1,
  historical_status_unknown: 2,
  safe: 3,
} as const;

export function assembleOverview(input: {
  incident: NormalizedIncident;
  affectedVersionIds: string[];
  paths: EvidencePath[];
  serviceEvidence: ServiceEvidence[];
  query: QueryEvidence;
}): IncidentOverview {
  const affectedIds = new Set(input.affectedVersionIds);
  for (const path of input.paths) validateEvidencePath(path, affectedIds);
  const pathsByService = new Map<string, EvidencePath[]>();
  for (const path of input.paths) {
    const serviceId = path.nodes[0]?.id;
    if (!serviceId) continue;
    const values = pathsByService.get(serviceId) ?? [];
    values.push(path);
    pathsByService.set(serviceId, values);
  }
  const services: ServiceSummary[] = input.serviceEvidence.map((evidence) => {
    const servicePaths = pathsByService.get(evidence.service.id) ?? [];
    const classification = classifyExposure({
      hasAffectedPath: servicePaths.length > 0,
      lockfileDigest: evidence.lockfileDigest,
      builds: evidence.builds,
      incident: input.incident,
    });
    return {
      id: evidence.service.id,
      name: evidence.service.name,
      owner: evidence.service.owner,
      criticality: evidence.service.criticality,
      status: classification.status,
      reason: classification.reason,
      shortestPathLength:
        servicePaths.length > 0 ? Math.min(...servicePaths.map((path) => path.length)) : null,
      pathCount: servicePaths.length,
      chokepoints: [],
    };
  });
  const chokepoints = rankChokepoints(input.paths, input.incident);
  for (const service of services) {
    service.chokepoints = chokepoints
      .filter((chokepoint) =>
        input.paths.some(
          (path) =>
            path.nodes[0]?.id === service.id &&
            path.nodes.some((node) => node.id === chokepoint.packageVersionId),
        ),
      )
      .map((chokepoint) => `${chokepoint.name}@${chokepoint.version}`);
  }
  const sortedServices = services.sort(
    (a, b) =>
      statusRank[a.status] - statusRank[b.status] ||
      criticalityRank[a.criticality] - criticalityRank[b.criticality] ||
      a.name.localeCompare(b.name),
  );
  const confirmedExecution = sortedServices.filter(
    (service) => service.status === "confirmed_execution",
  ).length;
  const safeServices = sortedServices.filter((service) => service.status === "safe").length;
  const impactedServices = sortedServices.filter((service) => service.status !== "safe").length;
  return {
    incident: {
      id: input.incident.id,
      osvId: input.incident.osvId,
      summary: input.incident.summary,
      severity: input.incident.severity,
      windowStart: input.incident.windowStart,
      windowEnd: input.incident.windowEnd,
      sourceUrl: input.incident.sourceUrl,
    },
    metrics: {
      totalServices: sortedServices.length,
      impactedServices,
      confirmedExecution,
      safeServices,
      exposurePaths: input.paths.length,
    },
    services: sortedServices,
    chokepoints,
    query: input.query,
  } as IncidentOverview;
}

export function toServiceDetail(
  service: ServiceSummary,
  paths: EvidencePath[],
  builds: BuildEvidence[],
  query: QueryEvidence,
): ServiceDetail {
  return {
    service,
    paths: paths.sort(compareEvidencePaths),
    buildEvidence: builds
      .sort((a, b) => a.timestampMs - b.timestampMs)
      .map(({ buildId, timestamp, environment, lockfileDigest, inWindow }) => ({
        buildId,
        timestamp,
        environment,
        lockfileDigest,
        inWindow,
      })),
    query,
  };
}

export function evidenceByService(paths: EvidencePath[]): Map<string, EvidencePath[]> {
  const result = new Map<string, EvidencePath[]>();
  for (const path of paths) {
    const serviceId = path.nodes[0]?.id;
    if (!serviceId) continue;
    result.set(serviceId, [...(result.get(serviceId) ?? []), path]);
  }
  return result;
}
