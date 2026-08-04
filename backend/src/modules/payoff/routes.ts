import type { FastifyInstance } from "fastify";
import { projectSingleDebtPayoff } from "../../lib/amortization.js";
import { singleDebtProjectionSchema } from "./schema.js";

export async function payoffRoutes(app: FastifyInstance) {
  // Single-debt projection: no strategy/ordering across debts yet — just
  // "how long to clear this one balance at a fixed monthly payment."
  app.post("/calculators/single-debt-projection", async (req, reply) => {
    const { balance, interestRateAnnual, monthlyPayment } = singleDebtProjectionSchema.parse(
      req.body,
    );
    const projection = projectSingleDebtPayoff(balance, interestRateAnnual, monthlyPayment);
    return reply.send(projection);
  });
}
