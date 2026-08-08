"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { api, ApiError, type CreditCardComparison } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

export default function CreditCardPage() {
  const [currentBalance, setCurrentBalance] = useState("");
  const [interestRateAnnual, setInterestRateAnnual] = useState("");
  const [monthlyPayment, setMonthlyPayment] = useState("");
  const [monthlyNewSpend, setMonthlyNewSpend] = useState("");
  const [result, setResult] = useState<CreditCardComparison | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setRunning(true);
    try {
      setResult(
        await api.creditCardProjection({
          currentBalance: Number(currentBalance),
          interestRateAnnual: Number(interestRateAnnual),
          monthlyPayment: Number(monthlyPayment),
          monthlyNewSpend: Number(monthlyNewSpend) || 0,
        }),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not run the projection.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-1 bg-zinc-50 dark:bg-black">
      <main className="w-full px-6 py-8 lg:px-10">
        <Link href="/calculators" className="text-sm text-zinc-500 hover:underline">
          ← Calculators
        </Link>
        <h1 className="mt-2 mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Credit card grace period
        </h1>
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          Carrying a balance means new purchases lose their interest-free grace period. See what
          that&apos;s really costing you.
        </p>

        <div className="lg:grid lg:grid-cols-[360px_1fr] lg:items-start lg:gap-6">
          <form
            onSubmit={handleSubmit}
            className="mb-6 flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 lg:mb-0 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <Field label="Current balance (₹)">
              <input
                required
                type="number"
                min={0}
                step="0.01"
                value={currentBalance}
                onChange={(e) => setCurrentBalance(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Interest rate (APR %)">
              <input
                required
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={interestRateAnnual}
                onChange={(e) => setInterestRateAnnual(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Monthly payment (₹)">
              <input
                required
                type="number"
                min={0}
                step="0.01"
                value={monthlyPayment}
                onChange={(e) => setMonthlyPayment(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Planned new spending per month (₹)" optional>
              <input
                type="number"
                min={0}
                step="0.01"
                value={monthlyNewSpend}
                onChange={(e) => setMonthlyNewSpend(e.target.value)}
                className="input"
                placeholder="0"
              />
            </Field>
            <button
              type="submit"
              disabled={running}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {running ? "Calculating…" : "Calculate"}
            </button>
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                {error}
              </p>
            )}
          </form>

          {result && (
            <div className="flex flex-col gap-4">
              {Number(result.costOfContinuedSpending) > 0 && (
                <div className="rounded-xl border border-zinc-900 bg-zinc-900 p-6 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900">
                  <p className="text-sm">
                    Continuing to spend on this card costs you an extra{" "}
                    <span className="font-semibold">
                      {formatCurrency(result.costOfContinuedSpending)}
                    </span>{" "}
                    in interest compared to not spending at all.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ScenarioCard
                  title="With continued spending"
                  projection={result.withContinuedSpending}
                />
                <ScenarioCard title="No new spending" projection={result.baseline} />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function ScenarioCard({
  title,
  projection,
}: {
  title: string;
  projection: CreditCardComparison["baseline"];
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
      {!projection.payoffAchieved && (
        <p className="mb-2 text-xs text-amber-600 dark:text-amber-400">
          Payment doesn&apos;t cover interest — this never gets paid off.
        </p>
      )}
      <div className="flex flex-col gap-1 text-sm">
        <p className="text-zinc-500 dark:text-zinc-400">
          Months:{" "}
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {projection.months}
          </span>
        </p>
        <p className="text-zinc-500 dark:text-zinc-400">
          Total interest:{" "}
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {formatCurrency(projection.totalInterest)}
          </span>
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  optional,
  children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-zinc-700 dark:text-zinc-300">
        {label} {optional && <span className="font-normal text-zinc-400">(optional)</span>}
      </span>
      {children}
    </label>
  );
}
