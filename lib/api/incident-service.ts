import { AppError } from "@/lib/api/errors";
import {
  assembleOverview,
  evidenceByService,
  toServiceDetail,
} from "@/lib/domain/incident-overview";
import { classifyExposure } from "@/lib/domain/classify-exposure";
import { compareEvidencePaths } from "@/lib/domain/path-order";
import { EvidencePathProtocolError, validateEvidencePath } from "@/lib/domain/replay";
import { HydraRepository, type ExecutedQuery } from "@/lib/hydradb/repository";
import { QUERIES } from "@/lib/hydradb/queries";
import type {
  EvidencePath,
  IncidentOverview,
  QueryEvidence,
  ServiceDetail,
} from "@/lib/domain/types";

function queryEvidence(input: {
  procedure: "algo.SSpaths" | "algo.SPpaths";
  templateId: "blast-radius-v1" | "exact-path-v1";
  query: string;
  queries: ExecutedQuery[];
  parameters: Record<string, string | number | boolean>;
}): QueryEvidence {
  return {
    engine: "HydraDB",
    procedure: input.procedure,
    templateId: input.templateId,
    query: input.query,
    parameters: input.parameters,
    consistency: "causal",
    maxDepth: 8,
    elapsedMs: input.queries.reduce((total, query) => total + query.elapsedMs, 0),
    resultCount: input.queries.reduce((total, query) => total + query.resultCount, 0),
    queryIds: input.queries.map((query) => query.queryId),
  };
}

export function serviceEndingPaths(paths: EvidencePath[]): EvidencePath[] {
  return paths.filter((path) => path.nodes[0]?.label === "Service");
}

export function validateExactPaths(
  paths: EvidencePath[],
  affectedIdsByPath: string[],
  serviceId: string,
): void {
  if (paths.length !== affectedIdsByPath.length)
    throw new EvidencePathProtocolError("HydraDB returned an unassociated exact path.");
  paths.forEach((path, index) => {
    const affectedId = affectedIdsByPath[index];
    if (!affectedId)
      throw new EvidencePathProtocolError("HydraDB returned an unassociated exact path.");
    validateEvidencePath(path, new Set([affectedId]));
    if (path.nodes[0]?.id !== serviceId)
      throw new EvidencePathProtocolError("HydraDB returned the wrong service endpoint.");
  });
}

export async function getIncidentSnapshot(
  repository: HydraRepository,
  incidentId: string,
): Promise<{ overview: IncidentOverview; paths: EvidencePath[] }> {
  const incident = await repository.getIncident(incidentId);
  const affectedVersionIds = await repository.getAffectedVersionIds(incident.key);
  if (affectedVersionIds.length === 0)
    throw new AppError("GRAPH_NOT_SEEDED", "The incident has no seeded affected versions.", true);
  const reverseResults = await Promise.all(
    affectedVersionIds.map((versionId) => repository.getReversePaths(versionId)),
  );
  const hydratedPaths = await repository.normalizePaths(
    reverseResults.flatMap((result) => result.paths),
  );
  const paths: EvidencePath[] = serviceEndingPaths(hydratedPaths).sort(compareEvidencePaths);
  const serviceIds = await repository.listServices();
  const serviceEvidence = await Promise.all(
    serviceIds.map((serviceId) => repository.getServiceEvidence(serviceId)),
  );
  const query = queryEvidence({
    procedure: "algo.SSpaths",
    templateId: "blast-radius-v1",
    query: QUERIES.reverseBlastPaths,
    queries: reverseResults.map((result) => result.query),
    parameters: {
      source: Number(affectedVersionIds[0]),
    },
  });
  return {
    overview: assembleOverview({ incident, affectedVersionIds, paths, serviceEvidence, query }),
    paths,
  };
}

export async function getIncidentOverview(
  repository: HydraRepository,
  incidentId: string,
): Promise<IncidentOverview> {
  return (await getIncidentSnapshot(repository, incidentId)).overview;
}

export async function getServiceDetail(
  repository: HydraRepository,
  incidentId: string,
  serviceId: string,
): Promise<ServiceDetail> {
  const overview = await getIncidentOverview(repository, incidentId);
  const service = overview.services.find((value) => value.id === serviceId);
  if (!service) throw new AppError("SERVICE_NOT_FOUND", "The requested service was not found.");
  const incident = await repository.getIncident(incidentId);
  const affectedVersionIds = await repository.getAffectedVersionIds(incident.key);
  const exactResults = await Promise.all(
    affectedVersionIds.map((affectedId) => repository.getExactPaths(affectedId, serviceId)),
  );
  const exactCandidates = exactResults.flatMap((result, resultIndex) =>
    result.paths.map((path) => ({ path, affectedId: affectedVersionIds[resultIndex] })),
  );
  const exactPaths = await repository.normalizePaths(
    exactCandidates.map((candidate) => candidate.path),
  );
  validateExactPaths(
    exactPaths,
    exactCandidates.map((candidate) => candidate.affectedId),
    serviceId,
  );
  exactPaths.sort(compareEvidencePaths);
  const evidence = await repository.getServiceEvidence(serviceId);
  const classification = classifyExposure({
    hasAffectedPath: exactPaths.length > 0,
    lockfileDigest: evidence.lockfileDigest,
    builds: evidence.builds,
    incident,
  });
  const exactQuery = queryEvidence({
    procedure: "algo.SPpaths",
    templateId: "exact-path-v1",
    query: QUERIES.exactPath,
    queries: exactResults.map((result) => result.query),
    parameters: {
      affected: Number(affectedVersionIds[0]),
      service: Number(serviceId),
    },
  });
  return toServiceDetail(service, exactPaths, classification.builds, exactQuery);
}

export function pathsForService(paths: EvidencePath[], serviceId: string): EvidencePath[] {
  return evidenceByService(paths).get(serviceId) ?? [];
}
