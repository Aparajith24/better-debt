"use client";

import { useEffect, useState } from "react";
import { api, ApiError, type Debt, type DebtInput } from "@/lib/api";
import { DebtForm } from "@/components/DebtForm";
import { DebtCard } from "@/components/DebtCard";

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

  return (
    <div className="flex flex-1 justify-center bg-zinc-50 dark:bg-black">
      <main className="w-full max-w-3xl px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Your debts</h1>
            {debts.length > 0 && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Total balance: ₹
                {totalBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
            )}
          </div>
          {view.mode === "list" && (
            <button
              onClick={() => setView({ mode: "create" })}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Add debt
            </button>
          )}
        </div>

        {view.mode === "create" && (
          <div className="mb-8">
            <DebtForm onSubmit={handleCreate} onCancel={() => setView({ mode: "list" })} />
          </div>
        )}

        {view.mode === "edit" && (
          <div className="mb-8">
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
          <div className="flex flex-col gap-4">
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
