import { Decimal } from "decimal.js";
import { flatRateEMI, reducingBalanceEMI } from "./rateNormalization.js";

export interface LoanOfferTerms {
  principal: number;
  tenureMonths: number;
  rateType: "FLAT" | "REDUCING";
  quotedRateAnnual: number;
  processingFeeValue: number; // flat amount, already resolved from % if quoted that way
  otherUpfrontFees: number;
  prepaymentPenaltyPercent?: number;
  teaserRateAnnual?: number;
  teaserMonths?: number;
  postTeaserRateAnnual?: number;
}

export type Tier = "GREAT" | "FAIR" | "HIGH_COST" | "PREDATORY";

export interface TrueCostResult {
  baseEmi: string;
  totalUpfrontFees: string;
  totalRepayment: string;
  trueApr: string;
  tier: Tier;
  redFlags: string[];
}

// Same bisection idea as rateNormalization.ts's solveMonthlyRateForEMI:
// reducingBalanceEMI is strictly increasing in the rate, so search for the
// monthly rate whose EMI reproduces the target monthly repayment.
function solveMonthlyRateForTarget(principal: number, targetMonthly: number, tenureMonths: number): number {
  let lo = 0;
  let hi = 2;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const emi = reducingBalanceEMI(principal, mid, tenureMonths);
    if (emi > targetMonthly) {
      hi = mid;
    } else {
      lo = mid;
    }
  }
  return (lo + hi) / 2;
}

// Folds every upfront fee into one comparable number: the reducing-balance
// APR that would produce the same total amount paid, if the loan had no fees
// at all — the same "fold a fee into an effective rate" technique
// balanceTransfer.ts uses for a transfer fee, generalized to any upfront fee.
export function computeTrueAPR(terms: LoanOfferTerms): { baseEmi: string; totalUpfrontFees: string; totalRepayment: string; trueApr: string } {
  const baseEmi =
    terms.rateType === "FLAT"
      ? flatRateEMI(terms.principal, terms.quotedRateAnnual, terms.tenureMonths)
      : reducingBalanceEMI(terms.principal, terms.quotedRateAnnual / 100 / 12, terms.tenureMonths);

  const totalUpfrontFees = new Decimal(terms.processingFeeValue).plus(terms.otherUpfrontFees);
  const totalRepayment = new Decimal(baseEmi).mul(terms.tenureMonths).plus(totalUpfrontFees);
  const targetMonthly = totalRepayment.div(terms.tenureMonths).toNumber();

  const monthlyRate = solveMonthlyRateForTarget(terms.principal, targetMonthly, terms.tenureMonths);
  const trueApr = monthlyRate * 12 * 100;

  return {
    baseEmi: new Decimal(baseEmi).toFixed(2),
    totalUpfrontFees: totalUpfrontFees.toFixed(2),
    totalRepayment: totalRepayment.toFixed(2),
    trueApr: trueApr.toFixed(2),
  };
}

export function tierFor(trueApr: number): Tier {
  if (trueApr <= 15) return "GREAT";
  if (trueApr <= 24) return "FAIR";
  if (trueApr <= 35) return "HIGH_COST";
  return "PREDATORY";
}

// Deterministic — never asks an LLM to judge, only to read numbers off a
// page. The verdict always comes from arithmetic anyone can re-check.
export function redFlagsFor(terms: LoanOfferTerms, trueApr: number): string[] {
  const flags: string[] = [];

  if (terms.rateType === "FLAT") {
    const multiplier = terms.quotedRateAnnual > 0 ? trueApr / terms.quotedRateAnnual : 0;
    flags.push(
      `Quoted as a ${terms.quotedRateAnnual}% flat rate, but the real cost is ${trueApr.toFixed(1)}% APR` +
        (multiplier > 0 ? ` — ${multiplier.toFixed(2)}x higher than it looks.` : "."),
    );
  }

  const feePercentOfPrincipal = (terms.processingFeeValue / terms.principal) * 100;
  if (feePercentOfPrincipal > 2) {
    flags.push(
      `Processing fee is ${feePercentOfPrincipal.toFixed(1)}% of the loan amount — above the typical 1-2% range.`,
    );
  }

  if (terms.prepaymentPenaltyPercent && terms.prepaymentPenaltyPercent > 0) {
    flags.push(
      `There's a ${terms.prepaymentPenaltyPercent}% prepayment penalty — paying this off early costs extra.`,
    );
  }

  if (
    terms.teaserRateAnnual !== undefined &&
    terms.postTeaserRateAnnual !== undefined &&
    terms.postTeaserRateAnnual > terms.teaserRateAnnual * 2
  ) {
    flags.push(
      `The ${terms.teaserRateAnnual}% rate only lasts ${terms.teaserMonths ?? "a limited number of"} months, then jumps to ${terms.postTeaserRateAnnual}%.`,
    );
  }

  if (terms.quotedRateAnnual === 0 && trueApr > 3) {
    flags.push(`This "0%" offer isn't free — fees alone make the true cost ${trueApr.toFixed(1)}% APR.`);
  }

  return flags;
}

export function evaluateLoanOffer(terms: LoanOfferTerms): TrueCostResult {
  const { baseEmi, totalUpfrontFees, totalRepayment, trueApr } = computeTrueAPR(terms);
  const trueAprNum = Number(trueApr);
  return {
    baseEmi,
    totalUpfrontFees,
    totalRepayment,
    trueApr,
    tier: tierFor(trueAprNum),
    redFlags: redFlagsFor(terms, trueAprNum),
  };
}
