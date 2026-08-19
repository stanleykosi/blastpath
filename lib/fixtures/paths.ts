import path from "node:path";

export const SEED_VERSION = "blastpath-demo-v1";
export const DEFAULT_FIXTURE_ROOT = path.resolve(process.cwd(), "fixtures");
export const FIXTURE_FILES = {
  organization: "organizations/blastpath-demo-organization.json",
  incident: "incidents/tanstack-ghsa-g7cv-rxg3-hmpx.json",
  builds: "build-events/demo-build-events.json",
  golden: "expected/golden-cases.json",
} as const;

export const REQUIRED_LOCKFILE_SLUGS = [
  "checkout-service",
  "admin-console",
  "analytics-worker",
] as const;
