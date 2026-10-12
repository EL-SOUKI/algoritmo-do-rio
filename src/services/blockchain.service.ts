import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  AnchorProvider,
  Program,
} from "@anchor-lang/core";

import BN from "bn.js";

import {
  Keypair,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";

import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";

import { env } from "../config/env.js";

import type {
  BlockchainGateway,
  BlockchainRecordResult,
  BurnCertificateInput,
  BurnCertificateResult,
  RecyclingProofInput,
} from "../types/blockchain.js";

type AnchorMaterial =
  | { petPlastic: Record<string, never> }
  | { otherPlastic: Record<string, never> }
  | { aluminum: Record<string, never> }
  | { glass: Record<string, never> }
  | { paper: Record<string, never> }
  | { cardboard: Record<string, never> }
  | { electronics: Record<string, never> };

function hash32(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

function proofHashBytes(value: string): Buffer {
  if (!/^[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error(
      `Invalid proofHash. Expected 64 hexadecimal characters, received: ${value}`,
    );
  }

  return Buffer.from(value, "hex");
}

function toAnchorMaterial(material: string): AnchorMaterial {
  switch (material) {
    case "PET_PLASTIC":
      return { petPlastic: {} };
    case "OTHER_PLASTIC":
      return { otherPlastic: {} };
    case "ALUMINUM":
      return { aluminum: {} };
    case "GLASS":
      return { glass: {} };
    case "PAPER":
      return { paper: {} };
    case "CARDBOARD":
      return { cardboard: {} };
    case "ELECTRONICS":
      return { electronics: {} };
    default:
      throw new Error(`Unsupported material type: ${material}`);
  }
}

function materialBit(material: string): number {
  switch (material) {
    case "PET_PLASTIC":
      return 1 << 0;
    case "OTHER_PLASTIC":
      return 1 << 1;
    case "ALUMINUM":
      return 1 << 2;
    case "GLASS":
      return 1 << 3;
    case "PAPER":
      return 1 << 4;
    case "CARDBOARD":
      return 1 << 5;
    case "ELECTRONICS":
      return 1 << 6;
    default:
      throw new Error(`Unsupported material type: ${material}`);
  }
}

function buildMaterialMask(materials: string[]): number {
  const mask = materials.reduce(
    (result, material) => result | materialBit(material),
    0,
  );

  if (mask === 0) {
    throw new Error("Collection point has no supported materials.");
  }

  return mask;
}

function unixSeconds(value: string): number {
  const milliseconds = new Date(value).getTime();

  if (!Number.isFinite(milliseconds)) {
    throw new Error(`Invalid date: ${value}`);
  }

  return Math.floor(milliseconds / 1000);
}

class MockBlockchainGateway implements BlockchainGateway {
  async recordRecyclingProof(
    input: RecyclingProofInput,
  ): Promise<BlockchainRecordResult> {
    return {
      signature: `mock_${input.publicId}_${randomUUID().replaceAll("-", "")}`,
      network: "mock",
    };
  }

  async burnForCertificate(
    input: BurnCertificateInput,
  ): Promise<BurnCertificateResult> {
    const certificateId = randomUUID();

    return {
      signature: `mock_certificate_${randomUUID().replaceAll("-", "")}`,
      network: "mock",
      certificateId,
      certificateAddress: `mock_${certificateId}`,
      companyWallet: "mock",
      recBurned: input.recAmount,
      retiredWeightGrams: 0,
      createdOnchainAt:
        new Date().toISOString(),
    };
  }
}

class SolanaLocalnetBlockchainGateway implements BlockchainGateway {
  private readonly provider: AnchorProvider;
  private readonly program: any;

  constructor() {
    if (!env.SOLANA_PROGRAM_ID) {
      throw new Error(
        "SOLANA_PROGRAM_ID is required when BLOCKCHAIN_MODE=localnet.",
      );
    }

    process.env.ANCHOR_PROVIDER_URL = env.SOLANA_RPC_URL;
    process.env.ANCHOR_WALLET = env.SOLANA_AUTHORITY_KEYPAIR;

    this.provider = AnchorProvider.env();

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

    this.program = new Program(
      idl,
      this.provider,
    ) as any;

    const idlProgramId =
      this.program.programId.toBase58();

    if (idlProgramId !== env.SOLANA_PROGRAM_ID) {
      throw new Error(
        `Program ID mismatch. IDL=${idlProgramId}, env=${env.SOLANA_PROGRAM_ID}`,
      );
    }
  }

  private async accountExists(
    address: PublicKey,
  ): Promise<boolean> {
    const info =
      await this.provider.connection.getAccountInfo(
        address,
        "confirmed",
      );

    return info !== null;
  }

  async recordRecyclingProof(
    input: RecyclingProofInput,
  ): Promise<BlockchainRecordResult> {
    const programId =
      this.program.programId as PublicKey;

    const authority =
      this.provider.wallet.publicKey;

    const recyclerWallet =
      new PublicKey(input.recyclerWalletAddress);

    const [config] =
      PublicKey.findProgramAddressSync(
        [Buffer.from("protocol")],
        programId,
      );

    const [recMint] =
      PublicKey.findProgramAddressSync(
        [Buffer.from("rec-mint")],
        programId,
      );

    const pointId =
      hash32(input.collectionPointId);

    const [collectionPoint] =
      PublicKey.findProgramAddressSync(
        [
          Buffer.from("point"),
          pointId,
        ],
        programId,
      );

    const campaignId =
      hash32(input.campaignId);

    const [campaign] =
      PublicKey.findProgramAddressSync(
        [
          Buffer.from("campaign"),
          campaignId,
        ],
        programId,
      );

    const [impactPool] =
      PublicKey.findProgramAddressSync(
        [
          Buffer.from("impact-pool"),
          campaign.toBuffer(),
        ],
        programId,
      );

    const proofHash =
      proofHashBytes(input.proofHash);

    const [recyclingProof] =
      PublicKey.findProgramAddressSync(
        [
          Buffer.from("proof"),
          proofHash,
        ],
        programId,
      );

    const [rewardLedger] =
      PublicKey.findProgramAddressSync(
        [
          Buffer.from("rewards"),
          recyclerWallet.toBuffer(),
        ],
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

    /*
     * 1. Protocol + REC Mint
     */
    if (!(await this.accountExists(config))) {
      await this.program.methods
        .initializeProtocol()
        .accountsStrict({
          authority,
          config,
          recMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    }

    /*
     * 2. Collection Point
     */
    if (!(await this.accountExists(collectionPoint))) {
      const materialMask =
        buildMaterialMask(
          input.collectionPointMaterials,
        );

      await this.program.methods
        .registerCollectionPoint(
          [...pointId],
          authority,
          materialMask,
        )
        .accountsStrict({
          authority,
          config,
          collectionPoint,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    }

    /*
     * 3. Campaign
     */
    if (!(await this.accountExists(campaign))) {
      if (input.campaignRewardRecPerKg <= 0) {
        throw new Error(
          "Campaign reward rate must be greater than zero.",
        );
      }

      await this.program.methods
        .createCampaign(
          [...campaignId],
          authority,
          toAnchorMaterial(
            input.campaignMaterialType,
          ),
          new BN(
            input.campaignRewardRecPerKg,
          ),
          new BN(
            unixSeconds(input.campaignStartsAt),
          ),
          new BN(
            unixSeconds(input.campaignEndsAt),
          ),
        )
        .accountsStrict({
          authority,
          config,
          campaign,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    }

    /*
     * 4. ImpactPool
     */
    if (!(await this.accountExists(impactPool))) {
      await this.program.methods
        .initializeImpactPool()
        .accountsStrict({
          authority,
          config,
          campaign,
          impactPool,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    }

    /*
     * 5. Physical recycling proof + REC mint
     */
    const signature =
      await this.program.methods
        .verifyRecycling(
          [...proofHash],
          toAnchorMaterial(input.materialType),
          new BN(input.weightGrams),
        )
        .accountsStrict({
          verifier: authority,
          config,
          recMint,
          collectionPoint,
          campaign,
          impactPool,
          recyclerWallet,
          recyclerRecAccount,
          recyclingProof,
          rewardLedger,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram:
            ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

    return {
      signature,
      network: "localnet",
    };
  }

  async burnForCertificate(
    input: BurnCertificateInput,
  ): Promise<BurnCertificateResult> {
    if (!Number.isInteger(input.recAmount) || input.recAmount <= 0) {
      throw new Error("recAmount must be a positive integer.");
    }

    const programId =
      this.program.programId as PublicKey;

    const secretKey = JSON.parse(
      readFileSync(
        input.companyKeypairPath,
        "utf8",
      ),
    ) as number[];

    const company = Keypair.fromSecretKey(
      Uint8Array.from(secretKey),
    );

    const [config] =
      PublicKey.findProgramAddressSync(
        [Buffer.from("protocol")],
        programId,
      );

    const [recMint] =
      PublicKey.findProgramAddressSync(
        [Buffer.from("rec-mint")],
        programId,
      );

    const campaignId =
      hash32(input.campaignId);

    const [campaign] =
      PublicKey.findProgramAddressSync(
        [
          Buffer.from("campaign"),
          campaignId,
        ],
        programId,
      );

    const [impactPool] =
      PublicKey.findProgramAddressSync(
        [
          Buffer.from("impact-pool"),
          campaign.toBuffer(),
        ],
        programId,
      );

    if (!(await this.accountExists(campaign))) {
      throw new Error(
        "Campaign does not exist on-chain.",
      );
    }

    if (!(await this.accountExists(impactPool))) {
      throw new Error(
        "ImpactPool does not exist on-chain.",
      );
    }

    const certificateIdText =
      randomUUID();

    const certificateId =
      hash32(certificateIdText);

    const [impactCertificate] =
      PublicKey.findProgramAddressSync(
        [
          Buffer.from("certificate"),
          campaign.toBuffer(),
          certificateId,
        ],
        programId,
      );

    const companyRecAccount =
      getAssociatedTokenAddressSync(
        recMint,
        company.publicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      );

    const tokenAccountInfo =
      await this.provider.connection.getAccountInfo(
        companyRecAccount,
        "confirmed",
      );

    if (!tokenAccountInfo) {
      throw new Error(
        "Company REC token account does not exist.",
      );
    }

    const balance =
      await this.provider.connection.getTokenAccountBalance(
        companyRecAccount,
        "confirmed",
      );

    const rawBalance =
      BigInt(balance.value.amount);

    if (rawBalance < BigInt(input.recAmount)) {
      throw new Error(
        `Insufficient REC balance. Available=${rawBalance.toString()}, requested=${input.recAmount}`,
      );
    }

    const signature =
      await this.program.methods
        .burnForCertificate(
          [...certificateId],
          new BN(input.recAmount),
        )
        .accountsStrict({
          company: company.publicKey,
          config,
          recMint,
          campaign,
          impactPool,
          companyRecAccount,
          impactCertificate,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram:
            ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([company])
        .rpc();

    const certificateAccount =
      await this.program.account
        .impactCertificate
        .fetch(impactCertificate);

    const retiredWeightGrams =
      Number(
        certificateAccount
          .retiredWeightGrams
          .toString(),
      );

    const createdOnchainAt =
      new Date(
        Number(
          certificateAccount
            .createdAt
            .toString(),
        ) * 1000,
      ).toISOString();

    return {
      signature,
      network: "localnet",
      certificateId:
        certificateIdText,
      certificateAddress:
        impactCertificate.toBase58(),
      companyWallet:
        company.publicKey.toBase58(),
      recBurned:
        input.recAmount,
      retiredWeightGrams,
      createdOnchainAt,
    };
  }
}

class DevnetBlockchainGateway implements BlockchainGateway {
  async recordRecyclingProof(
    _input: RecyclingProofInput,
  ): Promise<BlockchainRecordResult> {
    throw new Error(
      "Solana devnet adapter is not implemented yet.",
    );
  }

  async burnForCertificate(
    _input: BurnCertificateInput,
  ): Promise<BurnCertificateResult> {
    throw new Error(
      "Solana devnet certificate adapter is not implemented yet.",
    );
  }
}

export const blockchainGateway: BlockchainGateway =
  env.BLOCKCHAIN_MODE === "localnet"
    ? new SolanaLocalnetBlockchainGateway()
    : env.BLOCKCHAIN_MODE === "devnet"
      ? new DevnetBlockchainGateway()
      : new MockBlockchainGateway();
