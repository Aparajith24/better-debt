import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { ZodError } from "zod";
import { affordabilityRoutes } from "./modules/affordability/routes.js";
import { debtRoutes } from "./modules/debts/routes.js";
import { loanOfferRoutes } from "./modules/loanOffers/routes.js";
import { payoffRoutes } from "./modules/payoff/routes.js";
import { payoffPlanRoutes } from "./modules/payoffPlans/routes.js";

const app = Fastify({
  logger: {
    transport: { target: "pino-pretty" },
  },
});

await app.register(cors, {
  origin: true,
  methods: ["GET", "POST", "PATCH", "DELETE"],
});

await app.register(multipart, {
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB — plenty for a text-based loan offer PDF
});

app.setErrorHandler((err, req, reply) => {
  if (err instanceof ZodError) {
    return reply.status(400).send({ error: "Validation failed", issues: err.issues });
  }
  req.log.error(err);
  return reply.status(500).send({ error: "Internal server error" });
});

app.get("/health", async () => ({ ok: true }));

await app.register(debtRoutes);
await app.register(payoffRoutes);
await app.register(loanOfferRoutes);
await app.register(affordabilityRoutes);
await app.register(payoffPlanRoutes);

const port = Number(process.env.PORT ?? 3001);
app.listen({ port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
