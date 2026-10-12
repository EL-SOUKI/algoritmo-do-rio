import type { UserRole } from "../generated/prisma/enums.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middlewares/error-handler.js";

type CreateUserInput = {
  name: string;
  email: string;
  walletAddress?: string;
  role: UserRole;
};


const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  walletAddress: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const usersService = {
  async create(input: CreateUserInput) {
    const email = input.email.toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      throw new AppError(
        409,
        "A user with this email already exists.",
      );
    }

    return prisma.user.create({
      data: {
        name: input.name,
        email,
        walletAddress: input.walletAddress,
        role: input.role,
      },
      select: publicUserSelect,
    });
  },

  async getById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: publicUserSelect,
    });

    if (!user) {
      throw new AppError(404, "User not found.");
    }

    return user;
  },
};
