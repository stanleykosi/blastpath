import type { EvidencePath } from "@/lib/domain/types";

export function canonicalPathSequence(path: EvidencePath): string {
  return path.nodes
    .flatMap((node, index) =>
      index < path.edges.length ? [node.id, path.edges[index].id] : [node.id],
    )
    .join("/");
}

export function compareEvidencePaths(left: EvidencePath, right: EvidencePath): number {
  const lengthOrder = left.length - right.length;
  if (lengthOrder !== 0) return lengthOrder;
  const leftSequence = canonicalPathSequence(left);
  const rightSequence = canonicalPathSequence(right);
  return leftSequence < rightSequence ? -1 : leftSequence > rightSequence ? 1 : 0;
}
