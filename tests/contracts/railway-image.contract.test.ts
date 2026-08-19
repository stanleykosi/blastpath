import { readFile } from "node:fs/promises";
import path from "node:path";

describe("Railway HydraDB image", () => {
  it("passes the pinned image command to the token-file wrapper", async () => {
    const dockerfile = await readFile(
      path.resolve(process.cwd(), "deploy/railway/Dockerfile"),
      "utf8",
    );

    expect(dockerfile).toContain("FROM ghcr.io/hydra-db/hydradb:0.1.1");
    expect(dockerfile).toContain('ENTRYPOINT ["/usr/local/bin/blastpath-hydradb-entrypoint"]');
    expect(dockerfile).toContain('CMD ["graph-node"]');

    const config = await readFile(path.resolve(process.cwd(), "railway.json"), "utf8");
    expect(config).not.toContain("healthcheckPath");

    const compose = await readFile(path.resolve(process.cwd(), "docker-compose.yml"), "utf8");
    expect(compose).toContain('GRAPH_ALLOW_PLAINTEXT: "true"');
    expect(compose).toContain("LOCAL_PATH: /data/store");
    expect(compose).not.toContain("ENABLE_PLAINTEXT");
  });

  it("uses one public gateway for both private HydraDB HTTP ports", async () => {
    const caddyfile = await readFile(
      path.resolve(process.cwd(), "deploy/railway/gateway/Caddyfile"),
      "utf8",
    );
    const config = await readFile(path.resolve(process.cwd(), "railway.gateway.json"), "utf8");

    expect(caddyfile).toContain("hydradb.railway.internal:8443");
    expect(caddyfile).toContain("hydradb.railway.internal:9090");
    expect(caddyfile).not.toContain(":7687");
    expect(config).toContain('"healthcheckPath": "/readyz"');
  });

  it("runs an idempotent seed as a private one-shot service", async () => {
    const dockerfile = await readFile(
      path.resolve(process.cwd(), "deploy/railway/seeder/Dockerfile"),
      "utf8",
    );
    const runner = await readFile(
      path.resolve(process.cwd(), "deploy/railway/seeder/run.sh"),
      "utf8",
    );

    expect(dockerfile).toContain("RUN npm ci");
    expect(runner).toContain("npm run seed -- --fixtures ./fixtures");
    expect(runner).toContain("SEED_MAX_ATTEMPTS");
  });
});
