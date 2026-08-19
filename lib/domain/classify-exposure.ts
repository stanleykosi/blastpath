import type { BuildEvidence, ExposureStatus, NormalizedIncident } from "@/lib/domain/types";
import { isTimestampInWindow } from "@/lib/ingestion/build-events";

export const STATUS_COPY: Record<ExposureStatus, string> = {
  confirmed_execution: "Build used this lockfile during the incident window.",
  current_resolution_only:
    "Affected version is resolved now; observed builds are outside the window.",
  historical_status_unknown:
    "Affected version is resolved now; no matching build record was supplied.",
  safe: "HydraDB found no path to an affected version.",
};

export function classifyExposure(input: {
  hasAffectedPath: boolean;
  lockfileDigest: string;
  builds: BuildEvidence[];
  incident: NormalizedIncident;
}): { status: ExposureStatus; reason: string; builds: BuildEvidence[] } {
  const builds = input.builds.map((build) => ({
    ...build,
    inWindow: isTimestampInWindow(
      build.timestampMs,
      input.incident.windowStartMs,
      input.incident.windowEndMs,
    ),
  }));
  if (!input.hasAffectedPath)
    return {
      status: "safe",
      reason: STATUS_COPY.safe,
      builds,
    };
  const relevant = builds.filter((build) => build.lockfileDigest === input.lockfileDigest);
  if (relevant.some((build) => build.inWindow))
    return {
      status: "confirmed_execution",
      reason: STATUS_COPY.confirmed_execution,
      builds,
    };
  if (relevant.length > 0)
    return {
      status: "current_resolution_only",
      reason: STATUS_COPY.current_resolution_only,
      builds,
    };
  return {
    status: "historical_status_unknown",
    reason: STATUS_COPY.historical_status_unknown,
    builds,
  };
}
