import type { EvidencePath, Id, NormalizedIncident } from "@/lib/domain/types";

export type Chokepoint = {
  packageVersionId: Id;
  name: string;
  version: string;
  pathCount: number;
  serviceCount: number;
  recommendation: string;
  edgeId?: Id;
};

const REPLAY_UPGRADES = new Map([["@blastpath/demo-platform@2.4.0", "2.4.1"]]);

export function rankChokepoints(paths: EvidencePath[], incident: NormalizedIncident): Chokepoint[] {
  const records = new Map<
    Id,
    {
      node: EvidencePath["nodes"][number];
      pathIds: Set<string>;
      serviceIds: Set<Id>;
      edgeIds: Set<Id>;
    }
  >();
  for (const path of paths) {
    const serviceId = path.nodes[0]?.id;
    for (let index = 1; index < path.nodes.length - 1; index += 1) {
      const node = path.nodes[index];
      if (node.label !== "PackageVersion" || node.id === path.nodes.at(-1)?.id) continue;
      const record = records.get(node.id) ?? {
        node,
        pathIds: new Set<string>(),
        serviceIds: new Set<Id>(),
        edgeIds: new Set<Id>(),
      };
      record.pathIds.add(path.id);
      if (serviceId) record.serviceIds.add(serviceId);
      const nextEdge = path.edges[index];
      if (nextEdge && nextEdge.source === node.id) record.edgeIds.add(nextEdge.id);
      records.set(node.id, record);
    }
  }
  return [...records.values()]
    .filter((record) => record.serviceIds.size >= 2)
    .map((record) => {
      const affected = incident.affected.find((value) => value.name === record.node.name);
      const currentVersion = record.node.version ?? "";
      const replayFixedVersion = REPLAY_UPGRADES.get(`${record.node.name}@${currentVersion}`);
      return {
        packageVersionId: record.node.id,
        name: record.node.name,
        version: currentVersion,
        pathCount: record.pathIds.size,
        serviceCount: record.serviceIds.size,
        recommendation: replayFixedVersion
          ? `Upgrade ${record.node.name} from ${currentVersion} to ${replayFixedVersion}`
          : affected
            ? `Upgrade ${record.node.name} from ${currentVersion} to ${affected.fixedVersion}`
            : `Review ${record.node.name}@${record.node.version ?? ""}`,
        edgeId: [...record.edgeIds].sort()[0],
      };
    })
    .sort(
      (a, b) =>
        b.serviceCount - a.serviceCount ||
        b.pathCount - a.pathCount ||
        `${a.name}@${a.version}`.localeCompare(`${b.name}@${b.version}`),
    );
}
