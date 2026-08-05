import { z } from "zod";

export const debtTypeSchema = z.enum(["CREDIT_CARD", "PERSONAL_LOAN", "EMI", "BNPL", "OTHER"]);
export const rateTypeSchema = z.enum(["FLAT", "REDUCING"]);

const baseDebtSchema = z.object({
  name: z.string().min(1).max(120),
  type: debtTypeSchema,
  principal: z.number().positive().optional(),
  currentBalance: z.number().nonnegative(),
  rateType: rateTypeSchema.default("REDUCING"),
  interestRateAnnual: z.number().nonnegative().max(100),
  minPayment: z.number().nonnegative().optional(),
  dueDay: z.number().int().min(1).max(31).optional(),
  tenureMonths: z.number().int().positive().optional(),
  startDate: z.coerce.date().optional(),
});

// A flat rate can't be normalized to an equivalent reducing-balance APR
// without knowing the principal and tenure — require them together.
export const createDebtSchema = baseDebtSchema.refine(
  (d) => d.rateType !== "FLAT" || (d.principal !== undefined && d.tenureMonths !== undefined),
  {
    message: "principal and tenureMonths are required when rateType is FLAT",
    path: ["rateType"],
  },
);

export const updateDebtSchema = baseDebtSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const debtIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export type CreateDebtInput = z.infer<typeof createDebtSchema>;
export type UpdateDebtInput = z.infer<typeof updateDebtSchema>;
