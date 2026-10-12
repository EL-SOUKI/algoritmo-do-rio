import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { apiRouter } from "./routes/index.js";
import { errorHandler, notFoundHandler } from "./middlewares/error-handler.js";

export const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(",").map((v) => v.trim()),
    credentials: true,
  }),
);
app.use(express.json({ limit: "256kb" }));

app.use("/api/v1", apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);
