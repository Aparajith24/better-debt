"use client";

import { useState } from "react";
import type { Debt, DebtInput } from "@/lib/api";
import { ApiError } from "@/lib/api";
import {
  useActiveTrackedPlan,
  useCreateDebt,
  useDebts,
  useDeleteDebt,
  usePayoffPlan,
  useUpdateDebt,
} from "@/lib/queries";
import { DebtForm } from "@/components/DebtForm";
import { DebtCard } from "@/components/DebtCard";
import { PayoffHero } from "@/components/PayoffHero";
import { TrackedPlanCard, TrackedPlanCta } from "@/components/TrackedPlanCard";
import { formatCurrency } from "@/lib/format";

type ViewState = { mode: "list" } | { mode: "create" } | { mode: "edit"; debt: Debt };

export default function Home() {
  const { data: debts = [], isLoading, error: loadQueryError } = useDebts();
  const payoffPlan = usePayoffPlan(debts);
  const trackedPlan = useActiveTrackedPlan();
  const createDebt = useCreateDebt();
  const updateDebt = useUpdateDebt();
  const deleteDebt = useDeleteDebt();

  const [view, setView] = useState<ViewState>({ mode: "list" });
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadError = loadQueryError instanceof ApiError ? loadQueryError.message : loadQueryError ? "Could not load debts." : null;

  async function handleCreate(input: DebtInput) {
    await createDebt.mutateAsync(input);
    setView({ mode: "list" });
  }

  async function handleUpdate(id: string, input: DebtInput) {
    await updateDebt.mutateAsync({ id, input });
    setView({ mode: "list" });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this debt?")) return;
    setActionError(null);
    setDeletingId(id);
    try {
      await deleteDebt.mutateAsync(id);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not delete debt.");
    } finally {
      setDeletingId(null);
    }
  }

  const nameFor = (id: string) => debts.find((d) => d.id === id)?.name ?? id;

  const totalBalance = debts.reduce((sum, d) => sum + Number(d.currentBalance), 0);
  const totalMinPayment = debts.reduce((sum, d) => sum + Number(d.minPayment ?? 0), 0);
  const weightedAvgRate =
    totalBalance > 0
      ? debts.reduce((sum, d) => sum + Number(d.currentBalance) * Number(d.interestRateAnnual), 0) /
        totalBalance
      : 0;

  const payFirstId = payoffPlan.data?.avalanche.payoffOrder[0];

  return (
    <div className="flex flex-1 bg-zinc-50 dark:bg-black">
      <main className="w-full px-6 py-8 lg:px-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Your debts</h1>
          {view.mode === "list" && (
            <button
              onClick={() => setView({ mode: "create" })}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Add debt
            </button>
          )}
        </div>

        {payoffPlan.data && view.mode === "list" && (
          <PayoffHero plan={payoffPlan.data} nameFor={nameFor} />
        )}

        {view.mode === "list" && debts.length > 0 && (
          trackedPlan.data ? (
            <TrackedPlanCard data={trackedPlan.data} />
          ) : (
            !trackedPlan.isLoading && <TrackedPlanCta />
          )
        )}

        {debts.length > 0 && (
          <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile label="Total balance" value={formatCurrency(totalBalance)} accent="blue" />
            <StatTile
              label="Total minimum payments"
              value={formatCurrency(totalMinPayment)}
              accent="violet"
            />
            <StatTile
              label="Weighted avg. rate"
              value={`${weightedAvgRate.toFixed(2)}%`}
              accent="amber"
            />
            <StatTile label="Open debts" value={debts.length.toString()} accent="emerald" />
          </div>
        )}

        {view.mode === "create" && (
          <div className="mb-8 max-w-2xl">
            <DebtForm onSubmit={handleCreate} onCancel={() => setView({ mode: "list" })} />
          </div>
        )}

        {view.mode === "edit" && (
          <div className="mb-8 max-w-2xl">
            <DebtForm
              initial={view.debt}
              onSubmit={(input) => handleUpdate(view.debt.id, input)}
              onCancel={() => setView({ mode: "list" })}
            />
          </div>
        )}

        {(loadError || actionError) && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {loadError ?? actionError}
          </p>
        )}

        {isLoading ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
        ) : debts.length === 0 && view.mode === "list" ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No debts yet. Add your first one to get started.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {debts.map((debt) => (
              <DebtCard
                key={debt.id}
                debt={debt}
                onEdit={() => setView({ mode: "edit", debt })}
                onDelete={() => handleDelete(debt.id)}
                deleting={deletingId === debt.id}
                payFirst={debt.id === payFirstId}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

const STAT_ACCENTS = {
  blue: {
    wrap: "border-blue-200 bg-gradient-to-br from-blue-50 to-white dark:border-blue-900/60 dark:from-blue-950/50 dark:to-zinc-900",
    label: "text-blue-600 dark:text-blue-400",
  },
  violet: {
    wrap: "border-violet-200 bg-gradient-to-br from-violet-50 to-white dark:border-violet-900/60 dark:from-violet-950/50 dark:to-zinc-900",
    label: "text-violet-600 dark:text-violet-400",
  },
  amber: {
    wrap: "border-amber-200 bg-gradient-to-br from-amber-50 to-white dark:border-amber-900/60 dark:from-amber-950/50 dark:to-zinc-900",
    label: "text-amber-600 dark:text-amber-400",
  },
  emerald: {
    wrap: "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white dark:border-emerald-900/60 dark:from-emerald-950/50 dark:to-zinc-900",
    label: "text-emerald-600 dark:text-emerald-400",
  },
} as const;

function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: keyof typeof STAT_ACCENTS;
}) {
  const { wrap, label: labelClass } = STAT_ACCENTS[accent];
  return (
    <div className={`rounded-xl border p-4 ${wrap}`}>
      <div className={`text-xs font-medium ${labelClass}`}>{label}</div>
      <div className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">{value}</div>
    </div>
  );
}
