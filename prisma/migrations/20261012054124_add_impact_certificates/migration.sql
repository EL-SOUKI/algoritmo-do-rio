-- CreateTable
CREATE TABLE "ImpactCertificate" (
    "id" UUID NOT NULL,
    "certificateId" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "companyWallet" TEXT NOT NULL,
    "recBurned" INTEGER NOT NULL,
    "retiredWeightGrams" INTEGER NOT NULL,
    "certificatePda" TEXT NOT NULL,
    "solanaSignature" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "createdOnchainAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImpactCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ImpactCertificate_certificateId_key" ON "ImpactCertificate"("certificateId");

-- CreateIndex
CREATE UNIQUE INDEX "ImpactCertificate_certificatePda_key" ON "ImpactCertificate"("certificatePda");

-- CreateIndex
CREATE UNIQUE INDEX "ImpactCertificate_solanaSignature_key" ON "ImpactCertificate"("solanaSignature");

-- CreateIndex
CREATE INDEX "ImpactCertificate_campaignId_createdAt_idx" ON "ImpactCertificate"("campaignId", "createdAt");

-- CreateIndex
CREATE INDEX "ImpactCertificate_companyWallet_createdAt_idx" ON "ImpactCertificate"("companyWallet", "createdAt");

-- AddForeignKey
ALTER TABLE "ImpactCertificate" ADD CONSTRAINT "ImpactCertificate_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
