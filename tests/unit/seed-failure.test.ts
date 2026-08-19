import { HydradbBatchError, HydradbError } from "@/lib/api/errors";
import { seedFailureRecord } from "@/lib/ingestion/seed-failure";

describe("seed failure diagnostics", () => {
  it("includes safe node batch, request, status, and query details", () => {
    const error = new HydradbBatchError(
      "node",
      "PackageVersion",
      2,
      new HydradbError("HYDRADB_TIMEOUT", "HydraDB timed out.", {
        queryId: "hydra-query-42",
      }),
    );

    expect(seedFailureRecord(error)).toEqual({
      error: {
        code: "HYDRADB_TIMEOUT",
        message: "HydraDB node PackageVersion batch 2 failed.",
        status: 504,
        queryId: "hydra-query-42",
        batchIndex: 2,
        label: "PackageVersion",
      },
    });
  });

  it("uses the relationship type for relationship batch failures", () => {
    const error = new HydradbBatchError(
      "relationship",
      "DEPENDS_ON",
      1,
      new HydradbError("HYDRADB_UNAVAILABLE", "HydraDB is unavailable.", {
        queryId: "hydra-query-43",
      }),
    );

    expect(seedFailureRecord(error).error).toMatchObject({
      code: "HYDRADB_UNAVAILABLE",
      status: 503,
      queryId: "hydra-query-43",
      batchIndex: 1,
      type: "DEPENDS_ON",
    });
  });
});
