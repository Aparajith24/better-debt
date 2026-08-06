"use client";

import { useState } from "react";
import type { MultiDebtPlan } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

interface MonthlyPaymentTableProps {
  avalanche: MultiDebtPlan;
  snowball: MultiDebtPlan;
  defaultStrategy: "avalanche" | "snowball";
  nameFor: (id: string) => string;
}

export function MonthlyPaymentTable({
  avalanche,
  snowball,
  defaultStrategy,
  nameFor,
}: MonthlyPaymentTableProps) {
  const [strategy, setStrategy] = useState(defaultStrategy);
  const plan = strategy === "avalanche" ? avalanche : snowball;

  const debtIds = plan.debts.map((d) => d.id);

  return (
    <div className="flex h-full flex-col rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          What to pay each month
        </h3>
        <div className="flex rounded-lg border border-zinc-200 p-0.5 text-xs dark:border-zinc-700">
          {(["avalanche", "snowball"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStrategy(s)}
              className={`rounded-md px-2.5 py-1 capitalize ${
                strategy === s
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-[480px] overflow-y-auto">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-white dark:bg-zinc-900">
            <tr className="border-b border-zinc-200 text-zinc-400 dark:border-zinc-800">
              <th className="py-2 pr-2 font-normal">Month</th>
              {debtIds.map((id) => (
                <th key={id} className="py-2 pr-2 font-normal">
                  {nameFor(id)}
                </th>
              ))}
              <th className="py-2 font-normal">Total</th>
            </tr>
          </thead>
          <tbody>
            {plan.monthlySummary.map((m) => {
              const total = m.payments.reduce((sum, p) => sum + Number(p.amount), 0);
              return (
                <tr key={m.month} className="border-b border-zinc-100 dark:border-zinc-800/60">
                  <td className="py-1.5 pr-2 text-zinc-500 dark:text-zinc-400">{m.month}</td>
                  {debtIds.map((id) => {
                    const payment = m.payments.find((p) => p.id === id);
                    const justClosed = payment && Number(payment.balance) <= 0;
                    return (
                      <td
                        key={id}
                        className={`py-1.5 pr-2 tabular-nums ${
                          justClosed
                            ? "font-medium text-emerald-600 dark:text-emerald-400"
                            : payment
                              ? "text-zinc-900 dark:text-zinc-100"
                              : "text-zinc-300 dark:text-zinc-700"
                        }`}
                      >
                        {payment ? formatCurrency(payment.amount) : "—"}
                        {justClosed && " ✓"}
                      </td>
                    );
                  })}
                  <td className="py-1.5 font-medium text-zinc-900 dark:text-zinc-100 tabular-nums">
                    {formatCurrency(total)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
