import { classifyExposure } from "@/lib/domain/classify-exposure";
import type { BuildEvidence, NormalizedIncident } from "@/lib/domain/types";

const incident: NormalizedIncident = {
  id: "1",
  key: "advisory:demo",
  osvId: "GHSA-demo",
  summary: "demo",
  severity: "critical",
  windowStart: "2026-05-11T19:20:00Z",
  windowStartMs: Date.parse("2026-05-11T19:20:00Z"),
  windowEnd: "2026-05-11T19:26:00Z",
  windowEndMs: Date.parse("2026-05-11T19:26:00Z"),
  sourceUrl: "https://osv.dev/vulnerability/GHSA-demo",
  affected: [
    {
      ecosystem: "npm",
      name: "@tanstack/router-core",
      version: "1.169.5",
      fixedVersion: "1.169.9",
    },
  ],
};
const build = (timestamp: string, digest = "digest"): BuildEvidence => ({
  buildId: timestamp,
  timestamp,
  timestampMs: Date.parse(timestamp),
  environment: "production",
  lockfileDigest: digest,
  inWindow: false,
});

describe("exposure classification", () => {
  it.each([
    [false, [], "safe"],
    [true, [build("2026-05-11T19:23:00Z")], "confirmed_execution"],
    [true, [build("2026-05-11T18:45:00Z")], "current_resolution_only"],
    [true, [], "historical_status_unknown"],
  ] satisfies Array<[boolean, BuildEvidence[], string]>)(
    "returns %s",
    (hasPath, builds, expected) => {
      expect(
        classifyExposure({ hasAffectedPath: hasPath, lockfileDigest: "digest", builds, incident })
          .status,
      ).toBe(expected);
    },
  );

  it("uses the inclusive window boundary", () => {
    expect(
      classifyExposure({
        hasAffectedPath: true,
        lockfileDigest: "digest",
        builds: [build("2026-05-11T19:26:00Z")],
        incident,
      }).status,
    ).toBe("confirmed_execution");
  });

  it("preserves incident-window membership for a safe service timeline", () => {
    const result = classifyExposure({
      hasAffectedPath: false,
      lockfileDigest: "digest",
      builds: [build("2026-05-11T19:24:00Z")],
      incident,
    });

    expect(result.status).toBe("safe");
    expect(result.builds[0]?.inWindow).toBe(true);
  });
});
