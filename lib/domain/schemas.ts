import { z } from "zod";

export const idSchema = z.string().regex(/^[1-9]\d*$/, "ID must be a positive decimal string");
export const nodeLabelSchema = z.enum([
  "Organization",
  "Service",
  "Repository",
  "Lockfile",
  "Build",
  "Package",
  "PackageVersion",
  "Advisory",
  "SeedRun",
]);
export const relationshipTypeSchema = z.enum([
  "OWNS",
  "PRODUCES",
  "HAS_LOCKFILE",
  "DEPENDS_ON",
  "RESOLVES",
  "USES",
  "HAS_BUILD",
  "VERSION_OF",
  "AFFECTS",
  "SEEDED",
]);

const isoUtcSchema = z.string().refine((value) => {
  const parsed = new Date(value);
  return !Number.isNaN(parsed.valueOf()) && value.endsWith("Z");
}, "Timestamp must be UTC ISO 8601");

export const graphNodeSchema = z.object({
  id: idSchema,
  label: nodeLabelSchema,
  key: z.string().min(1).max(512),
  properties: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
});

export const graphEdgeSchema = z.object({
  id: idSchema,
  type: relationshipTypeSchema,
  key: z.string().min(1).max(1024),
  source: idSchema,
  target: idSchema,
  sourceRef: z.string().min(1).max(512),
  properties: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
});

export const incidentFixtureSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(/^GHSA-[a-z0-9-]+$/),
  sourceUrl: z
    .string()
    .url()
    .refine((value) => value.startsWith("https://")),
  sourceApiUrl: z
    .string()
    .url()
    .refine((value) => value.startsWith("https://")),
  summary: z.string().min(1).max(240),
  severity: z.literal("critical"),
  windowStart: isoUtcSchema,
  windowEnd: isoUtcSchema,
  scopeNotice: z.string().min(1).max(500),
  affected: z
    .array(
      z.object({
        ecosystem: z.literal("npm"),
        name: z.string().regex(/^(@[a-z0-9_.-]+\/)?[a-z0-9_.-]+$/),
        version: z.string().regex(/^\d+\.\d+\.\d+$/),
        fixedVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
      }),
    )
    .min(1)
    .max(100),
});

export const organizationFixtureSchema = z.object({
  schemaVersion: z.literal(1),
  organization: z.object({
    slug: z.string().regex(/^[a-z0-9-]{1,64}$/),
    name: z.string().min(1).max(120),
    synthetic: z.literal(true),
  }),
  repositories: z
    .array(
      z.object({
        slug: z.string().regex(/^[a-z0-9-]{1,64}$/),
        name: z.string().min(1).max(120),
        url: z
          .string()
          .url()
          .refine((value) => value.startsWith("https://")),
        service: z.object({
          slug: z.string().regex(/^[a-z0-9-]{1,64}$/),
          name: z.string().min(1).max(120),
          owner: z.string().min(1).max(120),
          criticality: z.enum(["critical", "high", "medium"]),
        }),
        lockfilePath: z.string().min(1).max(256),
        expectedLockfileSha256: z.string().regex(/^[a-f0-9]{64}$/),
      }),
    )
    .length(3),
});

export const buildEventsFixtureSchema = z.object({
  schemaVersion: z.literal(1),
  synthetic: z.literal(true),
  events: z
    .array(
      z.object({
        buildId: z.string().regex(/^[a-z0-9-]{1,80}$/),
        repositorySlug: z.string().regex(/^[a-z0-9-]{1,64}$/),
        commitSha: z.string().regex(/^[a-f0-9]{40}$/),
        timestamp: isoUtcSchema,
        environment: z.string().regex(/^[a-z0-9-]{1,32}$/),
        lockfileSha256: z.string().regex(/^[a-f0-9]{64}$/),
      }),
    )
    .max(100),
});

export const lockfileFixtureSchema = z.object({
  name: z.string().min(1).max(120),
  version: z.string().min(1).max(32),
  lockfileVersion: z.literal(3),
  requires: z.boolean().optional(),
  packages: z.record(
    z.string().max(512),
    z.object({
      name: z.string().optional(),
      version: z.string().optional(),
      link: z.boolean().optional(),
      resolved: z.string().optional(),
      dependencies: z.record(z.string().max(256), z.string().max(256)).optional(),
      optionalDependencies: z.record(z.string().max(256), z.string().max(256)).optional(),
      peerDependencies: z.record(z.string().max(256), z.string().max(256)).optional(),
    }),
  ),
});

export const queryEvidenceSchema = z.object({
  engine: z.literal("HydraDB"),
  procedure: z.enum(["algo.SSpaths", "algo.SPpaths"]),
  templateId: z.enum(["blast-radius-v1", "exact-path-v1"]),
  query: z.string().min(1).max(4000),
  parameters: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  consistency: z.enum(["causal", "strong"]),
  maxDepth: z.literal(8),
  elapsedMs: z.number().int().nonnegative(),
  resultCount: z.number().int().nonnegative(),
  queryIds: z.array(z.string().min(1)).max(100),
});

export const pathNodeSchema = z.object({
  id: idSchema,
  label: nodeLabelSchema,
  key: z.string(),
  name: z.string(),
  version: z.string().optional(),
  sourceRef: z.string().optional(),
});

export const evidencePathSchema = z.object({
  id: z.string().regex(/^[a-f0-9]{16}$/),
  length: z.number().int().min(1).max(8),
  nodes: z.array(pathNodeSchema).min(2).max(9),
  edges: z
    .array(
      z.object({
        id: idSchema,
        type: relationshipTypeSchema,
        source: idSchema,
        target: idSchema,
        sourceRef: z.string(),
      }),
    )
    .min(1)
    .max(8),
});

export const replayRequestSchema = z.object({
  action: z.literal("exclude_dependency_edge"),
  edgeIds: z
    .array(idSchema)
    .min(1)
    .max(10)
    .refine((ids) => new Set(ids).size === ids.length),
  label: z.string().trim().min(1).max(120),
});

export const seedRequestSchema = z.object({ confirm: z.literal("seed-demo-fixtures") });

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string(),
    retryable: z.boolean(),
  }),
});

export const apiSuccessSchema = <T extends z.ZodType>(data: T) =>
  z.object({ data, meta: z.object({ requestId: z.string().min(1) }) });
