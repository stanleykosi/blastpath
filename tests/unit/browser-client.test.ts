import { fetchData } from "@/lib/api/browser-client";
import { replayResponseSchema, serviceDetailSchema } from "@/lib/api/contracts";

describe("browser API response boundary", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("rejects malformed successful service detail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          data: { paths: "not-an-array" },
          meta: { requestId: "detail-invalid" },
        }),
      ),
    );

    await expect(fetchData("/detail", serviceDetailSchema)).rejects.toEqual({
      code: "INTERNAL_ERROR",
      message: "The server returned an invalid response. Retry the request.",
    });
  });

  it("rejects malformed successful replay data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          data: { removedServiceIds: "not-an-array" },
          meta: { requestId: "replay-invalid" },
        }),
      ),
    );

    await expect(fetchData("/replay", replayResponseSchema)).rejects.toEqual({
      code: "INTERNAL_ERROR",
      message: "The server returned an invalid response. Retry the request.",
    });
  });

  it("keeps a validated server failure safe", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json(
          {
            error: {
              code: "HYDRADB_UNAVAILABLE",
              message: "HydraDB is not available.",
              requestId: "detail-error",
              retryable: true,
            },
          },
          { status: 503 },
        ),
      ),
    );

    await expect(fetchData("/detail", serviceDetailSchema)).rejects.toEqual({
      code: "HYDRADB_UNAVAILABLE",
      message: "HydraDB is not available.",
      requestId: "detail-error",
      retryable: true,
    });
  });
});
