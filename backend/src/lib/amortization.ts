import { Decimal } from "decimal.js";

export interface PayoffMonth {
  month: number;
  interest: string;
  principal: string;
  balance: string;
}

export interface PayoffProjection {
  months: number;
  payoffAchieved: boolean;
  totalInterest: string;
  totalPaid: string;
  schedule: PayoffMonth[];
}

const MAX_MONTHS = 1200; // 100 years — safety cap against payments too small to ever clear the balance

// Reducing-balance projection for a single debt: each month, interest accrues on
// the outstanding balance, then the payment is applied (interest first, remainder to principal).
export function projectSingleDebtPayoff(
  balance: number,
  annualRatePercent: number,
  monthlyPayment: number,
): PayoffProjection {
  let remaining = new Decimal(balance);
  const monthlyRate = new Decimal(annualRatePercent).div(100).div(12);
  const payment = new Decimal(monthlyPayment);

  const schedule: PayoffMonth[] = [];
  let totalInterest = new Decimal(0);
  let month = 0;

  while (remaining.gt(0) && month < MAX_MONTHS) {
    month += 1;

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
      // Payment doesn't even cover the interest — balance will never shrink.
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
