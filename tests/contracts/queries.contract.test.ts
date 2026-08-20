import {
  EDGE_COUNT_QUERY_BY_TYPE,
  EDGE_IDENTITIES_QUERY_BY_TYPE,
  EDGE_QUERY_BY_KIND,
  NODE_COUNT_QUERY_BY_LABEL,
  NODE_QUERY_BY_LABEL,
  QUERIES,
} from "@/lib/hydradb/queries";

describe("Cypher query ownership", () => {
  it("keeps all write labels and relationship types in the allowlists", () => {
    expect(Object.keys(NODE_QUERY_BY_LABEL)).toHaveLength(9);
    expect(Object.keys(EDGE_QUERY_BY_KIND)).toHaveLength(11);
    expect(QUERIES.reverseBlastPaths).toContain("algo.SSpaths");
    expect(QUERIES.exactPath).toContain("algo.SPpaths");
    expect(QUERIES.reverseBlastPaths).toContain("relDirection: 'incoming'");
    expect(QUERIES.reverseBlastPaths).toContain("maxLen: 8");
    expect(QUERIES.reverseBlastPaths).not.toContain("@tanstack");
    expect(QUERIES.hydrateEdge).toContain("(s {id: $source})");
    expect(QUERIES.hydrateEdge).toContain("(d {id: $target})");
    expect(QUERIES.hydrateEdge).not.toContain("r.id AS id");
    expect(QUERIES.seedMarker).toContain("{key: 'seed:blastpath-demo-v1'}");
    expect(QUERIES.seedMarker).toContain("-[:SEEDED]->(o:Organization)");
    expect(QUERIES.removeSeedMarker).toContain("{key: 'seed:blastpath-demo-v1'}");
    expect(QUERIES.removeSeedMarker).toContain("DETACH DELETE s");
    for (const query of Object.values(EDGE_QUERY_BY_KIND)) {
      expect(query).toContain("r.key = row.key");
      expect(query).toMatch(
        /MATCH \(s:[A-Za-z]+ \{id: row\.source\}\), \(d:[A-Za-z]+ \{id: row\.target\}\)/,
      );
    }
    expect(Object.keys(NODE_COUNT_QUERY_BY_LABEL)).toHaveLength(9);
    expect(Object.keys(EDGE_COUNT_QUERY_BY_TYPE)).toHaveLength(10);
    expect(Object.keys(EDGE_IDENTITIES_QUERY_BY_TYPE)).toHaveLength(10);
    for (const query of Object.values(NODE_COUNT_QUERY_BY_LABEL)) {
      expect(query).toContain("count(*) AS count");
    }
    for (const query of Object.values(EDGE_COUNT_QUERY_BY_TYPE)) {
      expect(query).toContain("count(*) AS count");
      expect(query).toMatch(/-\[r:[A-Z_]+\]->/);
    }
    expect(QUERIES.seedNodeIdentities).toContain("RETURN n.id AS id ORDER BY id");
    for (const query of Object.values(EDGE_IDENTITIES_QUERY_BY_TYPE)) {
      expect(query).toContain("RETURN r.id AS id ORDER BY id");
      expect(query).toMatch(/-\[r:[A-Z_]+\]->/);
    }
    expect(Object.values(QUERIES).join(" ")).not.toMatch(/labels\(|type\(|count\([^*]/);
  });
});
