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
  });
});
