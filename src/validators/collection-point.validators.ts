import { z } from "zod";
import { MaterialType } from "../generated/prisma/enums.js";

export const createCollectionPointSchema = z.object({
  name: z.string().trim().min(2).max(160),
  address: z.string().trim().min(5).max(300),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  supportedMaterials: z.array(z.enum(MaterialType)).min(1),
});

export const nearbyPointsQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().positive().max(100).default(20),
});

export const assignOperatorSchema = z.object({
  operatorId: z.string().uuid(),
});
