import { EDGE_QUERY_BY_TYPE, NODE_QUERY_BY_LABEL, QUERIES } from "@/lib/hydradb/queries";

describe("Cypher query ownership", () => {
  it("keeps all write labels and relationship types in the allowlists", () => {
    expect(Object.keys(NODE_QUERY_BY_LABEL)).toHaveLength(9);
    expect(Object.keys(EDGE_QUERY_BY_TYPE)).toHaveLength(10);
    expect(QUERIES.reverseBlastPaths).toContain("algo.SSpaths");
    expect(QUERIES.exactPath).toContain("algo.SPpaths");
    expect(QUERIES.reverseBlastPaths).toContain("relDirection: 'incoming'");
    expect(QUERIES.reverseBlastPaths).toContain("maxLen: 8");
    expect(QUERIES.reverseBlastPaths).not.toContain("@tanstack");
    expect(QUERIES.seedMarker).toContain("{key: 'seed:blastpath-demo-v1'}");
    expect(QUERIES.seedMarker).toContain("-[:SEEDED]->(o:Organization)");
    expect(QUERIES.removeSeedMarker).toContain("{key: 'seed:blastpath-demo-v1'}");
    expect(QUERIES.removeSeedMarker).toContain("DETACH DELETE s");
    for (const query of Object.values(EDGE_QUERY_BY_TYPE)) {
      expect(query).toContain("r.key = row.key");
    }
    expect(QUERIES.seedNodeCounts).toContain("MATCH (n)");
    expect(QUERIES.seedEdgeCounts).toContain("count(r)");
    expect(QUERIES.seedNodeIdentities).toContain("RETURN n.id AS id ORDER BY id");
    expect(QUERIES.seedEdgeIdentities).toContain("RETURN r.id AS id ORDER BY id");
  });
});
