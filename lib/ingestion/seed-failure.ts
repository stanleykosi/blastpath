import { AppError, HydradbBatchError, HydradbError } from "@/lib/api/errors";

export type SeedFailureRecord = {
  error: {
    code: string;
    message: string;
    status?: number;
    queryId?: string;
    batchIndex?: number;
    label?: string;
    type?: string;
  };
};

export function seedFailureRecord(error: unknown): SeedFailureRecord {
  const message = error instanceof Error ? error.message : "Seed failed.";
  const record: SeedFailureRecord["error"] = {
    code: error instanceof AppError ? error.code : (message.split(" ")[0] ?? "SEED_FAILED"),
    message: message.slice(0, 240),
  };
  if (error instanceof AppError) record.status = error.status;
  if (error instanceof HydradbError && error.queryId) record.queryId = error.queryId;
  if (error instanceof HydradbBatchError) {
    record.batchIndex = error.batchIndex;
    if (error.batchKind === "node") record.label = error.batchValue;
    else record.type = error.batchValue;
  }
  return { error: record };
}
