"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { api, ApiError, type BalanceTransferResult } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { InfoTooltip } from "@/components/InfoTooltip";

export default function BalanceTransferPage() {
  const [currentBalance, setCurrentBalance] = useState("");
  const [currentRateAnnual, setCurrentRateAnnual] = useState("");
  const [monthlyPayment, setMonthlyPayment] = useState("");
  const [transferFeeType, setTransferFeeType] = useState<"PERCENT" | "FLAT">("PERCENT");
  const [transferFeeValue, setTransferFeeValue] = useState("");
  const [teaserRateAnnual, setTeaserRateAnnual] = useState("");
  const [teaserMonths, setTeaserMonths] = useState("");
  const [postTeaserRateAnnual, setPostTeaserRateAnnual] = useState("");
  const [addFeeToBalance, setAddFeeToBalance] = useState(true);
  const [result, setResult] = useState<BalanceTransferResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setRunning(true);
    try {
      setResult(
        await api.balanceTransfer({
          currentBalance: Number(currentBalance),
          currentRateAnnual: Number(currentRateAnnual),
          monthlyPayment: Number(monthlyPayment),
          transferFeeType,
          transferFeeValue: Number(transferFeeValue),
          teaserRateAnnual: Number(teaserRateAnnual),
          teaserMonths: Number(teaserMonths),
          postTeaserRateAnnual: Number(postTeaserRateAnnual),
          addFeeToBalance,
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
          Balance transfer break-even
        </h1>
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          Moving a debt to a new card or loan usually costs you an upfront fee, in exchange for a
          low introductory rate that goes away after a while. See exactly when the money you save
          on interest makes up for that fee.
        </p>

        <div className="lg:grid lg:grid-cols-[360px_1fr] lg:items-start lg:gap-6">
          <form
            onSubmit={handleSubmit}
            className="mb-6 flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 lg:mb-0 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <Field label="What you currently owe (₹)">
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
            <Field
              label="Your current interest rate (%)"
              info="This is your APR — the yearly interest rate you're being charged on this debt right now, before any transfer. You'll find it on your statement."
            >
              <input
                required
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={currentRateAnnual}
                onChange={(e) => setCurrentRateAnnual(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="How much you can pay each month (₹)">
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

            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Field
                label="Transfer fee"
                info="The one-time charge the new card or lender takes for letting you move your debt to them. Often shown as a percentage of the balance you're moving, e.g. '3% transfer fee' — sometimes it's a flat amount instead."
              >
                <input
                  required
                  type="number"
                  min={0}
                  step="0.01"
                  value={transferFeeValue}
                  onChange={(e) => setTransferFeeValue(e.target.value)}
                  className="input"
                  placeholder={transferFeeType === "PERCENT" ? "e.g. 3" : "e.g. 500"}
                />
              </Field>
              <Field label="Type">
                <select
                  value={transferFeeType}
                  onChange={(e) => setTransferFeeType(e.target.value as "PERCENT" | "FLAT")}
                  className="input"
                >
                  <option value="PERCENT">%</option>
                  <option value="FLAT">₹</option>
                </select>
              </Field>
            </div>

            <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={addFeeToBalance}
                onChange={(e) => setAddFeeToBalance(e.target.checked)}
              />
              Tack the fee onto my new balance
              <InfoTooltip text="Most transfers add the fee straight onto the balance you're moving, so you owe (and pay interest on) a bit more from day one. Uncheck this only if you're paying the fee separately, out of pocket." />
            </label>

            <Field
              label="Introductory rate (%)"
              info="The special low rate — often 0% — that the new card or lender offers for a limited time to win your business. This is not the rate you'll pay forever."
            >
              <input
                required
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={teaserRateAnnual}
                onChange={(e) => setTeaserRateAnnual(e.target.value)}
                className="input"
                placeholder="e.g. 0"
              />
            </Field>
            <Field
              label="How long that low rate lasts (months)"
              info="The introductory rate only lasts for a limited window — e.g. '0% for 12 months.' After this many months, the rate jumps up to the regular rate below."
            >
              <input
                required
                type="number"
                min={1}
                step="1"
                value={teaserMonths}
                onChange={(e) => setTeaserMonths(e.target.value)}
                className="input"
              />
            </Field>
            <Field
              label="Rate once the intro period ends (%)"
              info="The regular, ongoing interest rate the new card or lender charges once the introductory offer expires. This is usually much higher than the intro rate — check the fine print."
            >
              <input
                required
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={postTeaserRateAnnual}
                onChange={(e) => setPostTeaserRateAnnual(e.target.value)}
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

          {result && <ResultView result={result} />}
        </div>
      </main>
    </div>
  );
}

function ResultView({ result }: { result: BalanceTransferResult }) {
  const netSavings = Number(result.netSavings);

  return (
    <div className="flex flex-col gap-4">
      <div
        className={`rounded-xl border p-6 text-white dark:text-zinc-900 ${
          result.worthIt
            ? "border-zinc-900 bg-zinc-900 dark:border-zinc-100 dark:bg-zinc-100"
            : "border-red-900 bg-red-900 dark:border-red-200 dark:bg-red-200"
        }`}
      >
        <p className="text-sm font-semibold">
          {result.worthIt
            ? `Transferring leaves you ${formatCurrency(netSavings)} better off, even after paying the fee.`
            : `Transferring leaves you ${formatCurrency(Math.abs(netSavings))} worse off, once the fee is factored in.`}
        </p>
        <p className="mt-1 flex items-start gap-1.5 text-sm opacity-80">
          <span>
            {result.breakEvenMonths !== null
              ? `You break even in month ${result.breakEvenMonths} — that's when the interest you've saved so far adds up to more than the ${formatCurrency(
                  result.fee,
                )} fee you paid.`
              : `The interest you'd save never adds up to more than the ${formatCurrency(result.fee)} fee, across the whole time it takes to pay this off either way.`}
          </span>
          <InfoTooltip text="Break-even is the point where you've saved enough on interest to cover what the transfer cost you upfront. Before that month, you're technically behind — after it, you're ahead." />
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ScenarioCard
          title="Stay put"
          subtitle="No transfer — current rate the whole way"
          projection={result.staying}
        />
        <ScenarioCard
          title="Transfer"
          subtitle={`Balance ${formatCurrency(result.transferredBalance)} — fee ${formatCurrency(
            result.fee,
          )}`}
          projection={result.transferred}
        />
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5 text-sm dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-zinc-500 dark:text-zinc-400">
          Interest saved by transferring: {formatCurrency(result.interestSaved)}. After the{" "}
          {formatCurrency(result.fee)} fee, that&apos;s a net{" "}
          {netSavings >= 0 ? "savings" : "cost"} of {formatCurrency(Math.abs(netSavings))} by the
          time both plans are paid off.
        </p>
      </div>
    </div>
  );
}

function ScenarioCard({
  title,
  subtitle,
  projection,
}: {
  title: string;
  subtitle: string;
  projection: BalanceTransferResult["staying"];
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
      <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
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
        <p className="text-zinc-500 dark:text-zinc-400">
          Total paid:{" "}
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {formatCurrency(projection.totalPaid)}
          </span>
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  info,
  children,
}: {
  label: string;
  info?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="flex items-center gap-1.5 font-medium text-zinc-700 dark:text-zinc-300">
        {label}
        {info && <InfoTooltip text={info} />}
      </span>
      {children}
    </label>
  );
}
