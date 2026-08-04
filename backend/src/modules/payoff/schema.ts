import { z } from "zod";

export const singleDebtProjectionSchema = z.object({
  balance: z.number().positive(),
  interestRateAnnual: z.number().nonnegative().max(100),
  monthlyPayment: z.number().positive(),
});

export type SingleDebtProjectionInput = z.infer<typeof singleDebtProjectionSchema>;
