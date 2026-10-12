import type {
  Request,
  Response,
} from "express";

import {
  impactService,
} from "../services/impact.service.js";

import {
  requiredParam,
} from "../utils/request-param.js";
import type {
  AuthRequest,
} from "../middlewares/auth.js";

import {
  AppError,
} from "../middlewares/error-handler.js";

export const impactController = {
  async getMyImpact(
    req: Request,
    res: Response,
  ) {
    const auth =
      (req as AuthRequest).auth;

    if (!auth) {
      throw new AppError(
        401,
        "Authentication required.",
      );
    }

    const impact =
      await impactService
        .getRecyclerImpact(
          auth.userId,
        );

    res.json({
      data: impact,
    });
  },

  async getRecyclerImpact(
    req: Request,
    res: Response,
  ) {
    const recyclerId =
      requiredParam(
        req.params.recyclerId,
        "recyclerId",
      );

    const impact =
      await impactService.getRecyclerImpact(
        recyclerId,
      );

    res.json({
      data: impact,
    });
  },
};
