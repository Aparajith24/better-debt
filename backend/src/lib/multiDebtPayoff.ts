import { Decimal } from "decimal.js";

export type Strategy = "avalanche" | "snowball";

export interface DebtInput {
  id: string;
  balance: number;
  interestRateAnnual: number;
  minPayment: number;
}

export interface DebtOutcome {
  id: string;
  payoffMonth: number | null; // null if it never gets paid off within MAX_MONTHS
  totalInterestPaid: string;
}

export interface MonthSummary {
  month: number;
  totalBalance: string;
  interestThisMonth: string;
}

export interface MultiDebtPlan {
  strategy: Strategy;
  payoffAchieved: boolean;
  totalMonths: number;
  totalInterestPaid: string;
  totalPaid: string;
  payoffOrder: string[]; // debt ids in the order they were closed
  debts: DebtOutcome[];
  monthlySummary: MonthSummary[];
}

const MAX_MONTHS = 1200;

interface WorkingDebt {
  id: string;
  balance: Decimal;
  monthlyRate: Decimal;
  minPayment: Decimal;
  totalInterestPaid: Decimal;
  payoffMonth: number | null;
}

// Priority order for extra-payment allocation: avalanche targets the highest
// rate first (minimizes total interest), snowball targets the smallest
// balance first (closes accounts fastest for behavioral momentum). Order is
// fixed at the start of the simulation, matching how these plans are
// actually communicated to users up front.
function priorityOrder(debts: WorkingDebt[], strategy: Strategy): WorkingDebt[] {
  const sorted = [...debts];
  if (strategy === "avalanche") {
    sorted.sort((a, b) => b.monthlyRate.cmp(a.monthlyRate));
  } else {
    sorted.sort((a, b) => a.balance.cmp(b.balance));
  }
  return sorted;
}

export function simulateMultiDebtPayoff(
  debtsInput: DebtInput[],
  extraMonthlyBudget: number,
  strategy: Strategy,
): MultiDebtPlan {
  const debts: WorkingDebt[] = debtsInput.map((d) => ({
    id: d.id,
    balance: new Decimal(d.balance),
    monthlyRate: new Decimal(d.interestRateAnnual).div(100).div(12),
    minPayment: new Decimal(d.minPayment),
    totalInterestPaid: new Decimal(0),
    payoffMonth: null,
  }));

  const order = priorityOrder(debts, strategy);

  let month = 0;
  let totalInterestAll = new Decimal(0);
  const monthlySummary: MonthSummary[] = [];
  const payoffOrder: string[] = [];

  while (order.some((d) => d.balance.gt(0)) && month < MAX_MONTHS) {
    month += 1;

    // 1. Accrue this month's interest on every still-open debt.
    let interestThisMonth = new Decimal(0);
    for (const d of order) {
      if (d.balance.lte(0)) continue;
      const interest = d.balance.mul(d.monthlyRate).toDecimalPlaces(2);
      d.balance = d.balance.plus(interest);
      d.totalInterestPaid = d.totalInterestPaid.plus(interest);
      totalInterestAll = totalInterestAll.plus(interest);
      interestThisMonth = interestThisMonth.plus(interest);
    }

    // 2. Pool = user's extra budget + minimum payments freed up from debts
    //    already closed in a previous month (the cascading effect that makes
    //    both avalanche and snowball accelerate over time).
    let pool = new Decimal(extraMonthlyBudget);
    for (const d of order) {
      if (d.payoffMonth !== null) pool = pool.plus(d.minPayment);
    }

    // 3. Pay the minimum on every still-open debt.
    for (const d of order) {
      if (d.balance.lte(0)) continue;
      const pay = Decimal.min(d.minPayment, d.balance);
      d.balance = d.balance.minus(pay);
      if (d.balance.lte(0) && d.payoffMonth === null) {
        d.payoffMonth = month;
        payoffOrder.push(d.id);
      }
    }

    // 4. Apply the pool to the highest-priority still-open debt, cascading
    //    any leftover to the next one if it gets fully paid off mid-month.
    for (const d of order) {
      if (pool.lte(0)) break;
      if (d.balance.lte(0)) continue;
      const pay = Decimal.min(pool, d.balance);
      d.balance = d.balance.minus(pay);
      pool = pool.minus(pay);
      if (d.balance.lte(0) && d.payoffMonth === null) {
        d.payoffMonth = month;
        payoffOrder.push(d.id);
      }
    }

    monthlySummary.push({
      month,
      totalBalance: order.reduce((sum, d) => sum.plus(d.balance), new Decimal(0)).toFixed(2),
      interestThisMonth: interestThisMonth.toFixed(2),
    });
  }

  const payoffAchieved = order.every((d) => d.balance.lte(0));
  const totalPrincipal = debtsInput.reduce((sum, d) => sum.plus(d.balance), new Decimal(0));

  return {
    strategy,
    payoffAchieved,
    totalMonths: month,
    totalInterestPaid: totalInterestAll.toFixed(2),
    totalPaid: totalPrincipal.plus(totalInterestAll).toFixed(2),
    payoffOrder,
    debts: debts.map((d) => ({
      id: d.id,
      payoffMonth: d.payoffMonth,
      totalInterestPaid: d.totalInterestPaid.toFixed(2),
    })),
    monthlySummary,
  };
}
