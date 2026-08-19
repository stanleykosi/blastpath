import { getServerEnv } from "@/lib/config/env";

const valid = { HYDRADB_TOKEN: "local-token-that-is-long-enough" };

describe("environment boundary", () => {
  it("uses safe local defaults", () => {
    const env = getServerEnv(valid);
    expect(env.hydradbHttpUrl).toBe("http://127.0.0.1:8443");
    expect(env.HYDRADB_TOKEN).toBe(valid.HYDRADB_TOKEN);
  });
  it("rejects missing, short, and unsafe values", () => {
    expect(() => getServerEnv({})).toThrow(/HYDRADB_TOKEN/);
    expect(() => getServerEnv({ HYDRADB_TOKEN: "short" })).toThrow(/HYDRADB_TOKEN/);
    expect(() => getServerEnv({ ...valid, HYDRADB_HTTP_URL: "http://public.example" })).toThrow(
      /HYDRADB_HTTP_URL/,
    );
    expect(() => getServerEnv({ ...valid, HYDRADB_HTTP_URL: "ftp://127.0.0.1:8443" })).toThrow(
      /HYDRADB_HTTP_URL/,
    );
    expect(() => getServerEnv({ ...valid, HYDRADB_HTTP_URL: "http://fca.example:8443" })).toThrow(
      /HYDRADB_HTTP_URL/,
    );
  });

  it.each([
    "http://10.0.0.8:8443",
    "http://172.16.2.5:8443",
    "http://172.31.255.254:8443",
    "http://192.168.1.10:8443",
    "http://[::1]:8443",
    "http://[fd00::10]:8443",
  ])("accepts a private or loopback HydraDB URL: %s", (url) => {
    expect(getServerEnv({ ...valid, HYDRADB_HTTP_URL: url }).hydradbHttpUrl).toBe(url);
  });
});
