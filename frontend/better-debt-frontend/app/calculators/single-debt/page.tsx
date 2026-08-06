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
      <main className="w-full max-w-xl px-6 py-12">
        <Link href="/calculators" className="text-sm text-zinc-500 hover:underline">
          ← Calculators
        </Link>
        <h1 className="mt-2 mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Single debt projection
        </h1>
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          How long will this debt take to clear at a fixed monthly payment?
        </p>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
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
        </form>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}

        {result && (
          <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            {!result.payoffAchieved && (
              <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                This payment doesn&apos;t cover the monthly interest — the balance will never
                shrink at this rate.
              </p>
            )}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <Stat label="Months to pay off" value={result.months.toString()} />
              <Stat label="Total interest" value={formatCurrency(result.totalInterest)} />
              <Stat label="Total paid" value={formatCurrency(result.totalPaid)} />
            </div>
          </div>
        )}
      </main>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-zinc-400">{label}</div>
      <div className="font-medium text-zinc-900 dark:text-zinc-100">{value}</div>
    </div>
  );
}
