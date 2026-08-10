import { z } from "zod";

const trackedPlanDebtSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
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

export const createTrackedPlanSchema = z.object({
  debts: z.array(trackedPlanDebtSchema).min(1),
  extraMonthlyBudget: z.number().nonnegative().default(0),
  strategy: z.enum(["avalanche", "snowball"]),
});

export type CreateTrackedPlanInput = z.infer<typeof createTrackedPlanSchema>;

export const trackedPlanIdParamsSchema = z.object({
  id: z.string().uuid(),
});
