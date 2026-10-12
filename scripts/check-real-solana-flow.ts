import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  AnchorProvider,
  Program,
} from "@anchor-lang/core";

import {
  PublicKey,
} from "@solana/web3.js";

import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";

import { env } from "../src/config/env.js";
import { prisma } from "../src/lib/prisma.js";

const EVENT_ID =
  "69e3443a-bde0-46ef-b4d9-d8c53994a4e4";

function hash32(value: string): Buffer {
  return createHash("sha256")
    .update(value)
    .digest();
}

async function main() {
  process.env.ANCHOR_PROVIDER_URL =
    env.SOLANA_RPC_URL;

  process.env.ANCHOR_WALLET =
    env.SOLANA_AUTHORITY_KEYPAIR;

  const provider = AnchorProvider.env();

  const idlPath = path.join(
    process.cwd(),
    "solana",
    "target",
    "idl",
    "proof_of_recycling.json",
  );

  const idl = JSON.parse(
    readFileSync(idlPath, "utf8"),
  );

  const program =
    new Program(idl, provider) as any;

  const event =
    await prisma.recyclingEvent.findUnique({
      where: {
        id: EVENT_ID,
      },
      include: {
        recycler: true,
        campaign: true,
        collectionPoint: true,
      },
    });

  if (!event) {
    throw new Error("Evento não encontrado.");
  }

  if (!event.campaign) {
    throw new Error(
      "Evento não possui Campaign.",
    );
  }

  if (!event.recycler.walletAddress) {
    throw new Error(
      "Recycler não possui wallet.",
    );
  }

  if (!event.proofHash) {
    throw new Error(
      "Evento não possui proofHash.",
    );
  }

  const programId =
    program.programId as PublicKey;

  const recyclerWallet =
    new PublicKey(
      event.recycler.walletAddress,
    );

  /*
   * REC Mint PDA
   */
  const [recMint] =
    PublicKey.findProgramAddressSync(
      [Buffer.from("rec-mint")],
      programId,
    );

  /*
   * Campaign PDA
   */
  const campaignId =
    hash32(event.campaign.id);

  const [campaign] =
    PublicKey.findProgramAddressSync(
      [
        Buffer.from("campaign"),
        campaignId,
      ],
      programId,
    );

  /*
   * ImpactPool PDA
   */
  const [impactPool] =
    PublicKey.findProgramAddressSync(
      [
        Buffer.from("impact-pool"),
        campaign.toBuffer(),
      ],
      programId,
    );

  /*
   * RecyclingProof PDA
   */
  const proofHash =
    Buffer.from(
      event.proofHash,
      "hex",
    );

  const [recyclingProof] =
    PublicKey.findProgramAddressSync(
      [
        Buffer.from("proof"),
        proofHash,
      ],
      programId,
    );

  /*
   * RewardLedger PDA
   */
  const [rewardLedger] =
    PublicKey.findProgramAddressSync(
      [
        Buffer.from("rewards"),
        recyclerWallet.toBuffer(),
      ],
      programId,
    );

  /*
   * Recycler REC token account
   */
  const recyclerRecAccount =
    getAssociatedTokenAddressSync(
      recMint,
      recyclerWallet,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );

  const balance =
    await provider.connection
      .getTokenAccountBalance(
        recyclerRecAccount,
      );

  const pool =
    await program.account
      .impactPool
      .fetch(impactPool);

  const proof =
    await program.account
      .recyclingProof
      .fetch(recyclingProof);

  const ledger =
    await program.account
      .rewardLedger
      .fetch(rewardLedger);

  console.log(
    "\n=== AUDITORIA ON-CHAIN ===\n",
  );

  console.log(
    "Evento:",
    event.publicId,
  );

  console.log(
    "Status DB:",
    event.status,
  );

  console.log(
    "Solana signature:",
    event.solanaSignature,
  );

  console.log("\n--- REC ---");

  console.log(
    "REC Mint:",
    recMint.toBase58(),
  );

  console.log(
    "Recycler:",
    recyclerWallet.toBase58(),
  );

  console.log(
    "REC ATA:",
    recyclerRecAccount.toBase58(),
  );

  console.log(
    "Saldo REC:",
    balance.value.amount,
  );

  console.log("\n--- ImpactPool ---");

  console.log(
    "ImpactPool:",
    impactPool.toBase58(),
  );

  console.log(
    "Peso verificado:",
    pool.totalVerifiedWeightGrams.toString(),
    "g",
  );

  console.log(
    "REC mintado:",
    pool.totalRecMinted.toString(),
  );

  console.log(
    "Peso aposentado:",
    pool.totalRetiredWeightGrams.toString(),
    "g",
  );

  console.log(
    "REC queimado:",
    pool.totalRecBurned.toString(),
  );

  console.log(
    "\n--- RecyclingProof ---",
  );

  console.log(
    "Proof PDA:",
    recyclingProof.toBase58(),
  );

  console.log(
    "Peso da prova:",
    proof.weightGrams.toString(),
    "g",
  );

  console.log(
    "REC da prova:",
    proof.rewardRec.toString(),
  );

  console.log(
    "\n--- RewardLedger ---",
  );

  console.log(
    "Peso acumulado:",
    ledger.totalWeightGrams.toString(),
    "g",
  );

  console.log(
    "REC acumulado:",
    ledger.totalRecMinted.toString(),
  );

  console.log(
    "\n✅ Auditoria concluída.",
  );
}

main()
  .catch((error) => {
    console.error(
      "\n❌ AUDITORIA FALHOU\n",
    );

    console.error(error);

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
