import { parseLockfileV3, resolveDependencyPath } from "@/lib/ingestion/lockfile-v3";

describe("npm lockfile v3 resolution", () => {
  it("resolves root, nested, and nearest hoisted dependencies", () => {
    const parsed = parseLockfileV3(
      {
        name: "root",
        version: "1.0.0",
        lockfileVersion: 3,
        packages: {
          "": { name: "root", version: "1.0.0", dependencies: { a: "1.0.0" } },
          "node_modules/a": {
            name: "a",
            version: "1.0.0",
            dependencies: { b: "1.0.0", c: "1.0.0" },
          },
          "node_modules/a/node_modules/b": { name: "b", version: "1.0.0" },
          "node_modules/c": { name: "c", version: "1.0.0" },
        },
      },
      "inline.json",
    );
    expect(resolveDependencyPath("", "a", parsed.packages)).toBe("node_modules/a");
    expect(resolveDependencyPath("node_modules/a", "b", parsed.packages)).toBe(
      "node_modules/a/node_modules/b",
    );
    expect(resolveDependencyPath("node_modules/a", "c", parsed.packages)).toBe("node_modules/c");
  });

  it("rejects a non-v3 lockfile and malformed package entries", () => {
    expect(() => parseLockfileV3({ lockfileVersion: 2, packages: {} }, "bad.json")).toThrow(
      /INVALID_FIXTURE/,
    );
    expect(() =>
      parseLockfileV3(
        {
          name: "root",
          version: "1.0.0",
          lockfileVersion: 3,
          packages: { "": { name: "root", version: "1" }, "node_modules/a": { version: "1.0.0" } },
        },
        "bad.json",
      ),
    ).toThrow(/name\/version/);
  });
});
