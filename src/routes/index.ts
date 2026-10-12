import { Router } from "express";
import { authController } from "../controllers/auth.controller.js";
import {
  requireAuth,
  requireRole,
} from "../middlewares/auth.js";
import { collectionPointsController } from "../controllers/collection-points.controller.js";
import { recyclingController } from "../controllers/recycling.controller.js";
import { usersController } from "../controllers/users.controller.js";
import { solanaController } from "../controllers/solana.controller.js";
import { certificatesController } from "../controllers/certificates.controller.js";
import { impactController } from "../controllers/impact.controller.js";
import { campaignsController } from "../controllers/campaigns.controller.js";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "recychain-api" });
});

apiRouter.post(
  "/auth/register",
  authController.register,
);

apiRouter.post(
  "/auth/login",
  authController.login,
);

apiRouter.get(
  "/auth/me",
  requireAuth,
  authController.me,
);


apiRouter.get(
  "/me/impact",
  requireAuth,
  impactController.getMyImpact,
);

apiRouter.get(
  "/me/recycling-events",
  requireAuth,
  recyclingController.listMine,
);

apiRouter.post(
  "/me/recycling-events",
  requireAuth,
  requireRole("USER"),
  recyclingController.createMine,
);

apiRouter.get(
  "/operator/pending-events",
  requireAuth,
  requireRole("OPERATOR", "ADMIN"),
  recyclingController.listPendingMine,
);

apiRouter.post(
  "/operator/recycling-events/:id/verify",
  requireAuth,
  requireRole("OPERATOR", "ADMIN"),
  recyclingController.verifyAsOperator,
);

apiRouter.post(
  "/operator/recycling-events/:id/reject",
  requireAuth,
  requireRole("OPERATOR", "ADMIN"),
  recyclingController.rejectAsOperator,
);

apiRouter.post(
  "/operator/recycling-events/:id/record-onchain",
  requireAuth,
  requireRole("OPERATOR", "ADMIN"),
  recyclingController.recordOnchainAsOperator,
);

apiRouter.get(
  "/solana/status",
  solanaController.status,
);

apiRouter.get(
  "/company/summary",
  requireAuth,
  requireRole("COMPANY", "ADMIN"),
  certificatesController.companySummary,
);

apiRouter.get(
  "/company/certificates",
  requireAuth,
  requireRole("COMPANY", "ADMIN"),
  certificatesController.listMine,
);

apiRouter.post(
  "/company/certificates/burn",
  requireAuth,
  requireRole("COMPANY", "ADMIN"),
  certificatesController.burn,
);

apiRouter.get(
  "/certificates",
  certificatesController.list,
);

apiRouter.post(
  "/certificates/burn",
  requireAuth,
  requireRole("COMPANY", "ADMIN"),
  certificatesController.burn,
);

apiRouter.post("/users", usersController.create);
apiRouter.get("/users/:id", usersController.getById);

apiRouter.post("/collection-points", collectionPointsController.create);
apiRouter.get("/collection-points", collectionPointsController.list);
apiRouter.post(
  "/collection-points/:id/operators",
  collectionPointsController.assignOperator,
);
apiRouter.get("/collection-points/nearby", collectionPointsController.nearby);
apiRouter.get("/collection-points/:id", collectionPointsController.getById);


apiRouter.post("/campaigns", campaignsController.create);
apiRouter.get("/campaigns", campaignsController.list);
apiRouter.get("/campaigns/:id", campaignsController.getById);

apiRouter.post("/recycling-events", recyclingController.create);
apiRouter.get("/recycling-events/:id", recyclingController.getById);
apiRouter.get("/recyclers/:recyclerId/events", recyclingController.listByRecycler);

apiRouter.get(
  "/operators/:operatorId/pending-events",
  recyclingController.listPendingForOperator,
);


apiRouter.get(
  "/recyclers/:recyclerId/impact",
  impactController.getRecyclerImpact,
);

apiRouter.post("/recycling-events/:id/verify", recyclingController.verify);
apiRouter.post("/recycling-events/:id/reject", recyclingController.reject);
apiRouter.post("/recycling-events/:id/record-onchain", recyclingController.recordOnchain);
