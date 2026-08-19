import { NextResponse } from "next/server";
import { EvidencePathProtocolError, ReplayValidationError } from "@/lib/domain/replay";
import { InvalidFixtureError } from "@/lib/ingestion/errors";

export type ApiErrorCode =
  | "INVALID_REQUEST"
  | "INCIDENT_NOT_FOUND"
  | "SERVICE_NOT_FOUND"
  | "SEED_IN_PROGRESS"
  | "SEED_ROUTE_DISABLED"
  | "GRAPH_NOT_SEEDED"
  | "INVALID_FIXTURE"
  | "HYDRADB_PROTOCOL_ERROR"
  | "HYDRADB_UNAVAILABLE"
  | "HYDRADB_TIMEOUT"
  | "INTERNAL_ERROR";

const statusByCode: Record<ApiErrorCode, number> = {
  INVALID_REQUEST: 400,
  INCIDENT_NOT_FOUND: 404,
  SERVICE_NOT_FOUND: 404,
  SEED_IN_PROGRESS: 409,
  SEED_ROUTE_DISABLED: 403,
  GRAPH_NOT_SEEDED: 409,
  INVALID_FIXTURE: 422,
  HYDRADB_PROTOCOL_ERROR: 502,
  HYDRADB_UNAVAILABLE: 503,
  HYDRADB_TIMEOUT: 504,
  INTERNAL_ERROR: 500,
};

export class AppError extends Error {
  readonly code: ApiErrorCode;
  readonly retryable: boolean;
  readonly status: number;

  constructor(code: ApiErrorCode, message: string, retryable = false, cause?: unknown) {
    super(message, { cause });
    this.name = "AppError";
    this.code = code;
    this.retryable = retryable;
    this.status = statusByCode[code];
  }
}

export class HydradbError extends AppError {
  readonly queryId?: string;
  readonly detail?: string;

  constructor(
    code: "HYDRADB_PROTOCOL_ERROR" | "HYDRADB_UNAVAILABLE" | "HYDRADB_TIMEOUT",
    message: string,
    options?: { queryId?: string; cause?: unknown; retryable?: boolean; detail?: string },
  ) {
    super(code, message, options?.retryable ?? code !== "HYDRADB_PROTOCOL_ERROR", options?.cause);
    this.name = "HydradbError";
    this.queryId = options?.queryId;
    this.detail = options?.detail;
  }
}

export class HydradbBatchError extends HydradbError {
  readonly batchIndex: number;
  readonly batchKind: "node" | "relationship";
  readonly batchValue: string;

  constructor(
    batchKind: "node" | "relationship",
    batchValue: string,
    batchIndex: number,
    cause: unknown,
  ) {
    const hydradbCause = cause instanceof HydradbError ? cause : undefined;
    const code =
      hydradbCause?.code === "HYDRADB_PROTOCOL_ERROR" ||
      hydradbCause?.code === "HYDRADB_UNAVAILABLE" ||
      hydradbCause?.code === "HYDRADB_TIMEOUT"
        ? hydradbCause.code
        : "HYDRADB_UNAVAILABLE";
    super(code, `HydraDB ${batchKind} ${batchValue} batch ${batchIndex} failed.`, {
      queryId: hydradbCause?.queryId,
      cause,
      retryable: hydradbCause?.retryable ?? false,
      detail: hydradbCause?.detail,
    });
    this.name = "HydradbBatchError";
    this.batchIndex = batchIndex;
    this.batchKind = batchKind;
    this.batchValue = batchValue;
  }
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof ReplayValidationError)
    return new AppError("INVALID_REQUEST", error.message, false, error);
  if (error instanceof EvidencePathProtocolError)
    return new HydradbError("HYDRADB_PROTOCOL_ERROR", error.message, { cause: error });
  if (error instanceof InvalidFixtureError)
    return new AppError("INVALID_FIXTURE", "The demo fixtures are not valid.", false, error);
  return new AppError("INTERNAL_ERROR", "The request could not be completed.", false, error);
}

const REDACTED = "[REDACTED]";
const SENSITIVE_KEY = /authorization|token|secret|password|cookie/i;
const SENSITIVE_TEXT = /\b(authorization|token|secret|password|cookie)(\s*[:=]\s*)([^\s,;]+)/gi;
const MAX_LOG_DEPTH = 4;
const MAX_LOG_ITEMS = 20;
const MAX_LOG_TEXT = 2_000;

function redactText(value: string): string {
  return value.slice(0, MAX_LOG_TEXT).replace(SENSITIVE_TEXT, `$1$2${REDACTED}`);
}

function redactForLog(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (value === undefined) return undefined;
  if (value === null || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "string") return redactText(value);
  if (typeof value === "bigint" || typeof value === "symbol" || typeof value === "function")
    return String(value);
  if (depth >= MAX_LOG_DEPTH) return "[TRUNCATED]";
  if (seen.has(value)) return "[CIRCULAR]";
  seen.add(value);
  if (value instanceof Error) {
    return {
      name: redactText(value.name),
      message: redactText(value.message),
      stack: value.stack ? redactText(value.stack) : undefined,
      cause: value.cause === undefined ? undefined : redactForLog(value.cause, depth + 1, seen),
    };
  }
  if (Array.isArray(value))
    return value.slice(0, MAX_LOG_ITEMS).map((item) => redactForLog(item, depth + 1, seen));
  const redacted: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value).slice(0, MAX_LOG_ITEMS))
    redacted[key] = SENSITIVE_KEY.test(key) ? REDACTED : redactForLog(item, depth + 1, seen);
  return redacted;
}

function logUnexpectedError(error: unknown, requestIdValue: string): void {
  try {
    console.error(
      JSON.stringify({
        event: "unexpected_api_error",
        requestId: requestIdValue,
        error: redactForLog(error),
      }),
    );
  } catch {
    console.error(
      JSON.stringify({
        event: "unexpected_api_error",
        requestId: requestIdValue,
        error: "[UNSERIALIZABLE]",
      }),
    );
  }
}

export function responseError(error: unknown, requestId: string): NextResponse {
  const safe = toAppError(error);
  if (safe.code === "INTERNAL_ERROR") logUnexpectedError(error, requestId);
  return NextResponse.json(
    { error: { code: safe.code, message: safe.message, requestId, retryable: safe.retryable } },
    { status: safe.status, headers: { "Cache-Control": "no-store" } },
  );
}

export function responseSuccess<T>(data: T, requestId: string, status = 200): NextResponse {
  return NextResponse.json(
    { data, meta: { requestId } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export function requestId(): string {
  return `bp-${crypto.randomUUID()}`;
}

export function isJsonRequest(request: Request): boolean {
  return (request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json");
}

export const MAX_JSON_BODY_BYTES = 16 * 1024;

export async function readJsonBody(request: Request): Promise<unknown> {
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    if (!/^\d+$/.test(contentLength) || Number(contentLength) > MAX_JSON_BODY_BYTES)
      throw new AppError(
        "INVALID_REQUEST",
        `The request body must not exceed ${MAX_JSON_BODY_BYTES} bytes.`,
      );
  }

  try {
    if (!request.body) throw new Error("The request body is empty.");
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_JSON_BODY_BYTES) {
        await reader.cancel();
        throw new AppError(
          "INVALID_REQUEST",
          `The request body must not exceed ${MAX_JSON_BODY_BYTES} bytes.`,
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
    if (error instanceof AppError) throw error;
    throw new AppError(
      "INVALID_REQUEST",
      "The request body must contain valid JSON.",
      false,
      error,
    );
  }
}

export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
