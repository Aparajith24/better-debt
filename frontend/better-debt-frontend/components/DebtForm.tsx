"use client";

import { useState, type FormEvent } from "react";
import { ApiError, type Debt, type DebtInput, type DebtType } from "@/lib/api";

const DEBT_TYPE_OPTIONS: { value: DebtType; label: string }[] = [
  { value: "CREDIT_CARD", label: "Credit card" },
  { value: "PERSONAL_LOAN", label: "Personal loan" },
  { value: "EMI", label: "EMI" },
  { value: "BNPL", label: "BNPL" },
  { value: "OTHER", label: "Other" },
];

interface DebtFormProps {
  initial?: Debt;
  onSubmit: (input: DebtInput) => Promise<void>;
  onCancel: () => void;
}

export function DebtForm({ initial, onSubmit, onCancel }: DebtFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<DebtType>(initial?.type ?? "CREDIT_CARD");
  const [currentBalance, setCurrentBalance] = useState(initial?.currentBalance ?? "");
  const [isFlat, setIsFlat] = useState(initial?.rateType === "FLAT");
  const [interestRateAnnual, setInterestRateAnnual] = useState(
    initial?.interestRateAnnual ?? "",
  );
  const [principal, setPrincipal] = useState(initial?.principal ?? "");
  const [tenureMonths, setTenureMonths] = useState(
    initial?.tenureMonths?.toString() ?? "",
  );
  const [minPayment, setMinPayment] = useState(initial?.minPayment ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (isFlat && (!principal || !tenureMonths)) {
      setError("Original amount and tenure are needed to work out a flat rate's real cost.");
      return;
    }

    const input: DebtInput = {
      name,
      type,
      currentBalance: Number(currentBalance),
      rateType: isFlat ? "FLAT" : "REDUCING",
      interestRateAnnual: Number(interestRateAnnual),
      ...(principal ? { principal: Number(principal) } : {}),
      ...(tenureMonths ? { tenureMonths: Number(tenureMonths) } : {}),
      ...(minPayment ? { minPayment: Number(minPayment) } : {}),
    };

    setSubmitting(true);
    try {
      await onSubmit(input);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
    >
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="HDFC Credit Card"
          />
        </Field>

        <Field label="Type">
          <select value={type} onChange={(e) => setType(e.target.value as DebtType)} className="input">
            {DEBT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </Field>

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

        <Field label={isFlat ? "Flat rate (%)" : "Interest rate (APR %)"}>
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

        <Field label="Minimum payment (₹)" optional>
          <input
            type="number"
            min={0}
            step="0.01"
            value={minPayment}
            onChange={(e) => setMinPayment(e.target.value)}
            className="input"
          />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
        <input
          type="checkbox"
          checked={isFlat}
          onChange={(e) => setIsFlat(e.target.checked)}
          className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
        />
        This is a flat rate (common for consumer-durable EMIs) — the rate quoted looks
        low but costs more than an equivalent APR.
      </label>

      {isFlat && (
        <div className="grid grid-cols-1 gap-4 rounded-lg bg-zinc-50 p-4 sm:grid-cols-2 dark:bg-zinc-800/50">
          <Field label="Original loan amount (₹)" hint="What you borrowed, not what's left to pay">
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

          <Field label="Total tenure (months)" hint="The full loan term, not months remaining">
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
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {submitting ? "Saving…" : initial ? "Save changes" : "Add debt"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  optional,
  hint,
  children,
}: {
  label: string;
  optional?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-zinc-700 dark:text-zinc-300">
        {label} {optional && <span className="font-normal text-zinc-400">(optional)</span>}
      </span>
      {children}
      {hint && <span className="text-xs text-zinc-400">{hint}</span>}
    </label>
  );
}
