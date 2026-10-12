import type { MaterialType } from "../generated/prisma/enums.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middlewares/error-handler.js";
import { haversineKm } from "../utils/distance.js";

type CreateCollectionPointInput = {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  supportedMaterials: MaterialType[];
};

export const collectionPointsService = {
  async create(input: CreateCollectionPointInput) {
    return prisma.collectionPoint.create({ data: input });
  },

  async assignOperator(
    collectionPointId: string,
    operatorId: string,
  ) {
    const [point, operator] = await Promise.all([
      prisma.collectionPoint.findUnique({
        where: { id: collectionPointId },
      }),
      prisma.user.findUnique({
        where: { id: operatorId },
      }),
    ]);

    if (!point) {
      throw new AppError(
        404,
        "Collection point not found.",
      );
    }

    if (!operator) {
      throw new AppError(
        404,
        "Operator not found.",
      );
    }

    if (operator.role !== "OPERATOR") {
      throw new AppError(
        409,
        "User must have OPERATOR role.",
      );
    }

    const existing =
      await prisma.operatorAssignment.findUnique({
        where: {
          operatorId_collectionPointId: {
            operatorId,
            collectionPointId,
          },
        },
      });

    if (existing) {
      throw new AppError(
        409,
        "Operator is already assigned to this collection point.",
      );
    }

    return prisma.operatorAssignment.create({
      data: {
        operatorId,
        collectionPointId,
      },
      include: {
        operator: {
          select: {
            id: true,
            email: true,
            name: true,
            walletAddress: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        collectionPoint: true,
      },
    });
  },

  async list() {
    return prisma.collectionPoint.findMany({
      where: {
        status: "ACTIVE",
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  async getById(id: string) {
    const point = await prisma.collectionPoint.findUnique({ where: { id } });
    if (!point) throw new AppError(404, "Collection point not found.");
    return point;
  },

  async nearby(lat: number, lng: number, radiusKm: number) {
    const activePoints = await prisma.collectionPoint.findMany({
      where: { status: "ACTIVE" },
    });

    return activePoints
      .map((point) => ({
        ...point,
        distanceKm: Number(haversineKm(lat, lng, point.latitude, point.longitude).toFixed(2)),
      }))
      .filter((point) => point.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  },
};
