import { resolve } from "node:path";

import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middlewares/error-handler.js";
import { blockchainGateway } from "./blockchain.service.js";

const DEMO_COMPANY_WALLET =
  "7iPWmaBrHYvcDnaXenEdE8JPQFUYAYyEda5rZCT9dK4b";

const DEMO_COMPANY_KEYPAIR =
  resolve(
    process.cwd(),
    ".demo-wallets/company-demo.json",
  );

export const certificatesService = {
  async list(companyWallet?: string) {
    return prisma.impactCertificate.findMany({
      where: companyWallet
        ? {
            companyWallet,
          }
        : undefined,

      include: {
        campaign: true,
      },

      orderBy: {
        createdOnchainAt: "desc",
      },
    });
  },

  async burn(
    campaignId: string,
    recAmount: number,
    companyWallet: string,
  ) {
    if (
      env.BLOCKCHAIN_MODE !== "localnet"
    ) {
      throw new AppError(
        501,
        "Demo server-side company signing is only enabled on localnet.",
      );
    }

    if (
      companyWallet !==
      DEMO_COMPANY_WALLET
    ) {
      throw new AppError(
        403,
        "Authenticated company wallet is not authorized for the local demo signer.",
      );
    }

    const campaign =
      await prisma.campaign.findUnique({
        where: {
          id: campaignId,
        },
      });

    if (!campaign) {
      throw new AppError(
        404,
        "Campaign not found.",
      );
    }

    if (!campaign.active) {
      throw new AppError(
        409,
        "Campaign is inactive.",
      );
    }

    const result =
      await blockchainGateway
        .burnForCertificate({
          campaignId,
          recAmount,
          companyKeypairPath:
            DEMO_COMPANY_KEYPAIR,
        });

    if (
      result.companyWallet !==
      companyWallet
    ) {
      throw new AppError(
        500,
        "Blockchain signer does not match authenticated company wallet.",
      );
    }

    const certificate =
      await prisma
        .impactCertificate
        .create({
          data: {
            certificateId:
              result.certificateId,

            campaignId,

            companyWallet:
              result.companyWallet,

            recBurned:
              result.recBurned,

            retiredWeightGrams:
              result.retiredWeightGrams,

            certificatePda:
              result.certificateAddress,

            solanaSignature:
              result.signature,

            network:
              result.network,

            createdOnchainAt:
              new Date(
                result.createdOnchainAt,
              ),
          },

          include: {
            campaign: true,
          },
        });

    return {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        materialType:
          campaign.materialType,
      },

      certificate,
    };
  },
};
