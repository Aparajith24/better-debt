import { Decimal } from "decimal.js";
import { projectSingleDebtPayoff, type PayoffProjection } from "./amortization.js";
import { reducingBalanceEMI } from "./rateNormalization.js";

export interface PrepaymentOutcome {
  months: number;
  totalInterest: string;
  totalPaid: string;
}

export interface ReduceTenureOutcome extends PrepaymentOutcome {
  monthsSaved: number;
  interestSaved: string;
}

export interface ReduceEMIOutcome extends PrepaymentOutcome {
  newMonthlyPayment: string;
  paymentReduction: string;
  interestSaved: string;
}

export interface PrepaymentComparison {
  lumpSum: number;
  newBalanceAfterLumpSum: string;
  baseline: PrepaymentOutcome;
  reduceTenure: ReduceTenureOutcome; // same payment, fewer months
  reduceEMI: ReduceEMIOutcome; // same months, smaller payment
}

function toOutcome(p: PayoffProjection): PrepaymentOutcome {
  return { months: p.months, totalInterest: p.totalInterest, totalPaid: p.totalPaid };
}

// Models the two ways a lump-sum prepayment can be applied: keep the payment
// fixed and finish sooner (reduce tenure), or keep the tenure fixed and pay
// less each month (reduce EMI). Reduce-tenure always saves more interest,
// because every future payment keeps front-loading principal at the old,
// higher payment level instead of settling into a smaller one — this
// function makes that gap concrete instead of asserting it.
export function calculatePrepaymentImpact(
  balance: number,
  interestRateAnnual: number,
  monthlyPayment: number,
  lumpSum: number,
): PrepaymentComparison {
  const baseline = projectSingleDebtPayoff(balance, interestRateAnnual, monthlyPayment);
  const newBalance = Math.max(0, new Decimal(balance).minus(lumpSum).toNumber());

  if (newBalance === 0) {
    return {
      lumpSum,
      newBalanceAfterLumpSum: "0.00",
      baseline: toOutcome(baseline),
      reduceTenure: {
        months: 0,
        totalInterest: "0.00",
        totalPaid: "0.00",
        monthsSaved: baseline.months,
        interestSaved: baseline.totalInterest,
      },
      reduceEMI: {
        months: 0,
        totalInterest: "0.00",
        totalPaid: "0.00",
        newMonthlyPayment: "0.00",
        paymentReduction: monthlyPayment.toFixed(2),
        interestSaved: baseline.totalInterest,
      },
    };
  }

  // Reduce tenure: same monthly payment, just applied to a smaller balance —
  // finishes sooner.
  const reduceTenurePlan = projectSingleDebtPayoff(newBalance, interestRateAnnual, monthlyPayment);

  // Reduce EMI: re-amortize the smaller balance over the SAME remaining
  // tenure as the original plan, so the payment itself shrinks instead.
  const monthlyRate = interestRateAnnual / 100 / 12;
  const newMonthlyPayment = reducingBalanceEMI(newBalance, monthlyRate, baseline.months);
  const reduceEMIPlan = projectSingleDebtPayoff(newBalance, interestRateAnnual, newMonthlyPayment);

  return {
    lumpSum,
    newBalanceAfterLumpSum: newBalance.toFixed(2),
    baseline: toOutcome(baseline),
    reduceTenure: {
      ...toOutcome(reduceTenurePlan),
      monthsSaved: baseline.months - reduceTenurePlan.months,
      interestSaved: new Decimal(baseline.totalInterest)
        .minus(reduceTenurePlan.totalInterest)
        .toFixed(2),
    },
    reduceEMI: {
      ...toOutcome(reduceEMIPlan),
      newMonthlyPayment: newMonthlyPayment.toFixed(2),
      paymentReduction: new Decimal(monthlyPayment).minus(newMonthlyPayment).toFixed(2),
      interestSaved: new Decimal(baseline.totalInterest).minus(reduceEMIPlan.totalInterest).toFixed(2),
    },
  };
}
