import { z } from "zod";

export const singleDebtProjectionSchema = z.object({
  balance: z.number().positive(),
  interestRateAnnual: z.number().nonnegative().max(100),
  monthlyPayment: z.number().positive(),
});

export type SingleDebtProjectionInput = z.infer<typeof singleDebtProjectionSchema>;

const payoffPlanDebtSchema = z
  .object({
    id: z.string().min(1),
    balance: z.number().positive(),
    rateType: z.enum(["FLAT", "REDUCING"]).default("REDUCING"),
    interestRateAnnual: z.number().nonnegative().max(100),
    minPayment: z.number().nonnegative(),
    // Only needed to normalize a FLAT rate — original principal and full
    // tenure, not the currently outstanding balance/remaining months.
    principal: z.number().positive().optional(),
    tenureMonths: z.number().int().positive().optional(),
  })
  .refine(
    (d) => d.rateType !== "FLAT" || (d.principal !== undefined && d.tenureMonths !== undefined),
    {
      message: "principal and tenureMonths are required when rateType is FLAT",
      path: ["rateType"],
    },
  );

export const payoffPlanSchema = z.object({
  debts: z.array(payoffPlanDebtSchema).min(1),
  extraMonthlyBudget: z.number().nonnegative().default(0),
  strategy: z.enum(["avalanche", "snowball", "both"]).default("both"),
});

export type PayoffPlanInput = z.infer<typeof payoffPlanSchema>;

export const normalizeFlatRateSchema = z.object({
  principal: z.number().positive(),
  flatRateAnnual: z.number().nonnegative().max(100),
  tenureMonths: z.number().int().positive(),
});

export type NormalizeFlatRateInput = z.infer<typeof normalizeFlatRateSchema>;

export const creditCardProjectionSchema = z.object({
  currentBalance: z.number().positive(),
  interestRateAnnual: z.number().nonnegative().max(100),
  monthlyPayment: z.number().positive(),
  monthlyNewSpend: z.number().nonnegative().default(0),
});

export type CreditCardProjectionInput = z.infer<typeof creditCardProjectionSchema>;
