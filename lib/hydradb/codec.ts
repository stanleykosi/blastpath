import { HydradbError } from "@/lib/api/errors";

export type DecodedPath = {
  nodeIds: string[];
  edgeIds: string[];
};

const tags = new Set([
  "integer",
  "signed_integer",
  "float",
  "string",
  "boolean",
  "vertex_id",
  "path",
  "list",
  "null",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function decimalId(value: unknown): string {
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) return String(value);
  if (typeof value === "string" && /^[1-9]\d*$/.test(value)) return value;
  throw new HydradbError("HYDRADB_PROTOCOL_ERROR", "HydraDB returned an invalid numeric ID.");
}

function pathIntegerProperty(value: unknown): string {
  if (!isRecord(value) || Object.keys(value).length !== 1 || !("Integer" in value)) {
    throw new HydradbError(
      "HYDRADB_PROTOCOL_ERROR",
      "HydraDB returned a path relationship without a stable ID.",
    );
  }
  return decimalId(value.Integer);
}

export function decodeTaggedValue(value: unknown): unknown {
  if (!isRecord(value)) {
    throw new HydradbError("HYDRADB_PROTOCOL_ERROR", "HydraDB returned a malformed tagged value.");
  }
  const type = value.type;
  if (typeof type !== "string" || !tags.has(type)) {
    throw new HydradbError("HYDRADB_PROTOCOL_ERROR", "HydraDB returned an unknown value tag.");
  }
  if (type === "null") {
    if ("value" in value && value.value !== null) {
      throw new HydradbError("HYDRADB_PROTOCOL_ERROR", "HydraDB returned an invalid null value.");
    }
    return null;
  }
  if (!("value" in value)) {
    throw new HydradbError(
      "HYDRADB_PROTOCOL_ERROR",
      "HydraDB returned a tagged value without a value.",
    );
  }
  const raw = value.value;
  switch (type) {
    case "integer":
    case "signed_integer":
      if (typeof raw !== "number" || !Number.isSafeInteger(raw))
        throw new HydradbError("HYDRADB_PROTOCOL_ERROR", "HydraDB returned an invalid integer.");
      return raw;
    case "float":
      if (typeof raw !== "number" || !Number.isFinite(raw))
        throw new HydradbError("HYDRADB_PROTOCOL_ERROR", "HydraDB returned an invalid float.");
      return raw;
    case "string":
      if (typeof raw !== "string")
        throw new HydradbError("HYDRADB_PROTOCOL_ERROR", "HydraDB returned an invalid string.");
      return raw;
    case "boolean":
      if (typeof raw !== "boolean")
        throw new HydradbError("HYDRADB_PROTOCOL_ERROR", "HydraDB returned an invalid boolean.");
      return raw;
    case "vertex_id":
      return decimalId(raw);
    case "list":
      if (!Array.isArray(raw))
        throw new HydradbError("HYDRADB_PROTOCOL_ERROR", "HydraDB returned an invalid list.");
      return raw.map(decodeTaggedValue);
    case "path":
      return decodePathValue(raw);
  }
}

function decodePathValue(raw: unknown): DecodedPath {
  if (!isRecord(raw))
    throw new HydradbError("HYDRADB_PROTOCOL_ERROR", "HydraDB returned a malformed path.");
  const rawNodes = raw.nodes;
  const rawEdges = raw.relationships;
  if (!Array.isArray(rawNodes) || !Array.isArray(rawEdges)) {
    throw new HydradbError(
      "HYDRADB_PROTOCOL_ERROR",
      "HydraDB returned a path without nodes or edges.",
    );
  }
  const nodeIds = rawNodes.map((node) => {
    if (!isRecord(node))
      throw new HydradbError("HYDRADB_PROTOCOL_ERROR", "HydraDB returned an invalid path node.");
    return decimalId(node.id);
  });
  const edgeIds = rawEdges.map((edge, index) => {
    if (!isRecord(edge))
      throw new HydradbError(
        "HYDRADB_PROTOCOL_ERROR",
        "HydraDB returned an invalid path relationship.",
      );
    decimalId(edge.id);
    if (edge.edge_type !== "DEPENDS_ON" || !isRecord(edge.properties)) {
      throw new HydradbError(
        "HYDRADB_PROTOCOL_ERROR",
        "HydraDB returned an invalid path relationship.",
      );
    }
    const source = decimalId(edge.src);
    const target = decimalId(edge.dst);
    const left = nodeIds[index];
    const right = nodeIds[index + 1];
    if (!((source === left && target === right) || (source === right && target === left))) {
      throw new HydradbError(
        "HYDRADB_PROTOCOL_ERROR",
        "HydraDB returned a path relationship with invalid endpoints.",
      );
    }
    return pathIntegerProperty(edge.properties.id);
  });
  if (edgeIds.length !== nodeIds.length - 1) {
    throw new HydradbError(
      "HYDRADB_PROTOCOL_ERROR",
      "HydraDB returned a path with invalid cardinality.",
    );
  }
  if (edgeIds.length > 8 || new Set(nodeIds).size !== nodeIds.length) {
    throw new HydradbError("HYDRADB_PROTOCOL_ERROR", "HydraDB returned an invalid path shape.");
  }
  return { nodeIds, edgeIds };
}

export type HydradbEnvelope = {
  query_id: string;
  columns: string[];
  rows: unknown[][];
  read_epoch?: number;
  next_cursor?: number | null;
  bookmark?: string | null;
};

export function decodeEnvelope(input: unknown): {
  queryId: string;
  columns: string[];
  rows: unknown[][];
  bookmark?: string;
} {
  if (
    !isRecord(input) ||
    typeof input.query_id !== "string" ||
    !Array.isArray(input.columns) ||
    !Array.isArray(input.rows)
  ) {
    throw new HydradbError(
      "HYDRADB_PROTOCOL_ERROR",
      "HydraDB returned an invalid response envelope.",
    );
  }
  const columns = input.columns.map((column) => {
    if (typeof column !== "string")
      throw new HydradbError("HYDRADB_PROTOCOL_ERROR", "HydraDB returned an invalid column name.");
    return column;
  });
  const rows = input.rows.map((row) => {
    if (!Array.isArray(row))
      throw new HydradbError("HYDRADB_PROTOCOL_ERROR", "HydraDB returned an invalid row.");
    if (row.length !== columns.length)
      throw new HydradbError(
        "HYDRADB_PROTOCOL_ERROR",
        "HydraDB returned a row with invalid width.",
      );
    return row.map(decodeTaggedValue);
  });
  return {
    queryId: input.query_id,
    columns,
    rows,
    bookmark: typeof input.bookmark === "string" ? input.bookmark : undefined,
  };
}

export function rowsAsRecords(decoded: {
  columns: string[];
  rows: unknown[][];
}): Array<Record<string, unknown>> {
  return decoded.rows.map((row) =>
    Object.fromEntries(decoded.columns.map((column, index) => [column, row[index]])),
  );
}
