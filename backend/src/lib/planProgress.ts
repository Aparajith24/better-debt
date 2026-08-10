import { Decimal } from "decimal.js";
import type { MonthSummary } from "./multiDebtPayoff.js";

// Absorbs rounding noise between the snapshot's decimal math and today's
// live balances — a few rupees either way shouldn't flip the verdict.
const TOLERANCE = 100;

const MS_PER_MONTH = 30 * 24 * 60 * 60 * 1000;

export type ProgressStatus = "AHEAD" | "ON_TRACK" | "BEHIND" | "COMPLETED";

export interface PlanProgress {
  elapsedMonths: number;
  totalMonths: number;
  expectedBalance: string;
  actualBalance: string;
  delta: string; // actual - expected; negative = ahead of plan
  status: ProgressStatus;
  missingDebtIds: string[];
}

export interface PlanSnapshot {
  startDate: Date;
  totalMonths: number;
  totalPaid: string;
  totalInterestPaid: string;
  payoffOrder: string[];
  monthlySummary: MonthSummary[];
}

// Whole 30-day periods since the plan started — consistent with how the
// simulation itself treats "a month" (interest compounds monthly, not on
// calendar-month boundaries), not calendar months.
function elapsedMonthsSince(startDate: Date, totalMonths: number): number {
  const raw = Math.floor((Date.now() - startDate.getTime()) / MS_PER_MONTH);
  return Math.min(Math.max(raw, 0), totalMonths);
}

// Starting total balance = totalPaid - totalInterestPaid, exactly — that's
// how simulateMultiDebtPayoff derives totalPaid in the first place
// (principal + interest), so no need to snapshot it separately.
function expectedBalanceAt(plan: PlanSnapshot, elapsedMonths: number): Decimal {
  if (elapsedMonths <= 0) {
    return new Decimal(plan.totalPaid).minus(plan.totalInterestPaid);
  }
  const entry = plan.monthlySummary[elapsedMonths - 1];
  return entry ? new Decimal(entry.totalBalance) : new Decimal(0);
}

// currentBalances only needs entries for debts that still exist — anything
// in payoffOrder missing from the map is treated as fully paid off (balance
// 0), since deleting a debt is the only "mark as done" action the app has.
export function computeProgress(plan: PlanSnapshot, currentBalances: Map<string, number>): PlanProgress {
  const elapsedMonths = elapsedMonthsSince(plan.startDate, plan.totalMonths);
  const expectedBalance = expectedBalanceAt(plan, elapsedMonths);

  const missingDebtIds = plan.payoffOrder.filter((id) => !currentBalances.has(id));
  const actualBalance = plan.payoffOrder.reduce(
    (sum, id) => sum.plus(currentBalances.get(id) ?? 0),
    new Decimal(0),
  );

  const delta = actualBalance.minus(expectedBalance);

  let status: ProgressStatus;
  if (actualBalance.lte(0)) {
    status = "COMPLETED";
  } else if (delta.lt(-TOLERANCE)) {
    status = "AHEAD";
  } else if (delta.gt(TOLERANCE)) {
    status = "BEHIND";
  } else {
    status = "ON_TRACK";
  }

  return {
    elapsedMonths,
    totalMonths: plan.totalMonths,
    expectedBalance: expectedBalance.toFixed(2),
    actualBalance: actualBalance.toFixed(2),
    delta: delta.toFixed(2),
    status,
    missingDebtIds,
  };
}
