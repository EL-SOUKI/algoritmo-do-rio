import { z } from "zod";
import { MaterialType } from "../generated/prisma/enums.js";

export const createRecyclingEventSchema = z.object({
  recyclerId: z.string().uuid(),
  collectionPointId: z.string().uuid(),
  campaignId: z.string().uuid(),
  materialType: z.enum(MaterialType),
  weightGrams: z.number().int().positive().max(500_000),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const verifyRecyclingEventSchema = z.object({
  operatorId: z.string().uuid(),
});

export const rejectRecyclingEventSchema = z.object({
  operatorId: z.string().uuid(),
  reason: z.string().trim().min(3).max(500),
});
