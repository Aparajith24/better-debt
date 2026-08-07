import Link from "next/link";

const CALCULATORS = [
  {
    href: "/calculators/payoff-plan",
    title: "Payoff plan",
    description:
      "Compare avalanche vs snowball across all your saved debts and see the exact interest and time difference.",
  },
  {
    href: "/calculators/single-debt",
    title: "Single debt projection",
    description: "See how long one debt takes to clear, and the total interest, at a fixed monthly payment.",
  },
  {
    href: "/calculators/flat-rate",
    title: "Flat rate normalizer",
    description:
      "Convert a \"flat rate\" EMI into the reducing-balance APR it's actually equivalent to.",
  },
  {
    href: "/calculators/credit-card",
    title: "Credit card grace period",
    description:
      "See what continuing to spend on a card costs you in extra interest once you're carrying a balance.",
  },
  {
    href: "/calculators/prepayment",
    title: "Prepayment impact",
    description:
      "A lump sum can lower your payment or shorten your tenure — see exactly what each is worth in saved interest.",
  },
];

export default function CalculatorsPage() {
  return (
    <div className="flex flex-1 justify-center bg-zinc-50 dark:bg-black">
      <main className="w-full max-w-7xl px-6 py-8 lg:px-10">
        <h1 className="mb-8 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Calculators
        </h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {CALCULATORS.map((calc) => (
            <Link
              key={calc.href}
              href={calc.href}
              className="rounded-xl border border-zinc-200 bg-white p-6 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600"
            >
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">{calc.title}</h2>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{calc.description}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
