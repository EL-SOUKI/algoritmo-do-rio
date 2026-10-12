import { z } from "zod";

export const burnCertificateSchema = z.object({
  campaignId: z.string().uuid(),
  recAmount: z.number().int().positive(),
});

export const listCertificatesQuerySchema = z.object({
  companyWallet: z.string().min(32).optional(),
});
