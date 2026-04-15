import "dotenv/config";
import express from "express";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import authRouter from "./routes/auth";
import apiRouter from "./routes/api";
import contractsRouter from "./routes/contracts";
import webhookRouter from "./routes/webhooks";

const app = express();
const PORT = process.env.PORT ?? 3001;

const allowedOrigins = [
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(cors({ origin: allowedOrigins, credentials: true }));

// Raw body capture for webhook HMAC — MUST be before express.json()
app.use("/api/webhooks/jobber", express.raw({ type: "application/json" }));

app.use(express.json());

// Rate limiting — sync and renew-all are the most expensive operations
const heavyOpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  limit: 5,                  // max 5 requests per 5 minutes per IP
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait before trying again." },
});
app.use("/api/sync", heavyOpLimiter);
app.use("/api/contracts/renew-all", heavyOpLimiter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth/jobber", authRouter);
app.use("/api", apiRouter);
app.use("/api/contracts", contractsRouter);
app.use("/api/webhooks", webhookRouter);

app.listen(PORT, () => {
  console.log(`ContractMinder backend running on port ${PORT}`);
});
