import { z } from "zod";

export const debtTypeSchema = z.enum(["CREDIT_CARD", "PERSONAL_LOAN", "EMI", "BNPL", "OTHER"]);

export const createDebtSchema = z.object({
  name: z.string().min(1).max(120),
  type: debtTypeSchema,
  principal: z.number().positive().optional(),
  currentBalance: z.number().nonnegative(),
  interestRateAnnual: z.number().nonnegative().max(100),
  minPayment: z.number().nonnegative().optional(),
  dueDay: z.number().int().min(1).max(31).optional(),
  tenureMonths: z.number().int().positive().optional(),
  startDate: z.coerce.date().optional(),
});

export const updateDebtSchema = createDebtSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const debtIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export type CreateDebtInput = z.infer<typeof createDebtSchema>;
export type UpdateDebtInput = z.infer<typeof updateDebtSchema>;
