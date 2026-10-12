import { Keypair } from "@solana/web3.js";

import { prisma } from "../src/lib/prisma.js";
import { recyclingService } from "../src/services/recycling.service.js";

async function main() {
  console.log("\n=== TESTE REAL: BACKEND -> SOLANA -> REC ===\n");

  const recyclerWallet = Keypair.generate();

  console.log(
    "Wallet temporária do reciclador:",
    recyclerWallet.publicKey.toBase58(),
  );

  const recycler = await prisma.user.create({
    data: {
      name: "Recycler Demo",
      email: `recycler-${Date.now()}@demo.local`,
      role: "USER",
      walletAddress: recyclerWallet.publicKey.toBase58(),
    },
  });

  console.log("✅ Recycler criado:", recycler.id);

  const operator = await prisma.user.create({
    data: {
      name: "Operator Demo",
      email: `operator-${Date.now()}@demo.local`,
      role: "OPERATOR",
    },
  });

  console.log("✅ Operador criado:", operator.id);

  const point = await prisma.collectionPoint.create({
    data: {
      name: "Cooperativa Demo",
      address: "Belém - PA",
      latitude: -1.4558,
      longitude: -48.4902,
      supportedMaterials: ["PET_PLASTIC"],
      status: "ACTIVE",
    },
  });

  console.log("✅ Ponto de coleta criado:", point.id);

  await prisma.operatorAssignment.create({
    data: {
      operatorId: operator.id,
      collectionPointId: point.id,
    },
  });

  console.log("✅ Operador vinculado ao ponto");

  const now = Date.now();

  const campaign = await prisma.campaign.create({
    data: {
      name: "Campanha PET Demo",
      materialType: "PET_PLASTIC",
      rewardRecPerKg: 10,
      startsAt: new Date(now - 10 * 60 * 1000),
      endsAt: new Date(now + 24 * 60 * 60 * 1000),
      active: true,
    },
  });

  console.log("✅ Campaign criada:", campaign.id);

  const event = await recyclingService.create({
    recyclerId: recycler.id,
    collectionPointId: point.id,
    campaignId: campaign.id,
    materialType: "PET_PLASTIC",
    weightGrams: 2400,
    metadata: {
      source: "real-solana-test",
    },
  });

  console.log(
    "✅ Evento criado:",
    event.id,
    "- 2400 g de PET",
  );

  const verified = await recyclingService.verify(
    event.id,
    operator.id,
  );

  console.log("✅ Evento verificado:", verified.status);
  console.log("Proof hash:", verified.proofHash);

  console.log(
    "\n⏳ Chamando verify_recycling() na Solana...\n",
  );

  const result = await recyclingService.recordOnchain(
    event.id,
  );

  console.log("✅ TRANSAÇÃO CONFIRMADA");
  console.log("Status:", result.event.status);
  console.log(
    "Network:",
    result.blockchain.network,
  );
  console.log(
    "Solana signature:",
    result.blockchain.signature,
  );

  const finalEvent =
    await prisma.recyclingEvent.findUniqueOrThrow({
      where: {
        id: event.id,
      },
      include: {
        recycler: true,
        collectionPoint: true,
        campaign: true,
      },
    });

  console.log("\n=== RESULTADO FINAL ===");
  console.log("Public ID:", finalEvent.publicId);
  console.log("Material:", finalEvent.materialType);
  console.log("Peso:", finalEvent.weightGrams, "g");
  console.log("Status:", finalEvent.status);
  console.log(
    "Wallet:",
    finalEvent.recycler.walletAddress,
  );
  console.log(
    "Campaign:",
    finalEvent.campaign?.name,
  );
  console.log(
    "Signature:",
    finalEvent.solanaSignature,
  );

  console.log(
    "\n✅ Fluxo PostgreSQL -> Backend -> Solana concluído.",
  );
}

main()
  .catch((error) => {
    console.error("\n❌ TESTE FALHOU\n");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
