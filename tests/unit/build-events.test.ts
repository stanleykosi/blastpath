import { parseBuildEvents } from "@/lib/ingestion/build-events";

describe("build event identities", () => {
  it("rejects duplicate repository and build ID identities", () => {
    const first = {
      buildId: "build-1",
      repositorySlug: "checkout-service",
      commitSha: "1".repeat(40),
      timestamp: "2026-05-11T19:23:00Z",
      environment: "production",
      lockfileSha256: "a".repeat(64),
    };

    expect(() =>
      parseBuildEvents({
        schemaVersion: 1,
        synthetic: true,
        events: [
          first,
          {
            ...first,
            timestamp: "2026-05-11T18:45:00Z",
            lockfileSha256: "b".repeat(64),
          },
        ],
      }),
    ).toThrow(/duplicate identity/);
  });
});
