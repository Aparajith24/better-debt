import { z } from "zod";
import { debtTypeSchema, rateTypeSchema } from "../debts/schema.js";

export const loanOfferTermsSchema = z.object({
  lenderName: z.string().max(120).optional(),
  loanType: debtTypeSchema.default("OTHER"),
  principal: z.number().positive(),
  tenureMonths: z.number().int().positive(),
  rateType: rateTypeSchema.default("REDUCING"),
  quotedRateAnnual: z.number().nonnegative().max(100),
  processingFeeValue: z.number().nonnegative(),
  otherUpfrontFees: z.number().nonnegative().default(0),
  prepaymentPenaltyPercent: z.number().nonnegative().max(100).optional(),
  teaserRateAnnual: z.number().nonnegative().max(100).optional(),
  teaserMonths: z.number().int().positive().optional(),
  postTeaserRateAnnual: z.number().nonnegative().max(100).optional(),
});

export type LoanOfferTermsInput = z.infer<typeof loanOfferTermsSchema>;
