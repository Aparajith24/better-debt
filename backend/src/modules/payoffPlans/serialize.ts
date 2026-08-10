import type { TrackedPayoffPlan } from "@prisma/client";

// Decimal fields come back from Prisma as Decimal.js instances — stringify
// them so precision survives JSON serialization instead of round-tripping
// through float. Json fields (payoffOrder/monthlySummary/debtNames) already
// come back as plain JS values.
export function serializeTrackedPlan(plan: TrackedPayoffPlan) {
  return {
    ...plan,
    extraMonthlyBudget: plan.extraMonthlyBudget.toFixed(2),
    totalInterestPaid: plan.totalInterestPaid.toFixed(2),
    totalPaid: plan.totalPaid.toFixed(2),
  };
}
