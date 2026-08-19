import { CollisionGuard, pathId, stableId } from "@/lib/ingestion/id";

describe("stable IDs", () => {
  it("returns a deterministic positive JSON-safe decimal ID", () => {
    const id = stableId("pkg:npm/%40tanstack%2Frouter-core@1.169.5");
    expect(id).toMatch(/^[1-9]\d*$/);
    expect(Number(id)).toBeLessThanOrEqual(Number.MAX_SAFE_INTEGER);
    expect(stableId("pkg:npm/%40tanstack%2Frouter-core@1.169.5")).toBe(id);
  });

  it("guards an ID map against key collisions", () => {
    const guard = new CollisionGuard();
    expect(guard.claim("one")).toBe(stableId("one"));
    expect(() => guard.claim("one\u0301".normalize("NFC"))).not.toThrow();
    expect(pathId(["1", "2"], ["3"])).toHaveLength(16);
  });
});
