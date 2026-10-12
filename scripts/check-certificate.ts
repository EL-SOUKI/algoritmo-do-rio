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

const CAMPAIGN_ID =
  "0196becd-7c3e-4bd9-9d3c-dbda6a49461b";

const COMPANY_WALLET =
  "9256gd54AsxUrdChNi9qahcWawNB9ijGcPkBJjKdx9Wc";

const CERTIFICATE_ADDRESS =
  "BKkR9geFt6jJXAySHczWo7pWF3gmMgjZ75aSK33qi3Tn";

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

  const provider =
    AnchorProvider.env();

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

  const programId =
    program.programId as PublicKey;

  const company =
    new PublicKey(COMPANY_WALLET);

  const certificate =
    new PublicKey(CERTIFICATE_ADDRESS);

  const [recMint] =
    PublicKey.findProgramAddressSync(
      [Buffer.from("rec-mint")],
      programId,
    );

  const campaignId =
    hash32(CAMPAIGN_ID);

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

  const companyRecAccount =
    getAssociatedTokenAddressSync(
      recMint,
      company,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );

  const balance =
    await provider.connection
      .getTokenAccountBalance(
        companyRecAccount,
      );

  const pool =
    await program.account
      .impactPool
      .fetch(impactPool);

  const cert =
    await program.account
      .impactCertificate
      .fetch(certificate);

  console.log(
    "\n=== AUDITORIA BURN-TO-CERTIFICATE ===\n",
  );

  console.log("--- EMPRESA ---");
  console.log(
    "Wallet:",
    company.toBase58(),
  );
  console.log(
    "Saldo REC atual:",
    balance.value.amount,
  );

  console.log("\n--- IMPACT POOL ---");
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

  console.log("\n--- CERTIFICADO ---");
  console.log(
    "Certificate PDA:",
    certificate.toBase58(),
  );
  console.log(
    "Owner:",
    cert.owner.toBase58(),
  );
  console.log(
    "REC queimado:",
    cert.recBurned.toString(),
  );
  console.log(
    "Impacto aposentado:",
    cert.retiredWeightGrams.toString(),
    "g",
  );
  console.log(
    "Criado em:",
    new Date(
      Number(cert.createdAt.toString()) *
        1000,
    ).toISOString(),
  );

  console.log(
    "\n✅ Certificado auditado on-chain.",
  );
}

main().catch((error) => {
  console.error(
    "\n❌ AUDITORIA FALHOU\n",
  );
  console.error(error);
  process.exitCode = 1;
});
