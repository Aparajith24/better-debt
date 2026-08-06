"use client";

import { useEffect, useState } from "react";
import { api, ApiError, type Debt, type DebtInput } from "@/lib/api";
import { DebtForm } from "@/components/DebtForm";
import { DebtCard } from "@/components/DebtCard";
import { formatCurrency } from "@/lib/format";

type ViewState = { mode: "list" } | { mode: "create" } | { mode: "edit"; debt: Debt };

export default function Home() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState<ViewState>({ mode: "list" });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadDebts() {
    setLoading(true);
    setLoadError(null);
    try {
      setDebts(await api.listDebts());
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Could not load debts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDebts();
  }, []);

  async function handleCreate(input: DebtInput) {
    await api.createDebt(input);
    setView({ mode: "list" });
    await loadDebts();
  }

  async function handleUpdate(id: string, input: DebtInput) {
    await api.updateDebt(id, input);
    setView({ mode: "list" });
    await loadDebts();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this debt?")) return;
    setDeletingId(id);
    try {
      await api.deleteDebt(id);
      await loadDebts();
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Could not delete debt.");
    } finally {
      setDeletingId(null);
    }
  }

  const totalBalance = debts.reduce((sum, d) => sum + Number(d.currentBalance), 0);
  const totalMinPayment = debts.reduce((sum, d) => sum + Number(d.minPayment ?? 0), 0);
  const weightedAvgRate =
    totalBalance > 0
      ? debts.reduce((sum, d) => sum + Number(d.currentBalance) * Number(d.interestRateAnnual), 0) /
        totalBalance
      : 0;

  return (
    <div className="flex flex-1 justify-center bg-zinc-50 dark:bg-black">
      <main className="w-full max-w-7xl px-6 py-8 lg:px-10">
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

        {debts.length > 0 && (
          <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile label="Total balance" value={formatCurrency(totalBalance)} />
            <StatTile label="Total minimum payments" value={formatCurrency(totalMinPayment)} />
            <StatTile label="Weighted avg. rate" value={`${weightedAvgRate.toFixed(2)}%`} />
            <StatTile label="Open debts" value={debts.length.toString()} />
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

        {loadError && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {loadError}
          </p>
        )}

        {loading ? (
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
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-xs text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">{value}</div>
    </div>
  );
}
