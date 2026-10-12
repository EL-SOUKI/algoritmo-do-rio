import type { Request, Response } from "express";
import { usersService } from "../services/users.service.js";
import { createUserSchema } from "../validators/user.validators.js";
import { requiredParam } from "../utils/request-param.js";

export const usersController = {
  async create(req: Request, res: Response) {
    const input = createUserSchema.parse(req.body);
    const user = await usersService.create(input);
    res.status(201).json({ data: user });
  },

  async getById(req: Request, res: Response) {
    const user = await usersService.getById(requiredParam(req.params.id, "id"));
    res.json({ data: user });
  },
};
