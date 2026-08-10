"use client";

import Link from "next/link";
import type { ActiveTrackedPlan, ProgressStatus } from "@/lib/api";
import { useAbandonTrackedPlan } from "@/lib/queries";
import { formatCurrency } from "@/lib/format";

const VERDICT_STYLES: Record<ProgressStatus, { wrap: string; label: string }> = {
  AHEAD: {
    wrap: "border-emerald-400/30 bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-600 dark:border-emerald-500/30 dark:from-emerald-700 dark:via-emerald-600 dark:to-teal-700",
    label: "Ahead of plan",
  },
  ON_TRACK: {
    wrap: "border-amber-400/30 bg-gradient-to-br from-amber-500 via-amber-500 to-yellow-500 dark:border-amber-500/30 dark:from-amber-600 dark:via-amber-600 dark:to-yellow-600",
    label: "On track",
  },
  BEHIND: {
    wrap: "border-red-400/30 bg-gradient-to-br from-red-600 via-red-600 to-rose-700 dark:border-red-500/30 dark:from-red-700 dark:via-red-700 dark:to-rose-800",
    label: "Behind plan",
  },
  COMPLETED: {
    wrap: "border-emerald-400/30 bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-600 dark:border-emerald-500/30 dark:from-emerald-700 dark:via-emerald-600 dark:to-teal-700",
    label: "Plan complete 🎉",
  },
};

// The dashboard's second decision card: PayoffHero says "here's what to do";
// this one says "here's how you're doing against what you committed to" —
// inferred from each tracked debt's existing currentBalance, no separate
// payment log to maintain.
export function TrackedPlanCard({ data }: { data: ActiveTrackedPlan }) {
  const { plan, progress } = data;
  const style = VERDICT_STYLES[progress.status];
  const abandonPlan = useAbandonTrackedPlan();
  const delta = Number(progress.delta);

  return (
    <div className={`mb-8 rounded-xl border p-6 text-white ${style.wrap}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold">
            {style.label} — month {progress.elapsedMonths} of {progress.totalMonths}
          </p>
          <p className="mt-1 text-sm opacity-90">
            Expected combined balance {formatCurrency(progress.expectedBalance)}, actual{" "}
            {formatCurrency(progress.actualBalance)}
            {delta !== 0 &&
              ` — you're ${formatCurrency(Math.abs(delta))} ${delta < 0 ? "ahead" : "behind"}.`}
          </p>
          <p className="mt-1 text-xs capitalize opacity-75">
            Tracking the {plan.strategy} plan you saved
            {progress.missingDebtIds.length > 0 &&
              ` — ${progress.missingDebtIds.length} tracked debt(s) already paid off and removed`}
            .
          </p>
        </div>
        {progress.status !== "COMPLETED" && (
          <button
            onClick={() => abandonPlan.mutate(plan.id)}
            disabled={abandonPlan.isPending}
            className="shrink-0 rounded-md border border-white/30 px-2.5 py-1 text-xs font-medium text-white/90 hover:bg-white/10 disabled:opacity-50"
          >
            {abandonPlan.isPending ? "Stopping…" : "Stop tracking"}
          </button>
        )}
      </div>
    </div>
  );
}

export function TrackedPlanCta() {
  return (
    <div className="mb-8 rounded-xl border border-dashed border-zinc-300 bg-white p-5 text-sm dark:border-zinc-700 dark:bg-zinc-900">
      <p className="text-zinc-600 dark:text-zinc-400">
        Pick a payoff strategy and{" "}
        <Link href="/calculators/payoff-plan" className="font-medium text-zinc-900 underline dark:text-zinc-50">
          save it to track your progress
        </Link>{" "}
        month to month.
      </p>
    </div>
  );
}
