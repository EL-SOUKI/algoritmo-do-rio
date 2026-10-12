import type {
  Request,
  Response,
} from "express";

import {
  authService,
} from "../services/auth.service.js";

import {
  loginSchema,
  registerSchema,
} from "../validators/auth.validators.js";

import type {
  AuthRequest,
} from "../middlewares/auth.js";

export const authController = {
  async register(
    req: Request,
    res: Response,
  ) {
    const input =
      registerSchema.parse(
        req.body,
      );

    const result =
      await authService.register(
        input,
      );

    res.status(201).json({
      data: result,
    });
  },

  async login(
    req: Request,
    res: Response,
  ) {
    const input =
      loginSchema.parse(
        req.body,
      );

    const result =
      await authService.login(
        input,
      );

    res.json({
      data: result,
    });
  },

  async me(
    req: Request,
    res: Response,
  ) {
    const auth =
      (req as AuthRequest).auth;

    if (!auth) {
      throw new Error(
        "Authentication context missing.",
      );
    }

    const user =
      await authService.me(
        auth.userId,
      );

    res.json({
      data: user,
    });
  },
};
