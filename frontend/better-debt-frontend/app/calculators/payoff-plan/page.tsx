"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError, type Debt, type PayoffPlanComparison } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

export default function PayoffPlanPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [extraBudget, setExtraBudget] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PayoffPlanComparison | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    api
      .listDebts()
      .then((d) => {
        setDebts(d);
        setSelected(new Set(d.filter((debt) => debt.minPayment).map((debt) => debt.id)));
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load debts."))
      .finally(() => setLoading(false));
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function runComparison() {
    setError(null);
    setResult(null);

    const chosen = debts.filter((d) => selected.has(d.id));
    if (chosen.length === 0) {
      setError("Select at least one debt with a minimum payment set.");
      return;
    }

    setRunning(true);
    try {
      const res = await api.payoffPlan({
        debts: chosen.map((d) => ({
          id: d.id,
          balance: Number(d.currentBalance),
          rateType: d.rateType,
          interestRateAnnual: Number(d.interestRateAnnual),
          minPayment: Number(d.minPayment),
          ...(d.principal ? { principal: Number(d.principal) } : {}),
          ...(d.tenureMonths ? { tenureMonths: d.tenureMonths } : {}),
        })),
        extraMonthlyBudget: Number(extraBudget) || 0,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not run the comparison.");
    } finally {
      setRunning(false);
    }
  }

  const withoutMinPayment = debts.filter((d) => !d.minPayment);

  return (
    <div className="flex flex-1 justify-center bg-zinc-50 dark:bg-black">
      <main className="w-full max-w-3xl px-6 py-12">
        <Link href="/calculators" className="text-sm text-zinc-500 hover:underline">
          ← Calculators
        </Link>
        <h1 className="mt-2 mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Payoff plan
        </h1>
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          Compare avalanche and snowball across your saved debts.
        </p>

        {loading ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading debts…</p>
        ) : debts.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No debts yet.{" "}
            <Link href="/" className="underline">
              Add some first
            </Link>
            .
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Debts to include
              </h2>
              <div className="flex flex-col gap-2">
                {debts.map((d) => (
                  <label
                    key={d.id}
                    className={`flex items-center gap-3 text-sm ${!d.minPayment ? "opacity-40" : ""}`}
                  >
                    <input
                      type="checkbox"
                      disabled={!d.minPayment}
                      checked={selected.has(d.id)}
                      onChange={() => toggle(d.id)}
                      className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
                    />
                    <span className="flex-1 text-zinc-900 dark:text-zinc-100">{d.name}</span>
                    <span className="text-zinc-500 dark:text-zinc-400">
                      {formatCurrency(d.currentBalance)} · {Number(d.interestRateAnnual).toFixed(1)}%
                    </span>
                  </label>
                ))}
              </div>
              {withoutMinPayment.length > 0 && (
                <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
                  {withoutMinPayment.length} debt(s) need a minimum payment set before they can be
                  included — edit them from the Debts page.
                </p>
              )}
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  Extra monthly budget (₹)
                </span>
                <span className="text-xs text-zinc-400">
                  On top of minimum payments — how much more can you put toward debt each month?
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={extraBudget}
                  onChange={(e) => setExtraBudget(e.target.value)}
                  className="input mt-1"
                  placeholder="0"
                />
              </label>
              <button
                onClick={runComparison}
                disabled={running}
                className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
              >
                {running ? "Running…" : "Compare strategies"}
              </button>
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                {error}
              </p>
            )}

            {result && <ResultView result={result} debts={debts} />}
          </div>
        )}
      </main>
    </div>
  );
}

function ResultView({ result, debts }: { result: PayoffPlanComparison; debts: Debt[] }) {
  const nameFor = (id: string) => debts.find((d) => d.id === id)?.name ?? id;
  const interestSaved = Number(result.comparison.interestSavedByAvalanche);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-zinc-900 bg-zinc-900 p-5 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900">
        <p className="text-sm">
          Avalanche saves you{" "}
          <span className="font-semibold">{formatCurrency(interestSaved)}</span> in interest
          {result.comparison.monthsSavedByAvalanche !== 0 && (
            <>
              {" "}
              and finishes{" "}
              <span className="font-semibold">
                {Math.abs(result.comparison.monthsSavedByAvalanche)} month
                {Math.abs(result.comparison.monthsSavedByAvalanche) === 1 ? "" : "s"}
              </span>{" "}
              {result.comparison.monthsSavedByAvalanche > 0 ? "sooner" : "later"}
            </>
          )}{" "}
          compared to snowball.
        </p>
      </div>

      {result.ratesUsed.some((r) => r.rateType === "FLAT") && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 text-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-2 font-medium text-zinc-700 dark:text-zinc-300">
            Flat rates normalized for comparison
          </h3>
          <div className="flex flex-col gap-1">
            {result.ratesUsed
              .filter((r) => r.rateType === "FLAT")
              .map((r) => (
                <p key={r.id} className="text-zinc-600 dark:text-zinc-400">
                  {nameFor(r.id)}: quoted {r.quotedRateAnnual}% flat → effectively{" "}
                  {r.effectiveRateAnnual.toFixed(2)}% APR
                </p>
              ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StrategyCard title="Avalanche" plan={result.avalanche} nameFor={nameFor} highlight />
        <StrategyCard title="Snowball" plan={result.snowball} nameFor={nameFor} />
      </div>
    </div>
  );
}

function StrategyCard({
  title,
  plan,
  nameFor,
  highlight,
}: {
  title: string;
  plan: PayoffPlanComparison["avalanche"];
  nameFor: (id: string) => string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        highlight
          ? "border-zinc-900 dark:border-zinc-100"
          : "border-zinc-200 dark:border-zinc-800"
      } bg-white dark:bg-zinc-900`}
    >
      <h3 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
      <div className="mb-4 flex flex-col gap-1 text-sm">
        <p className="text-zinc-500 dark:text-zinc-400">
          Debt-free in{" "}
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {plan.totalMonths} months
          </span>
        </p>
        <p className="text-zinc-500 dark:text-zinc-400">
          Total interest:{" "}
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {formatCurrency(plan.totalInterestPaid)}
          </span>
        </p>
      </div>
      <h4 className="mb-2 text-xs font-medium text-zinc-400">Payoff order</h4>
      <ol className="flex flex-col gap-1 text-sm">
        {plan.payoffOrder.map((id, i) => {
          const debt = plan.debts.find((d) => d.id === id);
          return (
            <li key={id} className="flex justify-between text-zinc-700 dark:text-zinc-300">
              <span>
                {i + 1}. {nameFor(id)}
              </span>
              <span className="text-zinc-400">month {debt?.payoffMonth}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
