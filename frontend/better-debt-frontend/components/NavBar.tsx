"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Debts" },
  { href: "/calculators", label: "Calculators" },
  { href: "/loan-offer-check", label: "Check a loan offer" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center gap-6 px-6 py-4">
        <span className="font-semibold text-zinc-900 dark:text-zinc-50">Better Debt</span>
        {LINKS.map((link) => {
          const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={
                active
                  ? "text-sm font-medium text-zinc-900 dark:text-zinc-50"
                  : "text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
              }
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
