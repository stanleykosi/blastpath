import type { EvidencePath, Id, ReplayResult } from "@/lib/domain/types";

export type ReplayRequest = { action: "exclude_dependency_edge"; edgeIds: Id[]; label: string };

export class ReplayValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReplayValidationError";
  }
}

export class EvidencePathProtocolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EvidencePathProtocolError";
  }
}

export function validateReplayRequest(request: ReplayRequest, paths: EvidencePath[]): void {
  if (
    request.edgeIds.length < 1 ||
    request.edgeIds.length > 10 ||
    new Set(request.edgeIds).size !== request.edgeIds.length
  )
    throw new ReplayValidationError("The replay edge IDs are not valid.");
  if (request.label.trim().length < 1 || request.label.length > 120)
    throw new ReplayValidationError("The replay label is not valid.");
  const baselineEdgeIds = new Set(paths.flatMap((path) => path.edges.map((edge) => edge.id)));
  if (request.edgeIds.some((edgeId) => !baselineEdgeIds.has(edgeId)))
    throw new ReplayValidationError("A replay edge is not in the baseline affected paths.");
}

export function simulateReplay(request: ReplayRequest, paths: EvidencePath[]): ReplayResult {
  validateReplayRequest(request, paths);
  const excluded = new Set(request.edgeIds);
  const removed = paths.filter((path) => path.edges.some((edge) => excluded.has(edge.id)));
  const remaining = paths.filter((path) => !path.edges.some((edge) => excluded.has(edge.id)));
  const serviceIds = (values: EvidencePath[]) =>
    [
      ...new Set(values.map((path) => path.nodes[0]?.id).filter((id): id is Id => Boolean(id))),
    ].sort();
  const baselineServiceIds = serviceIds(paths);
  const remainingServiceIds = serviceIds(remaining);
  const remainingServiceIdSet = new Set(remainingServiceIds);
  const removedServiceIds = baselineServiceIds.filter(
    (serviceId) => !remainingServiceIdSet.has(serviceId),
  );
  return {
    baseline: { impactedServices: baselineServiceIds.length, exposurePaths: paths.length },
    simulated: { impactedServices: remainingServiceIds.length, exposurePaths: remaining.length },
    removedServiceIds,
    removedPathIds: removed.map((path) => path.id).sort(),
    remainingServiceIds,
    action: request.label,
    disclaimer:
      "Simulation over observed paths; no lockfile, repository, or HydraDB baseline was changed.",
  };
}

export function validateEvidencePath(path: EvidencePath, affectedVersionIds: Set<Id>): void {
  if (path.nodes.length !== path.edges.length + 1 || path.edges.length < 1 || path.edges.length > 8)
    throw new EvidencePathProtocolError("HydraDB returned an invalid path length.");
  if (
    path.nodes[0]?.label !== "Service" ||
    path.nodes.filter((node) => node.label === "Service").length !== 1
  )
    throw new EvidencePathProtocolError("HydraDB returned an invalid service endpoint.");
  if (
    !affectedVersionIds.has(path.nodes.at(-1)?.id ?? "") ||
    path.nodes.filter((node) => affectedVersionIds.has(node.id)).length !== 1
  )
    throw new EvidencePathProtocolError("HydraDB returned an invalid affected endpoint.");
  if (new Set(path.nodes.map((node) => node.id)).size !== path.nodes.length)
    throw new EvidencePathProtocolError("HydraDB returned a path with a repeated node.");
  path.edges.forEach((edge, index) => {
    if (
      edge.type !== "DEPENDS_ON" ||
      edge.source !== path.nodes[index].id ||
      edge.target !== path.nodes[index + 1].id
    )
      throw new EvidencePathProtocolError("HydraDB returned an invalid dependency edge.");
  });
}
