import type {
  Request,
  Response,
} from "express";

import {
  recyclingService,
} from "../services/recycling.service.js";

import {
  createRecyclingEventSchema,
  rejectRecyclingEventSchema,
  verifyRecyclingEventSchema,
} from "../validators/recycling.validators.js";

import {
  requiredParam,
} from "../utils/request-param.js";

import type {
  AuthRequest,
} from "../middlewares/auth.js";

import {
  AppError,
} from "../middlewares/error-handler.js";

function getAuth(req: Request) {
  const auth =
    (req as AuthRequest).auth;

  if (!auth) {
    throw new AppError(
      401,
      "Authentication required.",
    );
  }

  return auth;
}

export const recyclingController = {
  async create(
    req: Request,
    res: Response,
  ) {
    const input =
      createRecyclingEventSchema.parse(
        req.body,
      );

    const event =
      await recyclingService.create(
        input,
      );

    res.status(201).json({
      data: event,
    });
  },

  async createMine(
    req: Request,
    res: Response,
  ) {
    const auth = getAuth(req);

    const input =
      createRecyclingEventSchema.parse({
        ...req.body,
        recyclerId: auth.userId,
      });

    const event =
      await recyclingService.create(
        input,
      );

    res.status(201).json({
      data: event,
    });
  },

  async getById(
    req: Request,
    res: Response,
  ) {
    const event =
      await recyclingService.getById(
        requiredParam(
          req.params.id,
          "id",
        ),
      );

    res.json({
      data: event,
    });
  },

  async listPendingForOperator(
    req: Request,
    res: Response,
  ) {
    const operatorId =
      requiredParam(
        req.params.operatorId,
        "operatorId",
      );

    const events =
      await recyclingService
        .listPendingForOperator(
          operatorId,
        );

    res.json({
      data: events,
    });
  },

  async listPendingMine(
    req: Request,
    res: Response,
  ) {
    const auth = getAuth(req);

    const events =
      await recyclingService
        .listPendingForOperator(
          auth.userId,
        );

    res.json({
      data: events,
    });
  },

  async listByRecycler(
    req: Request,
    res: Response,
  ) {
    const events =
      await recyclingService
        .listByRecycler(
          requiredParam(
            req.params.recyclerId,
            "recyclerId",
          ),
        );

    res.json({
      data: events,
    });
  },

  async listMine(
    req: Request,
    res: Response,
  ) {
    const auth = getAuth(req);

    const events =
      await recyclingService
        .listByRecycler(
          auth.userId,
        );

    res.json({
      data: events,
    });
  },

  async verify(
    req: Request,
    res: Response,
  ) {
    const { operatorId } =
      verifyRecyclingEventSchema.parse(
        req.body,
      );

    const event =
      await recyclingService.verify(
        requiredParam(
          req.params.id,
          "id",
        ),
        operatorId,
      );

    res.json({
      data: event,
    });
  },

  async verifyAsOperator(
    req: Request,
    res: Response,
  ) {
    const auth = getAuth(req);

    const event =
      await recyclingService.verify(
        requiredParam(
          req.params.id,
          "id",
        ),
        auth.userId,
      );

    res.json({
      data: event,
    });
  },

  async reject(
    req: Request,
    res: Response,
  ) {
    const {
      operatorId,
      reason,
    } =
      rejectRecyclingEventSchema.parse(
        req.body,
      );

    const event =
      await recyclingService.reject(
        requiredParam(
          req.params.id,
          "id",
        ),
        operatorId,
        reason,
      );

    res.json({
      data: event,
    });
  },

  async rejectAsOperator(
    req: Request,
    res: Response,
  ) {
    const auth = getAuth(req);

    const parsed =
      rejectRecyclingEventSchema.parse({
        ...req.body,
        operatorId:
          auth.userId,
      });

    const event =
      await recyclingService.reject(
        requiredParam(
          req.params.id,
          "id",
        ),
        auth.userId,
        parsed.reason,
      );

    res.json({
      data: event,
    });
  },

  async recordOnchain(
    req: Request,
    res: Response,
  ) {
    const result =
      await recyclingService
        .recordOnchain(
          requiredParam(
            req.params.id,
            "id",
          ),
        );

    res.json({
      data: result,
    });
  },

  async recordOnchainAsOperator(
    req: Request,
    res: Response,
  ) {
    const auth = getAuth(req);

    const id =
      requiredParam(
        req.params.id,
        "id",
      );

    const event =
      await recyclingService
        .getById(id);

    if (
      auth.role !== "ADMIN" &&
      event.operatorId !==
        auth.userId
    ) {
      throw new AppError(
        403,
        "This recycling event was not verified by this operator.",
      );
    }

    const result =
      await recyclingService
        .recordOnchain(id);

    res.json({
      data: result,
    });
  },
};
