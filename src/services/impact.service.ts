import { Connection, PublicKey } from "@solana/web3.js";

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

export const impactService = {
  async getRecyclerImpact(recyclerId: string) {
    const recycler = await prisma.user.findUnique({
      where: {
        id: recyclerId,
      },
    });

    if (!recycler) {
      throw new AppError(
        404,
        "Recycler not found.",
      );
    }

    if (!recycler.walletAddress) {
      throw new AppError(
        409,
        "Recycler does not have a Solana wallet.",
      );
    }

    if (!env.SOLANA_PROGRAM_ID) {
      throw new AppError(
        500,
        "SOLANA_PROGRAM_ID is not configured.",
      );
    }

    const events =
      await prisma.recyclingEvent.findMany({
        where: {
          recyclerId,
          status: "RECORDED_ONCHAIN",
        },
        include: {
          collectionPoint: true,
          campaign: true,
        },
        orderBy: {
          recordedOnchainAt: "desc",
        },
      });

    const totalWeightGrams = events.reduce(
      (total, event) =>
        total + event.weightGrams,
      0,
    );

    const totalRecIssued = events.reduce(
      (total, event) =>
        total + event.rewardPoints,
      0,
    );

    const programId =
      new PublicKey(
        env.SOLANA_PROGRAM_ID,
      );

    const recyclerWallet =
      new PublicKey(
        recycler.walletAddress,
      );

    const [recMint] =
      PublicKey.findProgramAddressSync(
        [Buffer.from("rec-mint")],
        programId,
      );

    const recyclerRecAccount =
      getAssociatedTokenAddressSync(
        recMint,
        recyclerWallet,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      );

    let recBalance = "0";

    const tokenAccount =
      await connection.getAccountInfo(
        recyclerRecAccount,
        "confirmed",
      );

    if (tokenAccount) {
      const balance =
        await connection.getTokenAccountBalance(
          recyclerRecAccount,
          "confirmed",
        );

      recBalance = balance.value.amount;
    }

    return {
      recycler: {
        id: recycler.id,
        name: recycler.name,
        walletAddress:
          recycler.walletAddress,
      },

      impact: {
        totalWeightGrams,
        totalWeightKg:
          totalWeightGrams / 1000,
        totalRecIssued,
        currentRecBalance:
          recBalance,
        onchainEvents:
          events.length,
      },

      solana: {
        network:
          env.BLOCKCHAIN_MODE,
        recMint:
          recMint.toBase58(),
        recTokenAccount:
          recyclerRecAccount.toBase58(),
      },

      history: events.map((event) => ({
        id: event.id,
        publicId: event.publicId,
        materialType:
          event.materialType,
        weightGrams:
          event.weightGrams,
        recIssued:
          event.rewardPoints,
        collectionPoint:
          event.collectionPoint.name,
        campaign:
          event.campaign?.name ?? null,
        solanaSignature:
          event.solanaSignature,
        recordedOnchainAt:
          event.recordedOnchainAt,
      })),
    };
  },
};
