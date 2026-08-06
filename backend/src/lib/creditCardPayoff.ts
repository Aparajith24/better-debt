import { Decimal } from "decimal.js";

export interface CreditCardMonth {
  month: number;
  newSpend: string;
  interest: string;
  payment: string;
  balance: string;
}

export interface CreditCardProjection {
  months: number;
  payoffAchieved: boolean;
  totalInterest: string;
  totalNewSpend: string;
  totalPaid: string;
  schedule: CreditCardMonth[];
}

export interface CreditCardComparison {
  withContinuedSpending: CreditCardProjection;
  baseline: CreditCardProjection;
  costOfContinuedSpending: string;
}

const MAX_MONTHS = 1200;

// A card carrying any balance has already lost its grace period, so new
// purchases accrue interest immediately rather than getting a free ~20-50 day
// float. Each month: new spend lands on the balance, interest accrues on the
// whole thing, then the payment is applied. New spend stops once the balance
// is paid off — nothing left to keep spending against.
export function projectCreditCardPayoff(
  currentBalance: number,
  interestRateAnnual: number,
  monthlyPayment: number,
  monthlyNewSpend = 0,
): CreditCardProjection {
  let remaining = new Decimal(currentBalance);
  const monthlyRate = new Decimal(interestRateAnnual).div(100).div(12);
  const payment = new Decimal(monthlyPayment);
  const spend = new Decimal(monthlyNewSpend);

  const schedule: CreditCardMonth[] = [];
  let totalInterest = new Decimal(0);
  let totalNewSpend = new Decimal(0);
  let totalPayments = new Decimal(0);
  let month = 0;

  while (remaining.gt(0) && month < MAX_MONTHS) {
    month += 1;

    remaining = remaining.plus(spend);
    totalNewSpend = totalNewSpend.plus(spend);

    const interest = remaining.mul(monthlyRate).toDecimalPlaces(2);
    const owed = remaining.plus(interest);
    const paymentThisMonth = Decimal.min(payment, owed);
    const principal = paymentThisMonth.minus(interest);

    remaining = owed.minus(paymentThisMonth);
    totalInterest = totalInterest.plus(interest);
    totalPayments = totalPayments.plus(paymentThisMonth);

    schedule.push({
      month,
      newSpend: spend.toFixed(2),
      interest: interest.toFixed(2),
      payment: paymentThisMonth.toFixed(2),
      balance: remaining.toFixed(2),
    });

    if (principal.lte(0)) {
      // Payment doesn't cover interest (plus any new spend) — balance will never shrink.
      break;
    }
  }

  return {
    months: month,
    payoffAchieved: remaining.lte(0),
    totalInterest: totalInterest.toFixed(2),
    totalNewSpend: totalNewSpend.toFixed(2),
    totalPaid: totalPayments.toFixed(2),
    schedule,
  };
}

// Isolates the real cost of losing the grace period: running the same payoff
// with vs. without continued spending shows exactly how much extra interest
// is attributable to new purchases made while a balance is being carried.
export function projectCreditCardComparison(
  currentBalance: number,
  interestRateAnnual: number,
  monthlyPayment: number,
  monthlyNewSpend: number,
): CreditCardComparison {
  const withContinuedSpending = projectCreditCardPayoff(
    currentBalance,
    interestRateAnnual,
    monthlyPayment,
    monthlyNewSpend,
  );
  const baseline = projectCreditCardPayoff(currentBalance, interestRateAnnual, monthlyPayment, 0);

  const costOfContinuedSpending = new Decimal(withContinuedSpending.totalInterest)
    .minus(baseline.totalInterest)
    .toFixed(2);

  return { withContinuedSpending, baseline, costOfContinuedSpending };
}
