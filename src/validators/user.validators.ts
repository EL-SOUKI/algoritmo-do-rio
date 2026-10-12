import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  walletAddress: z.string().trim().min(32).max(64).optional(),
  role: z.enum(["USER", "OPERATOR"]).default("USER"),
});
