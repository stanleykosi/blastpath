import { lockfileFixtureSchema } from "@/lib/domain/schemas";

export type LockfilePackage = {
  path: string;
  name: string;
  version: string;
  dependencies: string[];
};

export type ParsedLockfile = {
  lockfileVersion: 3;
  packages: Map<string, LockfilePackage>;
  rootDependencies: string[];
};

function dependencyNames(entry: {
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}): string[] {
  return [
    ...new Set([
      ...Object.keys(entry.dependencies ?? {}),
      ...Object.keys(entry.optionalDependencies ?? {}),
    ]),
  ].sort();
}

export function parseLockfileV3(input: unknown, sourceName: string): ParsedLockfile {
  const parsed = lockfileFixtureSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(
      `INVALID_FIXTURE ${sourceName}: ${parsed.error.issues[0]?.path.join(".") ?? "root"}`,
    );
  }
  const packages = new Map<string, LockfilePackage>();
  for (const [packagePath, entry] of Object.entries(parsed.data.packages)) {
    if (packagePath === "") continue;
    if (entry.link) continue;
    if (!entry.name || !entry.version)
      throw new Error(`INVALID_FIXTURE ${sourceName}: packages.${packagePath}.name/version`);
    if (!packagePath.startsWith("node_modules/"))
      throw new Error(`INVALID_FIXTURE ${sourceName}: packages.${packagePath}`);
    packages.set(packagePath, {
      path: packagePath,
      name: entry.name,
      version: entry.version,
      dependencies: dependencyNames(entry),
    });
  }
  const root = parsed.data.packages[""];
  if (!root) throw new Error(`INVALID_FIXTURE ${sourceName}: packages`);
  return { lockfileVersion: 3, packages, rootDependencies: dependencyNames(root) };
}

function parentPackagePath(packagePath: string): string {
  const marker = packagePath.lastIndexOf("/node_modules/");
  return marker >= 0 ? packagePath.slice(0, marker) : "";
}

export function resolveDependencyPath(
  packagePath: string,
  dependencyName: string,
  packages: Map<string, LockfilePackage>,
): string | undefined {
  let cursor = packagePath;
  while (true) {
    const candidate = cursor
      ? `${cursor}/node_modules/${dependencyName}`
      : `node_modules/${dependencyName}`;
    if (packages.has(candidate)) return candidate;
    if (!cursor) return undefined;
    cursor = parentPackagePath(cursor);
  }
}

export function resolvePackageNamePath(packageName: string): string {
  return `node_modules/${packageName}`;
}
