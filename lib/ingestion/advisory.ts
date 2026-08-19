import { incidentFixtureSchema } from "@/lib/domain/schemas";
import type { NormalizedIncident } from "@/lib/domain/types";
import { stableId } from "@/lib/ingestion/id";

export function parseAdvisory(input: unknown): NormalizedIncident {
  const parsed = incidentFixtureSchema.safeParse(input);
  if (!parsed.success)
    throw new Error(
      `INVALID_FIXTURE incident: ${parsed.error.issues[0]?.path.join(".") ?? "root"}`,
    );
  const start = new Date(parsed.data.windowStart).valueOf();
  const end = new Date(parsed.data.windowEnd).valueOf();
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= end)
    throw new Error("INVALID_FIXTURE incident.windowStart/windowEnd");
  return {
    id: stableId(`advisory:${parsed.data.id}`),
    key: `advisory:${parsed.data.id}`,
    osvId: parsed.data.id,
    summary: parsed.data.summary,
    severity: parsed.data.severity,
    windowStart: parsed.data.windowStart,
    windowStartMs: start,
    windowEnd: parsed.data.windowEnd,
    windowEndMs: end,
    sourceUrl: parsed.data.sourceUrl,
    affected: parsed.data.affected,
  };
}

export type AdvisoryFixture = ReturnType<typeof parseAdvisory>;
