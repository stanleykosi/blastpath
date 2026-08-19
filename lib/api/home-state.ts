import { AppError, HydradbError } from "@/lib/api/errors";

export type HomeFailureState = "unseeded" | "hydradb" | "error";

export function homeFailureState(error: unknown): HomeFailureState {
  if (error instanceof AppError && error.code === "GRAPH_NOT_SEEDED") return "unseeded";
  if (error instanceof HydradbError) return "hydradb";
  return "error";
}
