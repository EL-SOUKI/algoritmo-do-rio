import type { MaterialType } from "../generated/prisma/enums.js";
import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middlewares/error-handler.js";
import { blockchainGateway } from "./blockchain.service.js";
import { createProofHash, createPublicRecyclingId } from "../utils/proof.js";

type CreateEventInput = {
  recyclerId: string;
  collectionPointId: string;
  campaignId: string;
  materialType: MaterialType;
  weightGrams: number;
  metadata?: Record<string, unknown>;
};


const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  walletAddress: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

function calculateCampaignReward(
  weightGrams: number,
  rewardRecPerKg: number,
): number {
  const reward = Math.floor(
    (weightGrams * rewardRecPerKg + 500) / 1000,
  );

  return Math.max(reward, 1);
}

function assertCampaignAvailable(
  campaign: {
    active: boolean;
    materialType: MaterialType;
    startsAt: Date;
    endsAt: Date;
  },
  materialType: MaterialType,
) {
  if (!campaign.active) {
    throw new AppError(409, "Campaign is inactive.");
  }

  if (campaign.materialType !== materialType) {
    throw new AppError(
      409,
      "Campaign material does not match the recycling material.",
    );
  }

  const now = new Date();

  if (now < campaign.startsAt || now > campaign.endsAt) {
    throw new AppError(
      409,
      "Campaign is outside its active time window.",
    );
  }
}

async function assertAuthorizedOperator(operatorId: string, collectionPointId: string) {
  const assignment = await prisma.operatorAssignment.findUnique({
    where: {
      operatorId_collectionPointId: {
        operatorId,
        collectionPointId,
      },
    },
  });

  if (!assignment) {
    throw new AppError(403, "Operator is not assigned to this collection point.");
  }
}

