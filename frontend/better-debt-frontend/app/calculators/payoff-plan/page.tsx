"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError, type Debt, type PayoffPlanComparison } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { BalanceChart } from "@/components/BalanceChart";
import { MonthlyPaymentTable } from "@/components/MonthlyPaymentTable";

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
      <main className="w-full max-w-[1600px] px-6 py-8 lg:px-10">
        <Link href="/calculators" className="text-sm text-zinc-500 hover:underline">
          ← Calculators
        </Link>
        <h1 className="mt-2 mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Payoff plan
        </h1>

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
          <div className="lg:grid lg:grid-cols-[300px_1fr] lg:items-start lg:gap-6">
            <div className="mb-6 flex flex-col gap-4 lg:sticky lg:top-6 lg:mb-0">
              <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Debts to include
                </h2>
                <div className="flex flex-col gap-3">
                  {debts.map((d) => (
                    <label
                      key={d.id}
                      className={`flex flex-col text-sm ${!d.minPayment ? "opacity-40" : ""}`}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          disabled={!d.minPayment}
                          checked={selected.has(d.id)}
                          onChange={() => toggle(d.id)}
                          className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
                        />
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">
                          {d.name}
                        </span>
                      </span>
                      <span className="pl-6 text-xs text-zinc-500 dark:text-zinc-400">
                        {formatCurrency(d.currentBalance)} ·{" "}
                        {Number(d.interestRateAnnual).toFixed(1)}%
                      </span>
                    </label>
                  ))}
                </div>
                {withoutMinPayment.length > 0 && (
                  <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
                    {withoutMinPayment.length} debt(s) need a minimum payment set before they can
                    be included — edit them from the Debts page.
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    Extra monthly budget (₹)
                  </span>
                  <span className="text-xs text-zinc-400">
                    On top of minimum payments
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
                  className="mt-4 w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
                >
                  {running ? "Running…" : "Compare strategies"}
                </button>
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                  {error}
                </p>
              )}
            </div>

            <div>{result && <ResultView result={result} debts={debts} />}</div>
          </div>
        )}
      </main>
    </div>
  );
}

type Recommendation = {
  winner: "avalanche" | "snowball" | "tie";
  headline: string;
  detail: string;
};

function getRecommendation(result: PayoffPlanComparison): Recommendation {
  const interestSaved = Number(result.comparison.interestSavedByAvalanche);
  const monthsSaved = result.comparison.monthsSavedByAvalanche;
  const snowballInterest = Number(result.snowball.totalInterestPaid);

  if (Math.abs(interestSaved) < 1) {
    return {
      winner: "tie",
      headline: "Either strategy works equally well here",
      detail:
        "Avalanche and snowball land on the same payoff order for these debts, so there's no cost tradeoff to weigh — pick snowball if closing an account quickly would help you stick with the plan.",
    };
  }

  const pct = snowballInterest > 0 ? ((interestSaved / snowballInterest) * 100).toFixed(1) : "0";
  const monthsPart =
    monthsSaved !== 0
      ? ` and finishes ${Math.abs(monthsSaved)} month${Math.abs(monthsSaved) === 1 ? "" : "s"} ${
          monthsSaved > 0 ? "sooner" : "later"
        }`
      : "";
  const closeCall = interestSaved / snowballInterest < 0.05;

  return {
    winner: "avalanche",
    headline: `Avalanche saves you ${formatCurrency(interestSaved)}`,
    detail: `That's ${pct}% less total interest than snowball${monthsPart}.${
      closeCall
        ? " The gap is small enough here that snowball's faster first win may still be worth it if you value momentum over the last rupee saved."
        : " For these numbers, avalanche is clearly the cheaper path."
    }`,
  };
}

function ResultView({ result, debts }: { result: PayoffPlanComparison; debts: Debt[] }) {
  const nameFor = (id: string) => debts.find((d) => d.id === id)?.name ?? id;
  const recommendation = getRecommendation(result);
  const defaultStrategy = recommendation.winner === "snowball" ? "snowball" : "avalanche";

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-zinc-900 bg-zinc-900 p-5 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900">
        <p className="text-sm font-semibold">{recommendation.headline}</p>
        <p className="mt-1 text-sm opacity-80">{recommendation.detail}</p>
      </div>

      {result.ratesUsed.some((r) => r.rateType === "FLAT") && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
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
        <StrategyCard
          title="Avalanche"
          plan={result.avalanche}
          nameFor={nameFor}
          highlight={recommendation.winner === "avalanche" || recommendation.winner === "tie"}
        />
        <StrategyCard
          title="Snowball"
          plan={result.snowball}
          nameFor={nameFor}
          highlight={recommendation.winner === "snowball" || recommendation.winner === "tie"}
        />
      </div>

      <BalanceChart avalanche={result.avalanche} snowball={result.snowball} />

      <MonthlyPaymentTable
        avalanche={result.avalanche}
        snowball={result.snowball}
        defaultStrategy={defaultStrategy}
        nameFor={nameFor}
      />
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
