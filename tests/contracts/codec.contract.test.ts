import { decodeEnvelope, decodeTaggedValue } from "@/lib/hydradb/codec";

describe("HydraDB tagged protocol", () => {
  it("decodes scalar, list, ID, and path tags", () => {
    expect(decodeTaggedValue({ type: "integer", value: 4 })).toBe(4);
    expect(decodeTaggedValue({ type: "vertex_id", value: 44 })).toBe("44");
    expect(decodeTaggedValue({ type: "list", value: [{ type: "string", value: "x" }] })).toEqual([
      "x",
    ]);
    expect(
      decodeTaggedValue({
        type: "path",
        value: {
          nodes: [
            { type: "vertex_id", value: 1 },
            { type: "vertex_id", value: 2 },
          ],
          edges: [{ type: "edge_id", value: 3 }],
        },
      }),
    ).toEqual({ nodeIds: ["1", "2"], edgeIds: ["3"] });
  });

  it("rejects unknown tags and malformed envelopes", () => {
    expect(() => decodeTaggedValue({ type: "secret", value: "x" })).toThrow(/unknown value tag/);
    expect(() =>
      decodeEnvelope({ query_id: "q", columns: ["x"], rows: [[{ type: "secret", value: "x" }]] }),
    ).toThrow(/unknown value tag/);
  });

  it("rejects over-depth and repeated-node paths at the wire boundary", () => {
    const pathValue = (nodeIds: number[], edgeIds: number[]) => ({
      type: "path",
      value: {
        nodes: nodeIds.map((value) => ({ type: "vertex_id", value })),
        edges: edgeIds.map((value) => ({ type: "edge_id", value })),
      },
    });

    expect(() =>
      decodeTaggedValue(
        pathValue(
          Array.from({ length: 10 }, (_, index) => index + 1),
          Array.from({ length: 9 }, (_, index) => index + 101),
        ),
      ),
    ).toThrow(/invalid path shape/);
    expect(() => decodeTaggedValue(pathValue([1, 2, 1], [101, 102]))).toThrow(/invalid path shape/);
  });
});
