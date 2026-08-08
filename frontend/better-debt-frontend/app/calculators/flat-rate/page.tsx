"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { api, ApiError, type FlatRateNormalization } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

export default function FlatRatePage() {
  const [principal, setPrincipal] = useState("");
  const [flatRateAnnual, setFlatRateAnnual] = useState("");
  const [tenureMonths, setTenureMonths] = useState("");
  const [result, setResult] = useState<FlatRateNormalization | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setRunning(true);
    try {
      setResult(
        await api.normalizeFlatRate({
          principal: Number(principal),
          flatRateAnnual: Number(flatRateAnnual),
          tenureMonths: Number(tenureMonths),
        }),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not normalize this rate.");
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
          Flat rate normalizer
        </h1>
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          A &quot;flat rate&quot; loan costs more than the quoted % suggests. See its real
          reducing-balance APR.
        </p>

        <div className="lg:grid lg:grid-cols-[360px_1fr] lg:items-start lg:gap-6">
          <form
            onSubmit={handleSubmit}
            className="mb-6 flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 lg:mb-0 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <Field label="Original loan amount (₹)">
              <input
                required
                type="number"
                min={0}
                step="0.01"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Flat rate (annual %)">
              <input
                required
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={flatRateAnnual}
                onChange={(e) => setFlatRateAnnual(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Tenure (months)">
              <input
                required
                type="number"
                min={1}
                step="1"
                value={tenureMonths}
                onChange={(e) => setTenureMonths(e.target.value)}
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
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-zinc-900 bg-zinc-900 p-6 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900">
                <p className="text-sm">
                  A {result.flatRateAnnual}% flat rate on this loan is actually equivalent to a{" "}
                  <span className="font-semibold">{result.equivalentReducingBalanceAPR}%</span>{" "}
                  reducing-balance APR — {result.multiplier}x higher than it looks.
                </p>
                <p className="mt-3 text-sm opacity-80">
                  Monthly EMI: {formatCurrency(result.monthlyEMI)}
                </p>
              </div>

              <RateComparisonBars
                quoted={Number(result.flatRateAnnual)}
                effective={Number(result.equivalentReducingBalanceAPR)}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function RateComparisonBars({ quoted, effective }: { quoted: number; effective: number }) {
  const max = Math.max(quoted, effective) * 1.15;
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="mb-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Quoted vs. true rate
      </h3>
      <div className="flex flex-col gap-4">
        <RateBar label="Quoted (flat)" value={quoted} max={max} barClassName="bg-[#eb6834] dark:bg-[#d95926]" />
        <RateBar
          label="Effective (reducing-balance)"
          value={effective}
          max={max}
          barClassName="bg-[#2a78d6] dark:bg-[#3987e5]"
        />
      </div>
    </div>
  );
}

function RateBar({
  label,
  value,
  max,
  barClassName,
}: {
  label: string;
  value: number;
  max: number;
  barClassName: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <span>{label}</span>
        <span className="font-medium text-zinc-900 dark:text-zinc-100">{value.toFixed(2)}%</span>
      </div>
      <div className="h-4 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div className={`h-full rounded-full ${barClassName}`} style={{ width: `${pct}%` }} />
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
