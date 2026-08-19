import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import packageJson from "@/package.json";

describe("full verification command", () => {
  it("runs the integration-skip guard before all checks", () => {
    expect(packageJson.scripts.verify.startsWith("npm run verify:environment &&")).toBe(true);
  });

  it("ends with a second seed and the integration golden run", () => {
    expect(packageJson.scripts["verify:final"]).toBe("npm run seed && npm run test:integration");
    expect(packageJson.scripts.verify.endsWith("&& npm run verify:final")).toBe(true);
  });

  it("fails when HydraDB integration tests are disabled", () => {
    const result = spawnSync(process.execPath, ["scripts/verify-environment.mjs"], {
      cwd: process.cwd(),
      env: { ...process.env, SKIP_HYDRADB_INTEGRATION: "true" },
      encoding: "utf8",
    });

    expect(result.status).toBe(1);
    expect(readFileSync("scripts/verify-environment.mjs", "utf8")).toContain(
      "would skip required HydraDB tests",
    );
  });
});
