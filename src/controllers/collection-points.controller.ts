import type { Request, Response } from "express";
import { collectionPointsService } from "../services/collection-points.service.js";
import {
  assignOperatorSchema,
  createCollectionPointSchema,
  nearbyPointsQuerySchema,
} from "../validators/collection-point.validators.js";
import { requiredParam } from "../utils/request-param.js";

export const collectionPointsController = {
  async create(req: Request, res: Response) {
    const input = createCollectionPointSchema.parse(req.body);
    const point = await collectionPointsService.create(input);
    res.status(201).json({ data: point });
  },

  async assignOperator(req: Request, res: Response) {
    const collectionPointId =
      requiredParam(req.params.id, "id");

    const { operatorId } =
      assignOperatorSchema.parse(req.body);

    const assignment =
      await collectionPointsService.assignOperator(
        collectionPointId,
        operatorId,
      );

    res.status(201).json({
      data: assignment,
    });
  },

  async list(_req: Request, res: Response) {
    const points =
      await collectionPointsService.list();

    res.json({
      data: points,
    });
  },

  async getById(req: Request, res: Response) {
    const point = await collectionPointsService.getById(requiredParam(req.params.id, "id"));
    res.json({ data: point });
  },

  async nearby(req: Request, res: Response) {
    const query = nearbyPointsQuerySchema.parse(req.query);
    const points = await collectionPointsService.nearby(query.lat, query.lng, query.radiusKm);
    res.json({ data: points });
  },
};
