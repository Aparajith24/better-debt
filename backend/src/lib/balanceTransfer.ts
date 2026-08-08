import { Decimal } from "decimal.js";
import { projectSingleDebtPayoff, type PayoffProjection } from "./amortization.js";

const MAX_MONTHS = 1200; // 100 years — same safety cap as amortization.ts

// A rate that holds for a fixed number of months, then hands off to the next
// period. The last period's `months` is null — it just runs until payoff.
export interface RatePeriod {
  rateAnnual: number;
  months: number | null;
}

// Same shape as a fixed-rate projection, but the monthly rate can change
// partway through — needed for a teaser rate that reverts to a regular APR.
function projectVariableRatePayoff(
  balance: number,
  monthlyPayment: number,
  periods: RatePeriod[],
): PayoffProjection {
  let remaining = new Decimal(balance);
  const payment = new Decimal(monthlyPayment);

  const schedule: PayoffProjection["schedule"] = [];
  let totalInterest = new Decimal(0);
  let month = 0;
  let periodIndex = 0;
  let monthsIntoPeriod = 0;

  while (remaining.gt(0) && month < MAX_MONTHS) {
    // Advance to the next rate period once the current one's duration is used up.
    while (
      periodIndex < periods.length - 1 &&
      periods[periodIndex].months !== null &&
      monthsIntoPeriod >= (periods[periodIndex].months as number)
    ) {
      periodIndex += 1;
      monthsIntoPeriod = 0;
    }

    month += 1;
    monthsIntoPeriod += 1;

    const monthlyRate = new Decimal(periods[periodIndex].rateAnnual).div(100).div(12);
    const interest = remaining.mul(monthlyRate).toDecimalPlaces(2);
    const paymentThisMonth = Decimal.min(payment, remaining.plus(interest));
    const principal = paymentThisMonth.minus(interest);

    remaining = remaining.plus(interest).minus(paymentThisMonth);
    totalInterest = totalInterest.plus(interest);

    schedule.push({
      month,
      interest: interest.toFixed(2),
      principal: principal.toFixed(2),
      balance: remaining.toFixed(2),
    });

    if (principal.lte(0)) {
      // Payment doesn't even cover interest — balance will never shrink.
      break;
    }
  }

  return {
    months: month,
    payoffAchieved: remaining.lte(0),
    totalInterest: totalInterest.toFixed(2),
    totalPaid: new Decimal(balance).plus(totalInterest).toFixed(2),
    schedule,
  };
}

export interface BalanceTransferResult {
  fee: string;
  transferredBalance: string;
  staying: PayoffProjection;
  transferred: PayoffProjection;
  breakEvenMonths: number | null; // first month the cumulative interest saved covers the fee; null if it never does within either payoff horizon
  interestSaved: string; // staying.totalInterest - transferred.totalInterest, ignoring the fee
  netSavings: string; // staying.totalPaid - transferred.totalPaid — interest saved minus the fee, i.e. the real payoff
  worthIt: boolean;
}

// Sum of a schedule's interest through month m (0 once the debt is paid off,
// since there's nothing left accruing interest).
function cumulativeInterestThrough(schedule: PayoffProjection["schedule"], month: number): Decimal {
  return schedule
    .slice(0, month)
    .reduce((sum, m) => sum.plus(m.interest), new Decimal(0));
}

// Models transferring a balance to a new card/loan that charges an upfront
// fee (typically added to the transferred balance) in exchange for a teaser
// rate that reverts to a regular APR after a fixed number of months. The
// break-even point is when the interest saved by the lower rate has covered
// the fee — until then, transferring is a net loss even though the rate is
// lower.
export function calculateBalanceTransferBreakEven(
  currentBalance: number,
  currentRateAnnual: number,
  monthlyPayment: number,
  fee: number,
  teaserRateAnnual: number,
  teaserMonths: number,
  postTeaserRateAnnual: number,
  addFeeToBalance: boolean,
): BalanceTransferResult {
  const staying = projectSingleDebtPayoff(currentBalance, currentRateAnnual, monthlyPayment);

  const transferredBalance = addFeeToBalance
    ? new Decimal(currentBalance).plus(fee).toNumber()
    : currentBalance;
  const transferred = projectVariableRatePayoff(transferredBalance, monthlyPayment, [
    { rateAnnual: teaserRateAnnual, months: teaserMonths },
    { rateAnnual: postTeaserRateAnnual, months: null },
  ]);

  const horizon = Math.max(staying.months, transferred.months);
  let breakEvenMonths: number | null = null;
  for (let m = 1; m <= horizon; m++) {
    const saved = cumulativeInterestThrough(staying.schedule, m).minus(
      cumulativeInterestThrough(transferred.schedule, m),
    );
    if (saved.gte(fee)) {
      breakEvenMonths = m;
      break;
    }
  }

  const interestSaved = new Decimal(staying.totalInterest).minus(transferred.totalInterest);
  const netSavings = new Decimal(staying.totalPaid).minus(transferred.totalPaid);

  return {
    fee: fee.toFixed(2),
    transferredBalance: transferredBalance.toFixed(2),
    staying,
    transferred,
    breakEvenMonths,
    interestSaved: interestSaved.toFixed(2),
    netSavings: netSavings.toFixed(2),
    worthIt: netSavings.gt(0),
  };
}
