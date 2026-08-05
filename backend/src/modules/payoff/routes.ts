import type { FastifyInstance } from "fastify";
import { projectSingleDebtPayoff } from "../../lib/amortization.js";
import { simulateMultiDebtPayoff } from "../../lib/multiDebtPayoff.js";
import { payoffPlanSchema, singleDebtProjectionSchema } from "./schema.js";

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

  // Multi-debt strategy engine: pay minimums on everything, throw the extra
  // budget at whichever debt the strategy prioritizes. strategy: "both" runs
  // avalanche and snowball side by side so the tradeoff is visible directly.
  app.post("/calculators/payoff-plan", async (req, reply) => {
    const { debts, extraMonthlyBudget, strategy } = payoffPlanSchema.parse(req.body);

    if (strategy === "both") {
      const avalanche = simulateMultiDebtPayoff(debts, extraMonthlyBudget, "avalanche");
      const snowball = simulateMultiDebtPayoff(debts, extraMonthlyBudget, "snowball");
      return reply.send({
        avalanche,
        snowball,
        comparison: {
          interestSavedByAvalanche: (
            Number(snowball.totalInterestPaid) - Number(avalanche.totalInterestPaid)
          ).toFixed(2),
          monthsSavedByAvalanche: snowball.totalMonths - avalanche.totalMonths,
        },
      });
    }

    const plan = simulateMultiDebtPayoff(debts, extraMonthlyBudget, strategy);
    return reply.send(plan);
  });
}
