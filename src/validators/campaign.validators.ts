import { z } from "zod";
import { MaterialType } from "../generated/prisma/enums.js";

export const createCampaignSchema = z
  .object({
    name: z.string().trim().min(2).max(160),
    materialType: z.enum(MaterialType),
    rewardRecPerKg: z.number().int().positive().max(1_000_000),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
  })
  .refine(
    (data) => data.endsAt > data.startsAt,
    {
      message: "endsAt must be after startsAt.",
      path: ["endsAt"],
    },
  );
