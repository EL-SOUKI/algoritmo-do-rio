import type { MaterialType } from "../generated/prisma/enums.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middlewares/error-handler.js";

type CreateCampaignInput = {
  name: string;
  materialType: MaterialType;
  rewardRecPerKg: number;
  startsAt: Date;
  endsAt: Date;
};

export const campaignsService = {
  async create(input: CreateCampaignInput) {
    return prisma.campaign.create({
      data: input,
    });
  },

  async list() {
    return prisma.campaign.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  async getById(id: string) {
    const campaign =
      await prisma.campaign.findUnique({
        where: { id },
      });

    if (!campaign) {
      throw new AppError(
        404,
        "Campaign not found.",
      );
    }

    return campaign;
  },
};
