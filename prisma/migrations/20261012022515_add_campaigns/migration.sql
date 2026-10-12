-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'OPERATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "CollectionPointStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "MaterialType" AS ENUM ('PET_PLASTIC', 'OTHER_PLASTIC', 'ALUMINUM', 'GLASS', 'PAPER', 'CARDBOARD', 'ELECTRONICS');

-- CreateEnum
CREATE TYPE "RecyclingStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'RECORDED_ONCHAIN', 'ONCHAIN_FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "walletAddress" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionPoint" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "supportedMaterials" "MaterialType"[],
    "status" "CollectionPointStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperatorAssignment" (
    "id" UUID NOT NULL,
    "operatorId" UUID NOT NULL,
    "collectionPointId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperatorAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "materialType" "MaterialType" NOT NULL,
    "rewardRecPerKg" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecyclingEvent" (
    "id" UUID NOT NULL,
    "publicId" TEXT NOT NULL,
    "recyclerId" UUID NOT NULL,
    "collectionPointId" UUID NOT NULL,
    "campaignId" UUID,
    "operatorId" UUID,
    "materialType" "MaterialType" NOT NULL,
    "weightGrams" INTEGER NOT NULL,
    "status" "RecyclingStatus" NOT NULL DEFAULT 'PENDING',
    "rewardPoints" INTEGER NOT NULL DEFAULT 0,
    "proofHash" TEXT,
    "solanaSignature" TEXT,
    "rejectionReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),
    "recordedOnchainAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecyclingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_walletAddress_key" ON "User"("walletAddress");

-- CreateIndex
CREATE INDEX "CollectionPoint_status_idx" ON "CollectionPoint"("status");

-- CreateIndex
CREATE INDEX "OperatorAssignment_collectionPointId_idx" ON "OperatorAssignment"("collectionPointId");

-- CreateIndex
CREATE UNIQUE INDEX "OperatorAssignment_operatorId_collectionPointId_key" ON "OperatorAssignment"("operatorId", "collectionPointId");

-- CreateIndex
CREATE INDEX "Campaign_active_startsAt_endsAt_idx" ON "Campaign"("active", "startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "RecyclingEvent_publicId_key" ON "RecyclingEvent"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "RecyclingEvent_proofHash_key" ON "RecyclingEvent"("proofHash");

-- CreateIndex
CREATE UNIQUE INDEX "RecyclingEvent_solanaSignature_key" ON "RecyclingEvent"("solanaSignature");

-- CreateIndex
CREATE INDEX "RecyclingEvent_recyclerId_createdAt_idx" ON "RecyclingEvent"("recyclerId", "createdAt");

-- CreateIndex
CREATE INDEX "RecyclingEvent_collectionPointId_createdAt_idx" ON "RecyclingEvent"("collectionPointId", "createdAt");

-- CreateIndex
CREATE INDEX "RecyclingEvent_campaignId_createdAt_idx" ON "RecyclingEvent"("campaignId", "createdAt");

-- CreateIndex
CREATE INDEX "RecyclingEvent_status_idx" ON "RecyclingEvent"("status");

-- AddForeignKey
ALTER TABLE "OperatorAssignment" ADD CONSTRAINT "OperatorAssignment_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatorAssignment" ADD CONSTRAINT "OperatorAssignment_collectionPointId_fkey" FOREIGN KEY ("collectionPointId") REFERENCES "CollectionPoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecyclingEvent" ADD CONSTRAINT "RecyclingEvent_recyclerId_fkey" FOREIGN KEY ("recyclerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecyclingEvent" ADD CONSTRAINT "RecyclingEvent_collectionPointId_fkey" FOREIGN KEY ("collectionPointId") REFERENCES "CollectionPoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecyclingEvent" ADD CONSTRAINT "RecyclingEvent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecyclingEvent" ADD CONSTRAINT "RecyclingEvent_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
