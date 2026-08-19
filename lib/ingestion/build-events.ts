import { buildEventsFixtureSchema } from "@/lib/domain/schemas";

export type ParsedBuildEvent = {
  buildId: string;
  repositorySlug: string;
  commitSha: string;
  timestamp: string;
  timestampMs: number;
  environment: string;
  lockfileSha256: string;
};

export function parseBuildEvents(input: unknown): ParsedBuildEvent[] {
  const parsed = buildEventsFixtureSchema.safeParse(input);
  if (!parsed.success)
    throw new Error(
      `INVALID_FIXTURE build-events: ${parsed.error.issues[0]?.path.join(".") ?? "root"}`,
    );
  const buildKeys = new Set<string>();
  return parsed.data.events.map((event, index) => {
    const buildKey = `build:${event.repositorySlug}/${event.buildId}`;
    if (buildKeys.has(buildKey))
      throw new Error(`INVALID_FIXTURE build-events.events.${index}.buildId duplicate identity`);
    buildKeys.add(buildKey);
    const timestampMs = new Date(event.timestamp).valueOf();
    if (!Number.isSafeInteger(timestampMs))
      throw new Error(`INVALID_FIXTURE build-events.${event.buildId}.timestamp`);
    return { ...event, timestampMs };
  });
}

export function isTimestampInWindow(
  timestampMs: number,
  windowStartMs: number,
  windowEndMs: number,
): boolean {
  return timestampMs >= windowStartMs && timestampMs <= windowEndMs;
}
