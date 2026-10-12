import type {
  Request,
  Response,
} from "express";

import type {
  AuthRequest,
} from "../middlewares/auth.js";

import {
  AppError,
} from "../middlewares/error-handler.js";

import {
  certificatesService,
} from "../services/certificates.service.js";

import {
  companyService,
} from "../services/company.service.js";

import {
  burnCertificateSchema,
  listCertificatesQuerySchema,
} from "../validators/certificate.validators.js";

function authenticatedUserId(
  req: Request,
) {
  const auth =
    (req as AuthRequest).auth;

  if (!auth) {
    throw new AppError(
      401,
      "Authentication required.",
    );
  }

  return auth.userId;
}

export const certificatesController = {
  async list(
    req: Request,
    res: Response,
  ) {
    const query =
      listCertificatesQuerySchema
        .parse(req.query);

    const certificates =
      await certificatesService.list(
        query.companyWallet,
      );

    res.json({
      data: certificates,
    });
  },

  async companySummary(
    req: Request,
    res: Response,
  ) {
    const userId =
      authenticatedUserId(req);

    const summary =
      await companyService
        .getSummary(userId);

    res.json({
      data: summary,
    });
  },

  async listMine(
    req: Request,
    res: Response,
  ) {
    const userId =
      authenticatedUserId(req);

    const company =
      await companyService
        .getCompany(userId);

    const certificates =
      await certificatesService.list(
        company.walletAddress,
      );

    res.json({
      data: certificates,
    });
  },

  async burn(
    req: Request,
    res: Response,
  ) {
    const userId =
      authenticatedUserId(req);

    const company =
      await companyService
        .getCompany(userId);

    const input =
      burnCertificateSchema.parse(
        req.body,
      );

    const result =
      await certificatesService.burn(
        input.campaignId,
        input.recAmount,
        company.walletAddress,
      );

    res.status(201).json({
      data: result,
    });
  },
};
