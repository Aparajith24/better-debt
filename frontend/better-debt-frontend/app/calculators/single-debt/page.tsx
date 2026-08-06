"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { api, ApiError, type SingleDebtProjection } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

export default function SingleDebtPage() {
  const [balance, setBalance] = useState("");
  const [interestRateAnnual, setInterestRateAnnual] = useState("");
  const [monthlyPayment, setMonthlyPayment] = useState("");
  const [result, setResult] = useState<SingleDebtProjection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setRunning(true);
    try {
      setResult(
        await api.singleDebtProjection({
          balance: Number(balance),
          interestRateAnnual: Number(interestRateAnnual),
          monthlyPayment: Number(monthlyPayment),
        }),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not run the projection.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-1 justify-center bg-zinc-50 dark:bg-black">
      <main className="w-full max-w-5xl px-6 py-8 lg:px-10">
        <Link href="/calculators" className="text-sm text-zinc-500 hover:underline">
          ← Calculators
        </Link>
        <h1 className="mt-2 mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Single debt projection
        </h1>
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          How long will this debt take to clear at a fixed monthly payment?
        </p>

        <div className="lg:grid lg:grid-cols-[360px_1fr] lg:items-start lg:gap-6">
          <form
            onSubmit={handleSubmit}
            className="mb-6 flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 lg:mb-0 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <Field label="Balance (₹)">
              <input
                required
                type="number"
                min={0}
                step="0.01"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
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
            <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              {!result.payoffAchieved && (
                <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                  This payment doesn&apos;t cover the monthly interest — the balance will never
                  shrink at this rate.
                </p>
              )}
              <div className="grid grid-cols-3 gap-6">
                <BigStat label="Months to pay off" value={result.months.toString()} />
                <BigStat label="Total interest" value={formatCurrency(result.totalInterest)} />
                <BigStat label="Total paid" value={formatCurrency(result.totalPaid)} />
              </div>

              {result.payoffAchieved && (
                <CompositionBar
                  principal={Number(result.totalPaid) - Number(result.totalInterest)}
                  interest={Number(result.totalInterest)}
                />
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function CompositionBar({ principal, interest }: { principal: number; interest: number }) {
  const total = principal + interest;
  const principalPct = total > 0 ? (principal / total) * 100 : 0;
  return (
    <div className="mt-8">
      <div className="mb-1 flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <span>Principal vs. interest</span>
        <span>{principalPct.toFixed(0)}% principal</span>
      </div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div className="h-full bg-[#2a78d6] dark:bg-[#3987e5]" style={{ width: `${principalPct}%` }} />
        <div className="h-full bg-[#eb6834] dark:bg-[#d95926]" style={{ width: `${100 - principalPct}%` }} />
      </div>
      <div className="mt-2 flex gap-4 text-xs text-zinc-500 dark:text-zinc-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-[#2a78d6] dark:bg-[#3987e5]" />
          Principal
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-[#eb6834] dark:bg-[#d95926]" />
          Interest
        </span>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
      {children}
    </label>
  );
}

function BigStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-zinc-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{value}</div>
    </div>
  );
}
