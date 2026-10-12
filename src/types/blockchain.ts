export type RecyclingProofInput = {
  eventId: string;
  publicId: string;
  recyclerId: string;
  recyclerWalletAddress: string;
  collectionPointId: string;
  collectionPointMaterials: string[];
  campaignId: string;
  campaignMaterialType: string;
  campaignRewardRecPerKg: number;
  campaignStartsAt: string;
  campaignEndsAt: string;
  operatorId: string;
  materialType: string;
  weightGrams: number;
  rewardPoints: number;
  proofHash: string;
  verifiedAt: string;
};

export type BlockchainRecordResult = {
  signature: string;
  network: "mock" | "localnet" | "devnet";
};

export interface BlockchainGateway {
  recordRecyclingProof(
    input: RecyclingProofInput,
  ): Promise<BlockchainRecordResult>;

  burnForCertificate(
    input: BurnCertificateInput,
  ): Promise<BurnCertificateResult>;
}

export type BurnCertificateInput = {
  campaignId: string;
  recAmount: number;
  companyKeypairPath: string;
};

export type BurnCertificateResult = {
  signature: string;
  network: "mock" | "localnet" | "devnet";
  certificateId: string;
  certificateAddress: string;
  companyWallet: string;
  recBurned: number;
  retiredWeightGrams: number;
  createdOnchainAt: string;
};
