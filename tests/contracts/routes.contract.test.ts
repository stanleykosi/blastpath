import { vi } from "vitest";

const runSeedMock = vi.hoisted(() => vi.fn());
const repositoryMockState = vi.hoisted(() => ({ throwOnConstruct: false }));

vi.mock("@/lib/hydradb/repository", () => ({
  HydraRepository: class {
    constructor() {
      if (repositoryMockState.throwOnConstruct)
        throw new Error("Invalid server environment: HYDRADB_TOKEN");
    }

    async ready(): Promise<boolean> {
      return true;
    }

    async seedMarker(): Promise<{ seeded: boolean; version: string }> {
      return { seeded: false, version: "blastpath-demo-v1" };
    }
  },
}));
vi.mock("@/lib/ingestion/seed", () => ({ runSeed: runSeedMock }));

import { GET as healthGet } from "@/app/api/health/route";
import { GET as incidentGet } from "@/app/api/incidents/[incidentId]/route";
import { POST as replayPost } from "@/app/api/incidents/[incidentId]/replay/route";
import { POST as seedPost } from "@/app/api/seed/route";
import { InvalidFixtureError } from "@/lib/ingestion/errors";
import { MAX_JSON_BODY_BYTES, responseError } from "@/lib/api/errors";

const seedSummary = {
  seedVersion: "blastpath-demo-v1",
  fixtureRoot: "/fixtures",
  lockfiles: 3,
  nodesByLabel: {},
  edgesByType: {},
  affectedVersions: ["1"],
  durationMs: 1,
  verified: true,
};

function malformedJsonRequest(url: string): Request {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: '{"broken":',
  });
}

function validSeedRequest(): Request {
  return new Request("http://localhost/api/seed", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ confirm: "seed-demo-fixtures" }),
  });
}

describe("route error contracts", () => {
  const token = process.env.HYDRADB_TOKEN;
  const seedRoute = process.env.ENABLE_SEED_ROUTE;

  beforeEach(() => {
    process.env.HYDRADB_TOKEN = "local-token-that-is-long-enough";
    process.env.ENABLE_SEED_ROUTE = "true";
    repositoryMockState.throwOnConstruct = false;
    runSeedMock.mockResolvedValue(seedSummary);
  });

  afterAll(() => {
    if (token === undefined) delete process.env.HYDRADB_TOKEN;
    else process.env.HYDRADB_TOKEN = token;
    if (seedRoute === undefined) delete process.env.ENABLE_SEED_ROUTE;
    else process.env.ENABLE_SEED_ROUTE = seedRoute;
  });

  it("returns INVALID_REQUEST for malformed replay JSON", async () => {
    const response = await replayPost(malformedJsonRequest("http://localhost/api/replay"), {
      params: Promise.resolve({ incidentId: "GHSA-g7cv-rxg3-hmpx" }),
    });

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("INVALID_REQUEST");
  });

  it("rejects an oversized replay body before JSON parsing", async () => {
    const response = await replayPost(
      new Request("http://localhost/api/incidents/GHSA-g7cv-rxg3-hmpx/replay", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ label: "x".repeat(MAX_JSON_BODY_BYTES) }),
      }),
      { params: Promise.resolve({ incidentId: "GHSA-g7cv-rxg3-hmpx" }) },
    );

    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatchObject({
      code: "INVALID_REQUEST",
      message: `The request body must not exceed ${MAX_JSON_BODY_BYTES} bytes.`,
    });
  });

  it("rejects a POST origin with the same host and a different scheme", async () => {
    const response = await replayPost(
      new Request("http://localhost:8443/api/incidents/GHSA-g7cv-rxg3-hmpx/replay", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://localhost:8443",
        },
        body: JSON.stringify({
          action: "exclude_dependency_edge",
          edgeIds: ["1"],
          label: "test",
        }),
      }),
      { params: Promise.resolve({ incidentId: "GHSA-g7cv-rxg3-hmpx" }) },
    );

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("INVALID_REQUEST");
  });

  it("returns INVALID_REQUEST for malformed seed JSON", async () => {
    const response = await seedPost(malformedJsonRequest("http://localhost/api/seed"));

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("INVALID_REQUEST");
  });

  it("returns 503 when the seed marker is absent", async () => {
    const response = await healthGet();

    expect(response.status).toBe(503);
    expect((await response.json()).error.code).toBe("HYDRADB_UNAVAILABLE");
  });

  it("keeps health configuration failures in the JSON error envelope", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    repositoryMockState.throwOnConstruct = true;

    const response = await healthGet();

    expect(response.status).toBe(500);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.json()).toMatchObject({
      error: {
        code: "INTERNAL_ERROR",
        message: "The request could not be completed.",
      },
    });
    log.mockRestore();
  });

  it("rejects an invalid incident ID before a repository query", async () => {
    const response = await incidentGet(new Request("http://localhost/api/incidents/foo"), {
      params: Promise.resolve({ incidentId: "foo" }),
    });

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("INVALID_REQUEST");
  });

  it("maps fixture ingestion failures to INVALID_FIXTURE", async () => {
    runSeedMock.mockRejectedValueOnce(
      new InvalidFixtureError(new Error("INVALID_FIXTURE lockfile digest mismatch")),
    );

    const response = await seedPost(validSeedRequest());

    expect(response.status).toBe(422);
    expect((await response.json()).error.code).toBe("INVALID_FIXTURE");
  });

  it("claims the seed lock before a second valid request can start", async () => {
    let finishSeed: ((value: typeof seedSummary) => void) | undefined;
    runSeedMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishSeed = resolve;
        }),
    );

    const firstResponse = seedPost(validSeedRequest());
    await vi.waitFor(() => expect(runSeedMock).toHaveBeenCalledTimes(1));
    const secondResponse = await seedPost(validSeedRequest());

    expect(secondResponse.status).toBe(409);
    expect((await secondResponse.json()).error.code).toBe("SEED_IN_PROGRESS");
    finishSeed?.(seedSummary);
    expect((await firstResponse).status).toBe(200);
  });

  it("logs a redacted unexpected error with its request ID", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = responseError(
      {
        message: "database failed token=visible-secret",
        authorization: "Bearer visible-secret",
        nested: { password: "visible-secret" },
      },
      "bp-log-contract",
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "The request could not be completed.",
        requestId: "bp-log-contract",
        retryable: false,
      },
    });
    expect(log).toHaveBeenCalledOnce();
    const diagnostic = String(log.mock.calls[0]?.[0]);
    expect(diagnostic).toContain('"event":"unexpected_api_error"');
    expect(diagnostic).toContain('"requestId":"bp-log-contract"');
    expect(diagnostic).toContain("[REDACTED]");
    expect(diagnostic).not.toContain("visible-secret");
    log.mockRestore();
  });
});
