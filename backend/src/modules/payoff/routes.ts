import type { FastifyInstance } from "fastify";
import { projectSingleDebtPayoff } from "../../lib/amortization.js";
import { simulateMultiDebtPayoff } from "../../lib/multiDebtPayoff.js";
import { normalizeFlatRateToAPR, resolveEffectiveAnnualRate } from "../../lib/rateNormalization.js";
import { normalizeFlatRateSchema, payoffPlanSchema, singleDebtProjectionSchema } from "./schema.js";

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

    // Normalize any FLAT-rate debts to their equivalent reducing-balance APR
    // before simulating — the engine itself only ever deals in reducing-balance
    // rates, same as if every debt had been REDUCING to begin with.
    const normalizedDebts = debts.map((d) => ({
      id: d.id,
      balance: d.balance,
      minPayment: d.minPayment,
      interestRateAnnual: resolveEffectiveAnnualRate(d),
    }));
    const ratesUsed = debts.map((d, i) => ({
      id: d.id,
      rateType: d.rateType,
      quotedRateAnnual: d.interestRateAnnual,
      effectiveRateAnnual: normalizedDebts[i].interestRateAnnual,
    }));

    if (strategy === "both") {
      const avalanche = simulateMultiDebtPayoff(normalizedDebts, extraMonthlyBudget, "avalanche");
      const snowball = simulateMultiDebtPayoff(normalizedDebts, extraMonthlyBudget, "snowball");
      return reply.send({
        ratesUsed,
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

    const plan = simulateMultiDebtPayoff(normalizedDebts, extraMonthlyBudget, strategy);
    return reply.send({ ratesUsed, ...plan });
  });

  // Converts a flat-rate loan (interest charged on original principal for the
  // whole tenure, e.g. many consumer-durable EMIs) into the reducing-balance
  // APR it's actually equivalent to, so it can be compared against a credit
  // card or any other reducing-balance debt on equal footing.
  app.post("/calculators/normalize-flat-rate", async (req, reply) => {
    const { principal, flatRateAnnual, tenureMonths } = normalizeFlatRateSchema.parse(req.body);
    const result = normalizeFlatRateToAPR(principal, flatRateAnnual, tenureMonths);
    return reply.send(result);
  });
}
