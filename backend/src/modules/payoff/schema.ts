import { z } from "zod";

export const singleDebtProjectionSchema = z.object({
  balance: z.number().positive(),
  interestRateAnnual: z.number().nonnegative().max(100),
  monthlyPayment: z.number().positive(),
});

export type SingleDebtProjectionInput = z.infer<typeof singleDebtProjectionSchema>;

const payoffPlanDebtSchema = z.object({
  id: z.string().min(1),
  balance: z.number().positive(),
  interestRateAnnual: z.number().nonnegative().max(100),
  minPayment: z.number().nonnegative(),
});

export const payoffPlanSchema = z.object({
  debts: z.array(payoffPlanDebtSchema).min(1),
  extraMonthlyBudget: z.number().nonnegative().default(0),
  strategy: z.enum(["avalanche", "snowball", "both"]).default("both"),
});

export type PayoffPlanInput = z.infer<typeof payoffPlanSchema>;
