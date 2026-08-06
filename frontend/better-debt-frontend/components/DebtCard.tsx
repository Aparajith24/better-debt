"use client";

import type { Debt } from "@/lib/api";

const TYPE_LABELS: Record<Debt["type"], string> = {
  CREDIT_CARD: "Credit card",
  PERSONAL_LOAN: "Personal loan",
  EMI: "EMI",
  BNPL: "BNPL",
  OTHER: "Other",
};

function formatCurrency(value: string) {
  return `₹${Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface DebtCardProps {
  debt: Debt;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}

export function DebtCard({ debt, onEdit, onDelete, deleting }: DebtCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{debt.name}</h3>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {TYPE_LABELS[debt.type]}
            {debt.rateType === "FLAT" && " · flat rate"}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            disabled={deleting}
            className="text-sm text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-x-4 gap-y-2 text-sm">
        <Stat label="Balance" value={formatCurrency(debt.currentBalance)} />
        <Stat
          label={debt.rateType === "FLAT" ? "Flat rate" : "APR"}
          value={`${Number(debt.interestRateAnnual).toFixed(2)}%`}
        />
        <Stat
          label="Min payment"
          value={debt.minPayment ? formatCurrency(debt.minPayment) : "—"}
        />
      </div>
    </div>
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
