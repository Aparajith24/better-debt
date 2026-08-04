import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { ZodError } from "zod";
import { debtRoutes } from "./modules/debts/routes.js";
import { payoffRoutes } from "./modules/payoff/routes.js";

const app = Fastify({
  logger: {
    transport: { target: "pino-pretty" },
  },
});

await app.register(cors, { origin: true });

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

const port = Number(process.env.PORT ?? 3001);
app.listen({ port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
