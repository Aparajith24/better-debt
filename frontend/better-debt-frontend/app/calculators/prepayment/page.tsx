"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { api, ApiError, type PrepaymentComparison } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

export default function PrepaymentPage() {
  const [balance, setBalance] = useState("");
  const [interestRateAnnual, setInterestRateAnnual] = useState("");
  const [monthlyPayment, setMonthlyPayment] = useState("");
  const [lumpSum, setLumpSum] = useState("");
  const [result, setResult] = useState<PrepaymentComparison | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setRunning(true);
    try {
      setResult(
        await api.prepayment({
          balance: Number(balance),
          interestRateAnnual: Number(interestRateAnnual),
          monthlyPayment: Number(monthlyPayment),
          lumpSum: Number(lumpSum),
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
          Prepayment impact
        </h1>
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          A lump sum can either keep your payment the same and finish sooner, or keep the tenure
          the same and lower your payment. See what each is actually worth.
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
            <Field label="Current monthly payment (₹)">
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
            <Field label="Lump sum to prepay (₹)">
              <input
                required
                type="number"
                min={0}
                step="0.01"
                value={lumpSum}
                onChange={(e) => setLumpSum(e.target.value)}
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

          {result && <ResultView result={result} monthlyPayment={monthlyPayment} />}
        </div>
      </main>
    </div>
  );
}

function ResultView({
  result,
  monthlyPayment,
}: {
  result: PrepaymentComparison;
  monthlyPayment: string;
}) {
  const tenureSaved = Number(result.reduceTenure.interestSaved);
  const emiSaved = Number(result.reduceEMI.interestSaved);
  const diff = tenureSaved - emiSaved;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-zinc-900 bg-zinc-900 p-6 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900">
        <p className="text-sm font-semibold">
          Reducing your tenure saves {formatCurrency(diff)} more in interest than reducing your
          EMI.
        </p>
        <p className="mt-1 text-sm opacity-80">
          Same {formatCurrency(result.lumpSum)} lump sum, applied two different ways — the choice
          is entirely about whether you want the benefit as a lower monthly payment or as
          finishing sooner.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-900 bg-white p-6 dark:border-zinc-100 dark:bg-zinc-900">
          <h3 className="mb-1 font-semibold text-zinc-900 dark:text-zinc-50">
            Reduce tenure
          </h3>
          <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
            Keep paying {formatCurrency(monthlyPayment)} — same payment, fewer months
          </p>
          <div className="flex flex-col gap-2 text-sm">
            <Row
              label="New payoff time"
              value={`${result.reduceTenure.months} months`}
              sub={`${result.reduceTenure.monthsSaved} months sooner`}
            />
            <Row
              label="Total interest"
              value={formatCurrency(result.reduceTenure.totalInterest)}
              sub={`saves ${formatCurrency(result.reduceTenure.interestSaved)}`}
            />
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-1 font-semibold text-zinc-900 dark:text-zinc-50">Reduce EMI</h3>
          <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
            Same {result.baseline.months} months — smaller payment
          </p>
          <div className="flex flex-col gap-2 text-sm">
            <Row
              label="New monthly payment"
              value={formatCurrency(result.reduceEMI.newMonthlyPayment)}
              sub={`${formatCurrency(result.reduceEMI.paymentReduction)} less per month`}
            />
            <Row
              label="Total interest"
              value={formatCurrency(result.reduceEMI.totalInterest)}
              sub={`saves ${formatCurrency(result.reduceEMI.interestSaved)}`}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5 text-sm dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-zinc-500 dark:text-zinc-400">
          Without any prepayment: {result.baseline.months} months,{" "}
          {formatCurrency(result.baseline.totalInterest)} in total interest. After a{" "}
          {formatCurrency(result.lumpSum)} lump sum, the balance drops to{" "}
          {formatCurrency(result.newBalanceAfterLumpSum)}.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className="text-right">
        <span className="font-medium text-zinc-900 dark:text-zinc-100">{value}</span>
        <span className="ml-2 text-xs text-emerald-600 dark:text-emerald-400">{sub}</span>
      </span>
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
