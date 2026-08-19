import { getServerEnv, type ServerEnv } from "@/lib/config/env";
import { HydradbError } from "@/lib/api/errors";
import { decodeEnvelope, type DecodedPath } from "@/lib/hydradb/codec";

export type QueryConsistency = "causal" | "strong";
export type QueryParameters = Record<string, unknown>;

export type QueryResult = {
  queryId: string;
  columns: string[];
  rows: unknown[][];
  bookmark?: string;
  elapsedMs: number;
};

export const MAX_HYDRADB_RESPONSE_BYTES = 1024 * 1024;
const MAX_HYDRADB_ERROR_BYTES = 4096;
const MAX_HYDRADB_ERROR_TEXT = 240;
const SENSITIVE_ERROR_TEXT =
  /\b(authorization|token|secret|password|cookie)(\s*[:=]\s*)([^\s,;]+)/gi;

function safeErrorText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_HYDRADB_ERROR_TEXT)
    .replace(SENSITIVE_ERROR_TEXT, "$1$2[REDACTED]");
  return normalized || undefined;
}

async function readHydradbErrorDetail(response: Response): Promise<string | undefined> {
  const contentLength = response.headers.get("content-length");
  if (
    contentLength !== null &&
    (!/^\d+$/.test(contentLength) || Number(contentLength) > MAX_HYDRADB_ERROR_BYTES)
  )
    return undefined;
  if (!response.body) return undefined;

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_HYDRADB_ERROR_BYTES) {
      await reader.cancel().catch(() => undefined);
      return undefined;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
    if (typeof body !== "object" || body === null) return undefined;
    const record = body as Record<string, unknown>;
    const nested =
      typeof record.error === "object" && record.error !== null
        ? (record.error as Record<string, unknown>)
        : undefined;
    const code = safeErrorText(nested?.code ?? record.code);
    const message = safeErrorText(
      typeof record.error === "string" ? record.error : (nested?.message ?? record.message),
    );
    if (code && message) return `${code}: ${message}`;
    return message ?? code;
  } catch {
    return undefined;
  }
}

async function readHydradbJson(
  response: Response,
  controller: AbortController,
  queryId: string,
): Promise<unknown> {
  const contentLength = response.headers.get("content-length");
  if (
    contentLength !== null &&
    (!/^\d+$/.test(contentLength) || Number(contentLength) > MAX_HYDRADB_RESPONSE_BYTES)
  ) {
    controller.abort();
    throw new HydradbError("HYDRADB_PROTOCOL_ERROR", "HydraDB returned an oversized response.", {
      queryId,
    });
  }
  if (!response.body)
    throw new HydradbError("HYDRADB_PROTOCOL_ERROR", "HydraDB returned an empty response.", {
      queryId,
    });

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_HYDRADB_RESPONSE_BYTES) {
        void reader.cancel().catch(() => undefined);
        controller.abort();
        throw new HydradbError(
          "HYDRADB_PROTOCOL_ERROR",
          "HydraDB returned an oversized response.",
          { queryId },
        );
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } catch (error) {
    if (error instanceof HydradbError) throw error;
    throw new HydradbError("HYDRADB_PROTOCOL_ERROR", "HydraDB returned invalid JSON.", {
      queryId,
      cause: error,
    });
  }
}

export class HydradbClient {
  private readonly env: ServerEnv;
  private bookmark: string | undefined;

  constructor(env: ServerEnv = getServerEnv()) {
    this.env = env;
  }

  async query(
    operation: string,
    query: string,
    parameters: QueryParameters,
    consistency: QueryConsistency = "causal",
  ): Promise<QueryResult> {
    const queryId = `blastpath-${operation}-${crypto.randomUUID()}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.env.HYDRADB_TIMEOUT_MS);
    const started = performance.now();
    try {
      const response = await fetch(
        `${this.env.hydradbHttpUrl}/v1/graphs/${this.env.HYDRADB_GRAPH_ID}/query`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${this.env.HYDRADB_TOKEN}`,
            "content-type": "application/json",
            "x-graph-namespace": this.env.HYDRADB_NAMESPACE,
          },
          body: JSON.stringify({
            cell_id: this.env.HYDRADB_CELL_ID,
            query_id: queryId,
            query,
            parameters,
            timeout_ms: this.env.HYDRADB_TIMEOUT_MS,
            page_size: 1000,
            consistency,
            bookmark: this.bookmark,
          }),
          signal: controller.signal,
        },
      );
      if (!response.ok) {
        const safeStatus =
          response.status >= 500 ? "HYDRADB_UNAVAILABLE" : "HYDRADB_PROTOCOL_ERROR";
        const detail = await readHydradbErrorDetail(response);
        throw new HydradbError(safeStatus, `HydraDB returned HTTP ${response.status}.`, {
          queryId,
          retryable: response.status >= 500,
          detail,
        });
      }
      const body = await readHydradbJson(response, controller, queryId);
      const decoded = decodeEnvelope(body);
      if (decoded.bookmark) this.bookmark = decoded.bookmark;
      return { ...decoded, elapsedMs: Math.max(0, Math.round(performance.now() - started)) };
    } catch (error) {
      if (error instanceof HydradbError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new HydradbError("HYDRADB_TIMEOUT", "HydraDB did not respond before the timeout.", {
          queryId,
          cause: error,
        });
      }
      throw new HydradbError("HYDRADB_UNAVAILABLE", "HydraDB is not available.", {
        queryId,
        cause: error,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  async readWithRetry(
    operation: string,
    query: string,
    parameters: QueryParameters,
    consistency: QueryConsistency = "causal",
  ): Promise<QueryResult> {
    try {
      return await this.query(operation, query, parameters, consistency);
    } catch (error) {
      if (!(error instanceof HydradbError) || !error.retryable) throw error;
      await new Promise((resolve) => setTimeout(resolve, 150));
      return this.query(operation, query, parameters, consistency);
    }
  }

  async ready(): Promise<boolean> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.env.HYDRADB_TIMEOUT_MS);
    try {
      const response = await fetch(`${this.env.hydradbAdminUrl}/readyz`, {
        headers: { authorization: `Bearer ${this.env.HYDRADB_TOKEN}` },
        signal: controller.signal,
      });
      return response.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function isDecodedPath(value: unknown): value is DecodedPath {
  return typeof value === "object" && value !== null && "nodeIds" in value && "edgeIds" in value;
}
