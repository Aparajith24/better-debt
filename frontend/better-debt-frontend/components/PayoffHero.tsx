import Link from "next/link";
import type { PayoffPlanComparison } from "@/lib/api";
import { formatCurrency, formatMonthsFromNow } from "@/lib/format";

interface PayoffHeroProps {
  plan: PayoffPlanComparison;
  nameFor: (id: string) => string;
}

// The dashboard's headline decision: running avalanche vs snowball on the
// user's actual saved debts, right now, instead of making them re-enter
// everything into a separate calculator to find out.
export function PayoffHero({ plan, nameFor }: PayoffHeroProps) {
  const { avalanche, snowball, comparison } = plan;
  const target = avalanche.payoffOrder[0];
  const interestSaved = Number(comparison.interestSavedByAvalanche);

  return (
    <div
      className={`mb-8 rounded-xl border p-6 text-white ${
        avalanche.payoffAchieved
          ? "border-emerald-400/30 bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-600 dark:border-emerald-500/30 dark:from-emerald-700 dark:via-emerald-600 dark:to-teal-700"
          : "border-amber-400/30 bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 dark:border-amber-500/30 dark:from-amber-600 dark:via-orange-600 dark:to-red-600"
      }`}
    >
      {!avalanche.payoffAchieved ? (
        <p className="text-sm font-semibold">
          At your current minimum payments, at least one debt never gets paid off — the interest
          outpaces what you're putting toward it.
        </p>
      ) : (
        <>
          <p className="text-sm font-semibold">
            Debt-free by {formatMonthsFromNow(avalanche.totalMonths)} if you pay debts off highest
            rate first
            {target && (
              <>
                {" "}
                — start with <span className="underline">{nameFor(target)}</span>.
              </>
            )}
          </p>
          <p className="mt-1 text-sm opacity-80">
            That order (avalanche) saves {formatCurrency(interestSaved)} in interest
            {comparison.monthsSavedByAvalanche > 0 &&
              ` and finishes ${comparison.monthsSavedByAvalanche} months sooner`}{" "}
            compared to paying smallest balances first (snowball, done by{" "}
            {formatMonthsFromNow(snowball.totalMonths)}).
          </p>
        </>
      )}
      <Link
        href="/calculators/payoff-plan"
        className="mt-3 inline-block text-sm underline opacity-90 hover:opacity-100"
      >
        See the full month-by-month plan →
      </Link>
    </div>
  );
}
