import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  authService,
} from "../services/auth.service.js";
import { AppError } from "./error-handler.js";

export type AuthRequest =
  Request & {
    auth?: {
      userId: string;
      email: string;
      role: string;
    };
  };

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    const authorization =
      req.headers.authorization;

    if (
      !authorization ||
      !authorization.startsWith(
        "Bearer ",
      )
    ) {
      throw new AppError(
        401,
        "Authentication required.",
      );
    }

    const token =
      authorization
        .slice(7)
        .trim();

    if (!token) {
      throw new AppError(
        401,
        "Authentication required.",
      );
    }

    const auth =
      await authService
        .verifyToken(token);

    (
      req as AuthRequest
    ).auth = auth;

    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(
  ...allowedRoles: string[]
) {
  return (
    req: Request,
    _res: Response,
    next: NextFunction,
  ) => {
    try {
      const auth = (req as AuthRequest).auth;

      if (!auth) {
        throw new AppError(
          401,
          "Authentication required.",
        );
      }

      if (!allowedRoles.includes(auth.role)) {
        throw new AppError(
          403,
          "You do not have permission to perform this action.",
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
