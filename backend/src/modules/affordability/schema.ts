import { z } from "zod";

export const affordabilityCheckSchema = z.object({
  monthlyIncome: z.number().positive(),
  existingMonthlyDebtPayments: z.number().nonnegative(),
  desiredPrincipal: z.number().positive(),
  desiredTenureMonths: z.number().int().positive(),
  proposedRateAnnual: z.number().nonnegative().max(100).optional(),
});

export type AffordabilityCheckInput = z.infer<typeof affordabilityCheckSchema>;