export const recyclingService = {
  async create(input: CreateEventInput) {
    const [recycler, point, campaign] = await Promise.all([
      prisma.user.findUnique({ where: { id: input.recyclerId } }),
      prisma.collectionPoint.findUnique({ where: { id: input.collectionPointId } }),
      prisma.campaign.findUnique({ where: { id: input.campaignId } }),
    ]);

    if (!recycler) throw new AppError(404, "Recycler not found.");
    if (!point) throw new AppError(404, "Collection point not found.");
    if (!campaign) throw new AppError(404, "Campaign not found.");
    if (point.status !== "ACTIVE") throw new AppError(409, "Collection point is inactive.");
    if (!point.supportedMaterials.includes(input.materialType)) {
      throw new AppError(400, "This collection point does not accept the selected material.");
    }

    assertCampaignAvailable(
      campaign,
      input.materialType,
    );

    return prisma.recyclingEvent.create({
      data: {
        publicId: createPublicRecyclingId(),
        recyclerId: input.recyclerId,
        collectionPointId: input.collectionPointId,
        campaignId: input.campaignId,
        materialType: input.materialType,
        weightGrams: input.weightGrams,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
      },
      include: {
        recycler: {
          select: publicUserSelect,
        },
        collectionPoint: true,
      },
    });
  },

  async getById(id: string) {
    const event = await prisma.recyclingEvent.findUnique({
      where: { id },
      include: {
        recycler: {
          select: publicUserSelect,
        },
        collectionPoint: true,
        operator: {
          select: publicUserSelect,
        },
      },
    });
    if (!event) throw new AppError(404, "Recycling event not found.");
    return event;
  },

  async listPendingForOperator(operatorId: string) {
    const operator = await prisma.user.findUnique({
      where: { id: operatorId },
    });

    if (!operator) {
      throw new AppError(404, "Operator not found.");
    }

    if (operator.role !== "OPERATOR") {
      throw new AppError(
        409,
        "User does not have OPERATOR role.",
      );
    }

    return prisma.recyclingEvent.findMany({
      where: {
        status: "PENDING",
        collectionPoint: {
          operators: {
            some: {
              operatorId,
            },
          },
        },
      },
      include: {
        recycler: {
          select: publicUserSelect,
        },
        collectionPoint: true,
        campaign: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  },

  async listByRecycler(recyclerId: string) {
    return prisma.recyclingEvent.findMany({
      where: { recyclerId },
      include: { collectionPoint: true },
      orderBy: { createdAt: "desc" },
    });
  },

  async verify(eventId: string, operatorId: string) {
    const event = await prisma.recyclingEvent.findUnique({
      where: { id: eventId },
      include: {
        campaign: true,
      },
    });

    if (!event) throw new AppError(404, "Recycling event not found.");
    if (event.status !== "PENDING") {
      throw new AppError(409, `Only PENDING events can be verified. Current status: ${event.status}.`);
    }

    await assertAuthorizedOperator(operatorId, event.collectionPointId);

    if (!event.campaign) {
      throw new AppError(
        409,
        "Recycling event does not have a campaign.",
      );
    }

    assertCampaignAvailable(
      event.campaign,
      event.materialType,
    );

    const verifiedAt = new Date();

    const rewardPoints = calculateCampaignReward(
      event.weightGrams,
      event.campaign.rewardRecPerKg,
    );
    const proofHash = createProofHash({
      eventId: event.id,
      publicId: event.publicId,
      recyclerId: event.recyclerId,
      collectionPointId: event.collectionPointId,
      campaignId: event.campaign.id,
      operatorId,
      materialType: event.materialType,
      weightGrams: event.weightGrams,
      rewardPoints,
      verifiedAt: verifiedAt.toISOString(),
    });

    return prisma.recyclingEvent.update({
      where: { id: eventId },
      data: {
        status: "VERIFIED",
        operatorId,
        verifiedAt,
        rewardPoints,
        proofHash,
      },
    });
  },

  async reject(eventId: string, operatorId: string, reason: string) {
    const event = await prisma.recyclingEvent.findUnique({ where: { id: eventId } });
    if (!event) throw new AppError(404, "Recycling event not found.");
    if (event.status !== "PENDING") {
      throw new AppError(409, `Only PENDING events can be rejected. Current status: ${event.status}.`);
    }

    await assertAuthorizedOperator(operatorId, event.collectionPointId);

    return prisma.recyclingEvent.update({
      where: { id: eventId },
      data: {
        status: "REJECTED",
        operatorId,
        rejectionReason: reason,
      },
    });
  },

  async recordOnchain(eventId: string) {
    const event = await prisma.recyclingEvent.findUnique({
      where: { id: eventId },
      include: {
        recycler: {
          select: publicUserSelect,
        },
        collectionPoint: true,
        campaign: true,
      },
    });
    if (!event) throw new AppError(404, "Recycling event not found.");
    if (event.status !== "VERIFIED" && event.status !== "ONCHAIN_FAILED") {
      throw new AppError(409, `Only VERIFIED or ONCHAIN_FAILED events can be recorded on-chain. Current status: ${event.status}.`);
    }
    if (!event.operatorId || !event.proofHash || !event.verifiedAt) {
      throw new AppError(500, "Verified event is missing proof data.");
    }

    if (!event.campaignId || !event.campaign) {
      throw new AppError(
        409,
        "Recycling event must be linked to a campaign before recording on-chain.",
      );
    }

    if (!event.recycler.walletAddress) {
      throw new AppError(
        409,
        "Recycler must have a Solana wallet before recording on-chain.",
      );
    }

    if (event.campaign.materialType !== event.materialType) {
      throw new AppError(
        409,
        "Recycling event material does not match the selected campaign.",
      );
    }

    try {
      const result = await blockchainGateway.recordRecyclingProof({
        eventId: event.id,
        publicId: event.publicId,
        recyclerId: event.recyclerId,
        recyclerWalletAddress: event.recycler.walletAddress,
        collectionPointId: event.collectionPointId,
        collectionPointMaterials: event.collectionPoint.supportedMaterials,
        campaignId: event.campaign.id,
        campaignMaterialType: event.campaign.materialType,
        campaignRewardRecPerKg: event.campaign.rewardRecPerKg,
        campaignStartsAt: event.campaign.startsAt.toISOString(),
        campaignEndsAt: event.campaign.endsAt.toISOString(),
        operatorId: event.operatorId,
        materialType: event.materialType,
        weightGrams: event.weightGrams,
        rewardPoints: event.rewardPoints,
        proofHash: event.proofHash,
        verifiedAt: event.verifiedAt.toISOString(),
      });

      const updated = await prisma.recyclingEvent.update({
        where: { id: eventId },
        data: {
          status: "RECORDED_ONCHAIN",
          solanaSignature: result.signature,
          recordedOnchainAt: new Date(),
        },
      });

      return { event: updated, blockchain: result };
    } catch (error) {
      await prisma.recyclingEvent.update({
        where: { id: eventId },
        data: { status: "ONCHAIN_FAILED" },
      });
      throw error;
    }
  },
};
