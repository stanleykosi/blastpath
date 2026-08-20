import { decodeEnvelope, decodeTaggedValue } from "@/lib/hydradb/codec";

describe("HydraDB tagged protocol", () => {
  it("decodes the official scalar, list, ID, and path tags", () => {
    expect(decodeTaggedValue({ type: "integer", value: 4 })).toBe(4);
    expect(decodeTaggedValue({ type: "signed_integer", value: -4 })).toBe(-4);
    expect(decodeTaggedValue({ type: "vertex_id", value: 44 })).toBe("44");
    expect(decodeTaggedValue({ type: "list", value: [{ type: "string", value: "x" }] })).toEqual([
      "x",
    ]);
    expect(
      decodeTaggedValue({
        type: "path",
        value: {
          nodes: [{ id: 1 }, { id: 2 }],
          relationships: [{ id: 3 }],
        },
      }),
    ).toEqual({ nodeIds: ["1", "2"], edgeIds: ["3"] });
  });

  it("decodes the official null tag without a value field", () => {
    expect(decodeTaggedValue({ type: "null" })).toBeNull();
    expect(
      decodeEnvelope({
        query_id: "q-null",
        columns: ["optional"],
        rows: [[{ type: "null" }]],
      }).rows,
    ).toEqual([[null]]);
  });

  it("rejects unknown tags and malformed envelopes", () => {
    expect(() => decodeTaggedValue({ type: "secret", value: "x" })).toThrow(/unknown value tag/);
    expect(() => decodeTaggedValue({ type: "string" })).toThrow(/tagged value without a value/);
    expect(() => decodeTaggedValue({ type: "null", value: "x" })).toThrow(/invalid null value/);
    expect(() =>
      decodeEnvelope({ query_id: "q", columns: ["x"], rows: [[{ type: "secret", value: "x" }]] }),
    ).toThrow(/unknown value tag/);
  });

  it("rejects over-depth and repeated-node paths at the wire boundary", () => {
    const pathValue = (nodeIds: number[], edgeIds: number[]) => ({
      type: "path",
      value: {
        nodes: nodeIds.map((id) => ({ id })),
        relationships: edgeIds.map((id) => ({ id })),
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
