import {
  Connection,
  PublicKey,
} from "@solana/web3.js";

import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";

import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middlewares/error-handler.js";

const connection = new Connection(
  env.SOLANA_RPC_URL,
  "confirmed",
);

async function getCompany(userId: string) {
  const company =
    await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        walletAddress: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

  if (!company) {
    throw new AppError(
      404,
      "Company user not found.",
    );
  }

  if (
    company.role !== "COMPANY" &&
    company.role !== "ADMIN"
  ) {
    throw new AppError(
      403,
      "Company access required.",
    );
  }

  const walletAddress =
    company.walletAddress;

  if (!walletAddress) {
    throw new AppError(
      409,
      "Company does not have a Solana wallet.",
    );
  }

  return {
    ...company,
    walletAddress,
  };
}

export const companyService = {
  getCompany,

  async getSummary(userId: string) {
    const company =
      await getCompany(userId);

    if (!env.SOLANA_PROGRAM_ID) {
      throw new AppError(
        500,
        "SOLANA_PROGRAM_ID is not configured.",
      );
    }

    const programId =
      new PublicKey(
        env.SOLANA_PROGRAM_ID,
      );

    const companyWallet =
      new PublicKey(
        company.walletAddress,
      );

    const [recMint] =
      PublicKey.findProgramAddressSync(
        [Buffer.from("rec-mint")],
        programId,
      );

    const recTokenAccount =
      getAssociatedTokenAddressSync(
        recMint,
        companyWallet,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      );

    let currentRecBalance = "0";

    const accountInfo =
      await connection.getAccountInfo(
        recTokenAccount,
        "confirmed",
      );

    if (accountInfo) {
      const balance =
        await connection
          .getTokenAccountBalance(
            recTokenAccount,
            "confirmed",
          );

      currentRecBalance =
        balance.value.amount;
    }

    const [
      certificateCount,
      totals,
    ] = await Promise.all([
      prisma.impactCertificate.count({
        where: {
          companyWallet:
            company.walletAddress,
        },
      }),

      prisma.impactCertificate.aggregate({
        where: {
          companyWallet:
            company.walletAddress,
        },
        _sum: {
          recBurned: true,
          retiredWeightGrams: true,
        },
      }),
    ]);

    const totalRecBurned =
      totals._sum?.recBurned ?? 0;

    const totalRetiredWeightGrams =
      totals._sum?.retiredWeightGrams ?? 0;

    return {
      company: {
        id: company.id,
        name: company.name,
        email: company.email,
        walletAddress:
          company.walletAddress,
        role: company.role,
      },

      rec: {
        currentBalance:
          currentRecBalance,
        totalBurned:
          totalRecBurned,
      },

      impact: {
        retiredWeightGrams:
          totalRetiredWeightGrams,

        retiredWeightKg:
          totalRetiredWeightGrams /
          1000,

        certificateCount,
      },

      solana: {
        network:
          env.BLOCKCHAIN_MODE,

        recMint:
          recMint.toBase58(),

        recTokenAccount:
          recTokenAccount.toBase58(),
      },
    };
  },
};
