import {
  AnchorProvider,
  BN,
  Program,
  setProvider,
} from "@anchor-lang/core";

import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";

import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";

import { expect } from "chai";
import { createHash } from "crypto";

const idl = require("../target/idl/proof_of_recycling.json");

describe("proof-of-recycling / REC integration", () => {
  const provider = AnchorProvider.env();
  setProvider(provider);

  const program = new Program(idl, provider) as any;
  const authority = provider.wallet.publicKey;

  const hash32 = (value: string): Buffer =>
    createHash("sha256").update(value).digest();

  it("mints 24 REC for 2.4 kg of PET", async () => {
    const programId = program.programId;

    const [config] = PublicKey.findProgramAddressSync(
      [Buffer.from("protocol")],
      programId
    );

    const [recMint] = PublicKey.findProgramAddressSync(
      [Buffer.from("rec-mint")],
      programId
    );

    const pointId = hash32("belem-cooperative-001");

    const [collectionPoint] = PublicKey.findProgramAddressSync(
      [Buffer.from("point"), pointId],
      programId
    );

    const campaignId = hash32("amazon-pet-campaign-001");

    const [campaign] = PublicKey.findProgramAddressSync(
      [Buffer.from("campaign"), campaignId],
      programId
    );

    const [impactPool] = PublicKey.findProgramAddressSync(
      [Buffer.from("impact-pool"), campaign.toBuffer()],
      programId
    );

    const recycler = Keypair.generate();

    const recyclerRecAccount = getAssociatedTokenAddressSync(
      recMint,
      recycler.publicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const proofHash = hash32(
      `recycling:${recycler.publicKey.toBase58()}:2400`
    );

    const [recyclingProof] = PublicKey.findProgramAddressSync(
      [Buffer.from("proof"), proofHash],
      programId
    );

    const [rewardLedger] = PublicKey.findProgramAddressSync(
      [Buffer.from("rewards"), recycler.publicKey.toBuffer()],
      programId
    );

    console.log("1. Initializing protocol...");

    await program.methods
      .initializeProtocol()
      .accountsStrict({
        authority,
        config,
        recMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("2. Registering collection point...");

    await program.methods
      .registerCollectionPoint(
        [...pointId],
        authority,
        1
      )
      .accountsStrict({
        authority,
        config,
        collectionPoint,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("3. Creating PET campaign...");

    const now = Math.floor(Date.now() / 1000);

    await program.methods
      .createCampaign(
        [...campaignId],
        authority,
        { petPlastic: {} },
        new BN(10),
        new BN(now - 60),
        new BN(now + 3600)
      )
      .accountsStrict({
        authority,
        config,
        campaign,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("4. Initializing ImpactPool...");

    await program.methods
      .initializeImpactPool()
      .accountsStrict({
        authority,
        config,
        campaign,
        impactPool,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("5. Verifying 2.4 kg of PET...");

    await program.methods
      .verifyRecycling(
        [...proofHash],
        { petPlastic: {} },
        new BN(2400)
      )
      .accountsStrict({
        verifier: authority,
        config,
        recMint,
        collectionPoint,
        campaign,
        impactPool,
        recyclerWallet: recycler.publicKey,
        recyclerRecAccount,
        recyclingProof,
        rewardLedger,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("6. Checking REC balance...");

    const balance =
      await provider.connection.getTokenAccountBalance(
        recyclerRecAccount
      );

    console.log(
      "Recycler wallet:",
      recycler.publicKey.toBase58()
    );

    console.log(
      "REC mint:",
      recMint.toBase58()
    );

    console.log(
      "REC balance:",
      balance.value.amount
    );

    expect(balance.value.amount).to.equal("24");

    const protocolAccount =
      await program.account.protocolConfig.fetch(config);

    const ledger =
      await program.account.rewardLedger.fetch(rewardLedger);

    expect(
      protocolAccount.totalVerifiedWeightGrams.toString()
    ).to.equal("2400");

    expect(
      protocolAccount.totalRecMinted.toString()
    ).to.equal("24");

    expect(
      ledger.totalWeightGrams.toString()
    ).to.equal("2400");

    expect(
      ledger.totalRecMinted.toString()
    ).to.equal("24");

    const pool =
      await program.account.impactPool.fetch(impactPool);

    console.log(
      "ImpactPool verified weight:",
      pool.totalVerifiedWeightGrams.toString()
    );

    console.log(
      "ImpactPool REC minted:",
      pool.totalRecMinted.toString()
    );

    console.log(
      "ImpactPool retired weight:",
      pool.totalRetiredWeightGrams.toString()
    );

    console.log(
      "ImpactPool REC burned:",
      pool.totalRecBurned.toString()
    );

    expect(
      pool.totalVerifiedWeightGrams.toString()
    ).to.equal("2400");

    expect(
      pool.totalRecMinted.toString()
    ).to.equal("24");

    expect(
      pool.totalRetiredWeightGrams.toString()
    ).to.equal("0");

    expect(
      pool.totalRecBurned.toString()
    ).to.equal("0");

    //
    // 7. Burn 10 REC and create an environmental certificate
    //
    console.log("7. Funding company signer...");

    const airdropSignature =
      await provider.connection.requestAirdrop(
        recycler.publicKey,
        LAMPORTS_PER_SOL
      );

    await provider.connection.confirmTransaction(
      airdropSignature,
      "confirmed"
    );

    const certificateId =
      hash32("amazon-pet-retirement-001");

    const [impactCertificate] =
      PublicKey.findProgramAddressSync(
        [
          Buffer.from("certificate"),
          campaign.toBuffer(),
          certificateId,
        ],
        programId
      );

    console.log(
      "8. Burning 10 REC for certificate..."
    );

    await program.methods
      .burnForCertificate(
        [...certificateId],
        new BN(10)
      )
      .accountsStrict({
        company: recycler.publicKey,
        config,
        recMint,
        campaign,
        impactPool,
        companyRecAccount: recyclerRecAccount,
        impactCertificate,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram:
          ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([recycler])
      .rpc();

    //
    // 8. Verify real token balance after burn
    //
    const balanceAfterBurn =
      await provider.connection.getTokenAccountBalance(
        recyclerRecAccount
      );

    console.log(
      "REC balance after burn:",
      balanceAfterBurn.value.amount
    );

    expect(
      balanceAfterBurn.value.amount
    ).to.equal("14");

    //
    // 9. Verify updated environmental accounting
    //
    const poolAfterBurn =
      await program.account.impactPool.fetch(
        impactPool
      );

    console.log(
      "ImpactPool retired weight:",
      poolAfterBurn
        .totalRetiredWeightGrams
        .toString()
    );

    console.log(
      "ImpactPool REC burned:",
      poolAfterBurn
        .totalRecBurned
        .toString()
    );

    expect(
      poolAfterBurn
        .totalVerifiedWeightGrams
        .toString()
    ).to.equal("2400");

    expect(
      poolAfterBurn
        .totalRecMinted
        .toString()
    ).to.equal("24");

    expect(
      poolAfterBurn
        .totalRetiredWeightGrams
        .toString()
    ).to.equal("1000");

    expect(
      poolAfterBurn
        .totalRecBurned
        .toString()
    ).to.equal("10");

    //
    // 10. Verify immutable certificate PDA
    //
    const certificate =
      await program.account.impactCertificate.fetch(
        impactCertificate
      );

    console.log(
      "Certificate:",
      impactCertificate.toBase58()
    );

    console.log(
      "Certificate REC burned:",
      certificate.recBurned.toString()
    );

    console.log(
      "Certificate retired weight:",
      certificate.retiredWeightGrams.toString()
    );

    expect(
      certificate.owner.toBase58()
    ).to.equal(
      recycler.publicKey.toBase58()
    );

    expect(
      certificate.campaign.toBase58()
    ).to.equal(
      campaign.toBase58()
    );

    expect(
      certificate.impactPool.toBase58()
    ).to.equal(
      impactPool.toBase58()
    );

    expect(
      certificate.recBurned.toString()
    ).to.equal("10");

    expect(
      certificate.retiredWeightGrams.toString()
    ).to.equal("1000");

    console.log(
      "✅ 10 REC permanently burned"
    );

    console.log(
      "✅ Recycler/company balance reduced to 14 REC"
    );

    console.log(
      "✅ 1000 grams of impact retired"
    );

    console.log(
      "✅ ImpactCertificate created on-chain"
    );

    //
    // SECURITY TEST 1
    // Attempt to retire more REC than remains available.
    //
    console.log(
      "9. Security test: rejecting over-retirement..."
    );

    const overRetirementId =
      hash32("amazon-pet-over-retirement-001");

    const [overRetirementCertificate] =
      PublicKey.findProgramAddressSync(
        [
          Buffer.from("certificate"),
          campaign.toBuffer(),
          overRetirementId,
        ],
        programId
      );

    let overRetirementRejected = false;

    try {
      await program.methods
        .burnForCertificate(
          [...overRetirementId],
          new BN(15)
        )
        .accountsStrict({
          company: recycler.publicKey,
          config,
          recMint,
          campaign,
          impactPool,
          companyRecAccount: recyclerRecAccount,
          impactCertificate:
            overRetirementCertificate,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram:
            ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([recycler])
        .rpc();
    } catch (error) {
      overRetirementRejected = true;

      console.log(
        "✅ Over-retirement rejected"
      );
    }

    expect(
      overRetirementRejected,
      "Burning more REC than the ImpactPool has available must fail"
    ).to.equal(true);

    //
    // SECURITY TEST 2
    // Burn of zero REC must be rejected.
    //
    console.log(
      "10. Security test: rejecting zero-value burn..."
    );

    const zeroBurnId =
      hash32("amazon-pet-zero-burn-001");

    const [zeroBurnCertificate] =
      PublicKey.findProgramAddressSync(
        [
          Buffer.from("certificate"),
          campaign.toBuffer(),
          zeroBurnId,
        ],
        programId
      );

    let zeroBurnRejected = false;

    try {
      await program.methods
        .burnForCertificate(
          [...zeroBurnId],
          new BN(0)
        )
        .accountsStrict({
          company: recycler.publicKey,
          config,
          recMint,
          campaign,
          impactPool,
          companyRecAccount: recyclerRecAccount,
          impactCertificate: zeroBurnCertificate,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram:
            ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([recycler])
        .rpc();
    } catch (error) {
      zeroBurnRejected = true;

      console.log(
        "✅ Zero-value burn rejected"
      );
    }

    expect(
      zeroBurnRejected,
      "A burn of 0 REC must fail"
    ).to.equal(true);

    //
    // SECURITY TEST 3
    // Reusing the same certificate ID must fail because its PDA
    // already exists.
    //
    console.log(
      "11. Security test: rejecting duplicate certificate..."
    );

    let duplicateCertificateRejected = false;

    try {
      await program.methods
        .burnForCertificate(
          [...certificateId],
          new BN(1)
        )
        .accountsStrict({
          company: recycler.publicKey,
          config,
          recMint,
          campaign,
          impactPool,
          companyRecAccount: recyclerRecAccount,
          impactCertificate,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram:
            ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([recycler])
        .rpc();
    } catch (error) {
      duplicateCertificateRejected = true;

      console.log(
        "✅ Duplicate certificate ID rejected"
      );
    }

    expect(
      duplicateCertificateRejected,
      "The same certificate PDA must never be created twice"
    ).to.equal(true);

    //
    // SECURITY TEST 4
    // Verify failed attempts changed absolutely nothing.
    //
    console.log(
      "12. Verifying failed attacks did not mutate state..."
    );

    const finalBalance =
      await provider.connection.getTokenAccountBalance(
        recyclerRecAccount
      );

    const finalPool =
      await program.account.impactPool.fetch(
        impactPool
      );

    expect(
      finalBalance.value.amount
    ).to.equal("14");

    expect(
      finalPool.totalVerifiedWeightGrams.toString()
    ).to.equal("2400");

    expect(
      finalPool.totalRecMinted.toString()
    ).to.equal("24");

    expect(
      finalPool.totalRetiredWeightGrams.toString()
    ).to.equal("1000");

    expect(
      finalPool.totalRecBurned.toString()
    ).to.equal("10");

    console.log(
      "Final REC balance:",
      finalBalance.value.amount
    );

    console.log(
      "Final retired impact:",
      finalPool.totalRetiredWeightGrams.toString(),
      "grams"
    );

    console.log(
      "Final REC burned:",
      finalPool.totalRecBurned.toString()
    );

    console.log(
      "✅ Failed attacks produced no state changes"
    );

    console.log("✅ Proof of Recycling created");
    console.log("✅ 2400 grams verified");
    console.log("✅ 24 REC minted");
    console.log("✅ Recycler balance confirmed");
    console.log("✅ ImpactPool accounting confirmed");
  });
});
