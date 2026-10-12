import bcrypt from "bcryptjs";

import {
  SignJWT,
  jwtVerify,
} from "jose";

import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";
import { AppError } from "../middlewares/error-handler.js";

type RegisterInput = {
  name: string;
  email: string;
  password: string;
  walletAddress?: string;
};

type LoginInput = {
  email: string;
  password: string;
};

const jwtSecret =
  new TextEncoder().encode(
    env.JWT_SECRET,
  );

function publicUser(user: {
  id: string;
  name: string;
  email: string;
  walletAddress: string | null;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    walletAddress:
      user.walletAddress,
    role: user.role,
    createdAt:
      user.createdAt,
    updatedAt:
      user.updatedAt,
  };
}

async function createToken(user: {
  id: string;
  email: string;
  role: string;
}) {
  return new SignJWT({
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({
      alg: "HS256",
    })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(
      env.JWT_EXPIRES_IN,
    )
    .sign(jwtSecret);
}

export const authService = {
  async register(
    input: RegisterInput,
  ) {
    const email =
      input.email.toLowerCase();

    const existingEmail =
      await prisma.user.findUnique({
        where: {
          email,
        },
      });

    if (existingEmail) {
      throw new AppError(
        409,
        "A user with this email already exists.",
      );
    }

    if (input.walletAddress) {
      const existingWallet =
        await prisma.user.findUnique({
          where: {
            walletAddress:
              input.walletAddress,
          },
        });

      if (existingWallet) {
        throw new AppError(
          409,
          "This wallet is already associated with another user.",
        );
      }
    }

    const passwordHash =
      await bcrypt.hash(
        input.password,
        12,
      );

    const user =
      await prisma.user.create({
        data: {
          name: input.name,
          email,
          walletAddress:
            input.walletAddress,
          passwordHash,
          role: "USER",
        },
      });

    const token =
      await createToken(user);

    return {
      user: publicUser(user),
      token,
    };
  },

  async login(input: LoginInput) {
    const email =
      input.email.toLowerCase();

    const user =
      await prisma.user.findUnique({
        where: {
          email,
        },
      });

    if (
      !user ||
      !user.passwordHash
    ) {
      throw new AppError(
        401,
        "Invalid email or password.",
      );
    }

    const validPassword =
      await bcrypt.compare(
        input.password,
        user.passwordHash,
      );

    if (!validPassword) {
      throw new AppError(
        401,
        "Invalid email or password.",
      );
    }

    const token =
      await createToken(user);

    return {
      user: publicUser(user),
      token,
    };
  },

  async verifyToken(
    token: string,
  ) {
    try {
      const { payload } =
        await jwtVerify(
          token,
          jwtSecret,
          {
            algorithms: [
              "HS256",
            ],
          },
        );

      if (!payload.sub) {
        throw new Error(
          "JWT subject missing.",
        );
      }

      return {
        userId: payload.sub,
        email:
          typeof payload.email ===
          "string"
            ? payload.email
            : "",
        role:
          typeof payload.role ===
          "string"
            ? payload.role
            : "",
      };
    } catch {
      throw new AppError(
        401,
        "Invalid or expired token.",
      );
    }
  },

  async me(userId: string) {
    const user =
      await prisma.user.findUnique({
        where: {
          id: userId,
        },
      });

    if (!user) {
      throw new AppError(
        404,
        "User not found.",
      );
    }

    return publicUser(user);
  },
};
