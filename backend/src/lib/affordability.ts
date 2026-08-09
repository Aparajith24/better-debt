import { Decimal } from "decimal.js";
import { reducingBalanceEMI, solveMonthlyRateForEMI } from "./rateNormalization.js";

// Conventional debt-to-income guardrails: under 36% total debt payments is
// the "comfortable" line lenders and financial advisors generally use; above
// 50% is widely considered high-risk over-leverage. These are the same
// thresholds the calculator uses to draw the "affordable" ceiling and to
// judge a proposed loan against it.
const COMFORTABLE_DTI = 0.36;
const RISKY_DTI = 0.5;

export interface AffordabilityInput {
  monthlyIncome: number;
  existingMonthlyDebtPayments: number;
  desiredPrincipal: number;
  desiredTenureMonths: number;
  proposedRateAnnual?: number;
}

export type ReadinessVerdict = "GOOD_TIME" | "TIGHT" | "NOT_RECOMMENDED";

export interface AffordabilityResult {
  currentDTI: string;
  maxAffordableMonthlyPayment: string;
  maxAffordableAPR: string | null;
  proposedMonthlyPayment: string | null;
  projectedDTI: string | null;
  verdict: ReadinessVerdict;
  reasons: string[];
}

function verdictForDTI(dti: number): ReadinessVerdict {
  if (dti <= COMFORTABLE_DTI) return "GOOD_TIME";
  if (dti <= RISKY_DTI) return "TIGHT";
  return "NOT_RECOMMENDED";
}

// Computes the personalized ceiling — the maximum monthly payment (and, for
// a given principal/tenure, the maximum APR) that keeps total debt payments
// at or under the comfortable DTI line — and, if the user is evaluating a
// specific rate, judges that proposal against the same line. The verdict
// never depends on any specific lender's product, only on the borrower's own
// numbers, so it can't go stale the way a "here are today's best rates"
// listing would.
export function evaluateAffordability(input: AffordabilityInput): AffordabilityResult {
  const { monthlyIncome, existingMonthlyDebtPayments, desiredPrincipal, desiredTenureMonths, proposedRateAnnual } =
    input;

  const currentDTI = existingMonthlyDebtPayments / monthlyIncome;
  const reasons: string[] = [];

  if (currentDTI > RISKY_DTI) {
    reasons.push(
      `Your existing debt payments already take up ${(currentDTI * 100).toFixed(0)}% of your income — that's already in high-risk territory before considering anything new.`,
    );
  } else if (currentDTI > COMFORTABLE_DTI) {
    reasons.push(
      `Your existing debt payments take up ${(currentDTI * 100).toFixed(0)}% of your income — above the 36% level most advisors consider comfortable.`,
    );
  }

  const maxAffordableMonthlyPayment = Math.max(
    0,
    monthlyIncome * COMFORTABLE_DTI - existingMonthlyDebtPayments,
  );

  const zeroRateEmi = reducingBalanceEMI(desiredPrincipal, 0, desiredTenureMonths);
  let maxAffordableAPR: number | null = null;
  if (maxAffordableMonthlyPayment >= zeroRateEmi) {
    const monthlyRate = solveMonthlyRateForEMI(desiredPrincipal, maxAffordableMonthlyPayment, desiredTenureMonths);
    maxAffordableAPR = monthlyRate * 12 * 100;
  } else {
    reasons.push(
      `Even an interest-free loan of this amount over ${desiredTenureMonths} months would cost more per month than your budget supports — consider a smaller amount or a longer tenure.`,
    );
  }

  let proposedMonthlyPayment: number | null = null;
  let projectedDTI: number | null = null;
  let verdict: ReadinessVerdict;

  if (proposedRateAnnual !== undefined) {
    proposedMonthlyPayment = reducingBalanceEMI(desiredPrincipal, proposedRateAnnual / 100 / 12, desiredTenureMonths);
    projectedDTI = (existingMonthlyDebtPayments + proposedMonthlyPayment) / monthlyIncome;
    verdict = verdictForDTI(projectedDTI);

    if (verdict === "NOT_RECOMMENDED") {
      reasons.push(
        `At ${proposedRateAnnual}% APR, this loan would push your total debt payments to ${(projectedDTI * 100).toFixed(0)}% of your income — above the 50% line most lenders treat as over-leveraged.`,
      );
    } else if (verdict === "TIGHT") {
      reasons.push(
        `At ${proposedRateAnnual}% APR, this loan brings your total debt payments to ${(projectedDTI * 100).toFixed(0)}% of your income — workable, but with little room for a surprise expense.`,
      );
    } else {
      reasons.push(
        `At ${proposedRateAnnual}% APR, this loan keeps your total debt payments at ${(projectedDTI * 100).toFixed(0)}% of your income — within the comfortable range.`,
      );
    }
  } else {
    verdict = maxAffordableAPR === null ? "NOT_RECOMMENDED" : verdictForDTI(currentDTI);
    if (maxAffordableAPR !== null) {
      reasons.push(
        `Based on your income and existing payments, aim for a rate at or below ${maxAffordableAPR.toFixed(1)}% APR for this amount and tenure.`,
      );
    }
  }

  return {
    currentDTI: (currentDTI * 100).toFixed(1),
    maxAffordableMonthlyPayment: new Decimal(maxAffordableMonthlyPayment).toFixed(2),
    maxAffordableAPR: maxAffordableAPR === null ? null : maxAffordableAPR.toFixed(2),
    proposedMonthlyPayment: proposedMonthlyPayment === null ? null : new Decimal(proposedMonthlyPayment).toFixed(2),
    projectedDTI: projectedDTI === null ? null : (projectedDTI * 100).toFixed(1),
    verdict,
    reasons,
  };
}
