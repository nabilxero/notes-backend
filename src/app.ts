import express from "express";
import cors from "cors";
import helmet from "helmet";
import { healthRouter } from "./routes/health";
import { authRouter } from "./routes/auth";
import { errorHandler, notFound } from "./middleware/error";

// App is built separately from server start-up so tests can import it
// without opening a port (like @SpringBootTest + MockMvc).
export function createApp(corsOrigin: string) {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: corsOrigin }));
  app.use(express.json());

  app.use("/api", healthRouter);
  app.use("/api", authRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
