import { z } from "zod";
import {
  apiErrorSchema,
  apiSuccessSchema,
  evidencePathSchema,
  idSchema,
  queryEvidenceSchema,
  replayRequestSchema,
  seedRequestSchema,
} from "@/lib/domain/schemas";

export { apiErrorSchema, apiSuccessSchema, replayRequestSchema, seedRequestSchema };

export const incidentOverviewSchema = z.object({
  incident: z.object({
    id: idSchema,
    osvId: z.string(),
    summary: z.string(),
    severity: z.literal("critical"),
    windowStart: z.string(),
    windowEnd: z.string(),
    sourceUrl: z.string().url(),
  }),
  metrics: z.object({
    totalServices: z.literal(3),
    impactedServices: z.literal(2),
    confirmedExecution: z.literal(1),
    safeServices: z.literal(1),
    exposurePaths: z.literal(2),
  }),
  services: z.array(
    z.object({
      id: idSchema,
      name: z.string(),
      owner: z.string(),
      criticality: z.enum(["critical", "high", "medium"]),
      status: z.enum([
        "confirmed_execution",
        "current_resolution_only",
        "historical_status_unknown",
        "safe",
      ]),
      reason: z.string(),
      shortestPathLength: z.number().int().nullable(),
      pathCount: z.number().int().nonnegative(),
      chokepoints: z.array(z.string()),
    }),
  ),
  chokepoints: z.array(
    z.object({
      packageVersionId: idSchema,
      name: z.string(),
      version: z.string(),
      pathCount: z.number().int().nonnegative(),
      serviceCount: z.number().int().nonnegative(),
      recommendation: z.string(),
      edgeId: idSchema.optional(),
    }),
  ),
  query: queryEvidenceSchema,
});

export const serviceDetailSchema = z.object({
  service: incidentOverviewSchema.shape.services.element,
  paths: z.array(evidencePathSchema),
  buildEvidence: z.array(
    z.object({
      buildId: z.string(),
      timestamp: z.string(),
      environment: z.string(),
      lockfileDigest: z.string(),
      inWindow: z.boolean(),
    }),
  ),
  query: queryEvidenceSchema,
});

export const replayResponseSchema = z.object({
  baseline: z.object({ impactedServices: z.number(), exposurePaths: z.number() }),
  simulated: z.object({ impactedServices: z.number(), exposurePaths: z.number() }),
  removedServiceIds: z.array(idSchema),
  removedPathIds: z.array(z.string()),
  remainingServiceIds: z.array(idSchema),
  action: z.string(),
  disclaimer: z.string(),
});

export const incidentsSchema = z.array(
  z.object({
    id: idSchema,
    osvId: z.string(),
    summary: z.string(),
    severity: z.literal("critical"),
    windowStart: z.string(),
    windowEnd: z.string(),
    sourceUrl: z.string().url(),
  }),
);

export const healthSchema = z.object({
  status: z.literal("ok"),
  app: z.literal("ok"),
  hydradb: z.literal("ok"),
  graphSeeded: z.boolean(),
  seedVersion: z.string(),
});

export const errorEnvelopeSchema = apiErrorSchema;
