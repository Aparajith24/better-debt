import type { Debt } from "@prisma/client";

// Decimal fields come back from Prisma as Decimal.js instances — stringify them
// so precision survives JSON serialization instead of round-tripping through float.
export function serializeDebt(debt: Debt) {
  return {
    ...debt,
    principal: debt.principal?.toFixed(2) ?? null,
    currentBalance: debt.currentBalance.toFixed(2),
    interestRateAnnual: debt.interestRateAnnual.toFixed(3),
    minPayment: debt.minPayment?.toFixed(2) ?? null,
  };
}
