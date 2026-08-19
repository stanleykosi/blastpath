import { getServerEnv } from "@/lib/config/env";
import { HydradbClient, MAX_HYDRADB_RESPONSE_BYTES } from "@/lib/hydradb/client";

describe("HydraDB HTTP response bounds", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects a response that exceeds the fixed byte limit before JSON decoding", async () => {
    const response = new Response(new Uint8Array(MAX_HYDRADB_RESPONSE_BYTES + 1), {
      status: 200,
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
    const client = new HydradbClient(
      getServerEnv({ HYDRADB_TOKEN: "local-token-that-is-long-enough" }),
    );

    await expect(client.query("test", "RETURN 1", {})).rejects.toMatchObject({
      code: "HYDRADB_PROTOCOL_ERROR",
      status: 502,
      message: "HydraDB returned an oversized response.",
    });
  });
});
