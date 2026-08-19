import { createHash } from "node:crypto";

const MAX_SAFE_BIGINT = 9_007_199_254_740_991n;

export function canonicalKey(value: string): string {
  return value.normalize("NFC").trim();
}

export function stableId(key: string): string {
  const digest = createHash("sha256").update(canonicalKey(key), "utf8").digest();
  let value = 0n;
  for (const byte of digest.subarray(0, 8)) value = (value << 8n) | BigInt(byte);
  value &= 0x1fffffffffffffn;
  if (value === 0n) value = 1n;
  if (value > MAX_SAFE_BIGINT) throw new Error("Stable ID is not JSON safe");
  return value.toString(10);
}

export class IdCollisionError extends Error {
  constructor(
    public readonly id: string,
    public readonly firstKey: string,
    public readonly secondKey: string,
  ) {
    super(`ID_COLLISION for ${id}: ${firstKey} conflicts with ${secondKey}`);
    this.name = "IdCollisionError";
  }
}

export class CollisionGuard {
  private readonly ids = new Map<string, string>();

  claim(key: string): string {
    const normalized = canonicalKey(key);
    const id = stableId(normalized);
    const previous = this.ids.get(id);
    if (previous && previous !== normalized) throw new IdCollisionError(id, previous, normalized);
    this.ids.set(id, normalized);
    return id;
  }

  get size(): number {
    return this.ids.size;
  }
}

export function pathId(nodeIds: string[], edgeIds: string[]): string {
  const sequence = nodeIds
    .flatMap((nodeId, index) => (index < edgeIds.length ? [nodeId, edgeIds[index]] : [nodeId]))
    .join("/");
  return createHash("sha256").update(sequence, "utf8").digest("hex").slice(0, 16);
}
