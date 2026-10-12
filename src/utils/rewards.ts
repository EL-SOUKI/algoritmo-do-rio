import type { MaterialType } from "../generated/prisma/enums.js";

const POINTS_PER_KG: Record<MaterialType, number> = {
  PET_PLASTIC: 10,
  OTHER_PLASTIC: 8,
  ALUMINUM: 18,
  GLASS: 6,
  PAPER: 5,
  CARDBOARD: 5,
  ELECTRONICS: 25,
};

export function calculateRewardPoints(materialType: MaterialType, weightGrams: number): number {
  const kilograms = weightGrams / 1000;
  return Math.max(1, Math.round(kilograms * POINTS_PER_KG[materialType]));
}
