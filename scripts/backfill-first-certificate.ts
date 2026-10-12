import { prisma } from "../src/lib/prisma.js";

const CERTIFICATE_ID =
  "41a8a8c5-7d8e-4084-8764-a3efe248261d";

const CAMPAIGN_ID =
  "0196becd-7c3e-4bd9-9d3c-dbda6a49461b";

const COMPANY_WALLET =
  "9256gd54AsxUrdChNi9qahcWawNB9ijGcPkBJjKdx9Wc";

const CERTIFICATE_PDA =
  "BKkR9geFt6jJXAySHczWo7pWF3gmMgjZ75aSK33qi3Tn";

const SOLANA_SIGNATURE =
  "4wzwTxbWkUWSKgZNG34ngZHQNthb4ZKPgDVhw4pcGPj23c7gHWhq7wZEcZesMvhzL9DQPSuZtik7GGMnp9LH19xQ";

async function main() {
  const certificate =
    await prisma.impactCertificate.upsert({
      where: {
        certificateId: CERTIFICATE_ID,
      },
      update: {
        campaignId: CAMPAIGN_ID,
        companyWallet: COMPANY_WALLET,
        recBurned: 10,
        retiredWeightGrams: 1000,
        certificatePda: CERTIFICATE_PDA,
        solanaSignature: SOLANA_SIGNATURE,
        network: "localnet",
        createdOnchainAt:
          new Date(
            "2026-10-12T05:38:37.000Z",
          ),
      },
      create: {
        certificateId: CERTIFICATE_ID,
        campaignId: CAMPAIGN_ID,
        companyWallet: COMPANY_WALLET,
        recBurned: 10,
        retiredWeightGrams: 1000,
        certificatePda: CERTIFICATE_PDA,
        solanaSignature: SOLANA_SIGNATURE,
        network: "localnet",
        createdOnchainAt:
          new Date(
            "2026-10-12T05:38:37.000Z",
          ),
      },
      include: {
        campaign: true,
      },
    });

  console.log(
    "\n=== CERTIFICADO SALVO NO POSTGRESQL ===\n",
  );

  console.log(
    "DB ID:",
    certificate.id,
  );

  console.log(
    "Certificate ID:",
    certificate.certificateId,
  );

  console.log(
    "Campanha:",
    certificate.campaign.name,
  );

  console.log(
    "Empresa:",
    certificate.companyWallet,
  );

  console.log(
    "REC queimado:",
    certificate.recBurned,
  );

  console.log(
    "Impacto aposentado:",
    certificate.retiredWeightGrams,
    "g",
  );

  console.log(
    "PDA:",
    certificate.certificatePda,
  );

  console.log(
    "\n✅ Histórico sincronizado.",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
