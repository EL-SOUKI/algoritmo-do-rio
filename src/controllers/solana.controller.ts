import type {
  Request,
  Response,
} from "express";

import { solanaService } from "../services/solana.service.js";

export const solanaController = {
  async status(
    _req: Request,
    res: Response,
  ) {
    const status =
      await solanaService.getStatus();

    res.json({
      data: status,
    });
  },
};
