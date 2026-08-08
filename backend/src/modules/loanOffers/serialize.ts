import type { LoanOfferCheck } from "@prisma/client";

// Decimal fields come back from Prisma as Decimal.js instances — stringify them
// so precision survives JSON serialization instead of round-tripping through float.
export function serializeLoanOfferCheck(check: LoanOfferCheck) {
  return {
    ...check,
    principal: check.principal.toFixed(2),
    quotedRateAnnual: check.quotedRateAnnual.toFixed(3),
    processingFeeValue: check.processingFeeValue.toFixed(2),
    otherUpfrontFees: check.otherUpfrontFees.toFixed(2),
    prepaymentPenaltyPercent: check.prepaymentPenaltyPercent?.toFixed(2) ?? null,
    teaserRateAnnual: check.teaserRateAnnual?.toFixed(3) ?? null,
    postTeaserRateAnnual: check.postTeaserRateAnnual?.toFixed(3) ?? null,
    trueApr: check.trueApr.toFixed(2),
  };
}
