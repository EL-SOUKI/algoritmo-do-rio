import type { Request, Response } from "express";

import { campaignsService } from "../services/campaigns.service.js";

import {
  createCampaignSchema,
} from "../validators/campaign.validators.js";

import {
  requiredParam,
} from "../utils/request-param.js";

export const campaignsController = {
  async create(req: Request, res: Response) {
    const input =
      createCampaignSchema.parse(req.body);

    const campaign =
      await campaignsService.create(input);

    res.status(201).json({
      data: campaign,
    });
  },

  async list(_req: Request, res: Response) {
    const campaigns =
      await campaignsService.list();

    res.json({
      data: campaigns,
    });
  },

  async getById(req: Request, res: Response) {
    const campaign =
      await campaignsService.getById(
        requiredParam(
          req.params.id,
          "id",
        ),
      );

    res.json({
      data: campaign,
    });
  },
};
