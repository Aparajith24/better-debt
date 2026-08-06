"use client";

import { useId, useMemo, useState } from "react";
import type { MultiDebtPlan } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

interface BalanceChartProps {
  avalanche: MultiDebtPlan;
  snowball: MultiDebtPlan;
}

const WIDTH = 640;
const HEIGHT = 280;
const PAD = { top: 16, right: 16, bottom: 28, left: 64 };
const PLOT_W = WIDTH - PAD.left - PAD.right;
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;

function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

// Pads a plan's per-month balance to a common length so both lines share an
// x-axis — a strategy that finishes sooner just flatlines at zero afterward.
function toSeries(plan: MultiDebtPlan, months: number): number[] {
  const values = plan.monthlySummary.map((m) => Number(m.totalBalance));
  return Array.from({ length: months }, (_, i) => values[i] ?? 0);
}

export function BalanceChart({ avalanche, snowball }: BalanceChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const gradientId = useId();

  const months = Math.max(avalanche.monthlySummary.length, snowball.monthlySummary.length);
  const avalancheSeries = useMemo(() => toSeries(avalanche, months), [avalanche, months]);
  const snowballSeries = useMemo(() => toSeries(snowball, months), [snowball, months]);

  const yMax = niceMax(Math.max(...avalancheSeries, ...snowballSeries));
  const xFor = (i: number) => PAD.left + (i / (months - 1 || 1)) * PLOT_W;
  const yFor = (v: number) => PAD.top + PLOT_H - (v / yMax) * PLOT_H;

  const avalanchePath = avalancheSeries.map((v, i) => `${i === 0 ? "M" : "L"}${xFor(i)},${yFor(v)}`).join(" ");
  const snowballPath = snowballSeries.map((v, i) => `${i === 0 ? "M" : "L"}${xFor(i)},${yFor(v)}`).join(" ");

  const yTicks = [0, yMax * 0.25, yMax * 0.5, yMax * 0.75, yMax];
  const xTickEvery = Math.max(1, Math.ceil(months / 6));

  function handleMove(e: React.MouseEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.min(1, Math.max(0, (x - PAD.left) / PLOT_W));
    setHoverIndex(Math.round(ratio * (months - 1)));
  }

  return (
    <div className="[--c-avalanche:#2a78d6] dark:[--c-avalanche:#3987e5] [--c-snowball:#eb6834] dark:[--c-snowball:#d95926] rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Balance over time
        </h3>
        <div className="flex items-center gap-4">
          <Legend />
          <button
            onClick={() => setShowTable((s) => !s)}
            className="text-xs text-zinc-500 hover:underline dark:text-zinc-400"
          >
            {showTable ? "View chart" : "View table"}
          </button>
        </div>
      </div>

      {showTable ? (
        <div className="max-h-72 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-white dark:bg-zinc-900">
              <tr className="text-zinc-400">
                <th className="py-1 font-normal">Month</th>
                <th className="py-1 font-normal">Avalanche balance</th>
                <th className="py-1 font-normal">Snowball balance</th>
              </tr>
            </thead>
            <tbody>
              {avalancheSeries.map((v, i) => (
                <tr key={i} className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="py-1 text-zinc-500 dark:text-zinc-400">{i + 1}</td>
                  <td className="py-1 tabular-nums text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(v)}
                  </td>
                  <td className="py-1 tabular-nums text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(snowballSeries[i])}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Balance over time for avalanche vs snowball">
            <defs>
              <clipPath id={gradientId}>
                <rect x={PAD.left} y={PAD.top} width={PLOT_W} height={PLOT_H} />
              </clipPath>
            </defs>

            {yTicks.map((t) => (
              <g key={t}>
                <line
                  x1={PAD.left}
                  x2={WIDTH - PAD.right}
                  y1={yFor(t)}
                  y2={yFor(t)}
                  stroke="currentColor"
                  className="text-zinc-200 dark:text-zinc-800"
                  strokeWidth={1}
                />
                <text
                  x={PAD.left - 8}
                  y={yFor(t)}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="fill-zinc-400 text-[10px]"
                >
                  {formatCurrency(t).replace(".00", "")}
                </text>
              </g>
            ))}

            {Array.from({ length: months }, (_, i) => i).map(
              (i) =>
                (i % xTickEvery === 0 || i === months - 1) && (
                  <text
                    key={i}
                    x={xFor(i)}
                    y={HEIGHT - 8}
                    textAnchor="middle"
                    className="fill-zinc-400 text-[10px]"
                  >
                    {i + 1}
                  </text>
                ),
            )}

            <path d={snowballPath} fill="none" stroke="var(--c-snowball)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            <path d={avalanchePath} fill="none" stroke="var(--c-avalanche)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

            {hoverIndex !== null && (
              <>
                <line
                  x1={xFor(hoverIndex)}
                  x2={xFor(hoverIndex)}
                  y1={PAD.top}
                  y2={PAD.top + PLOT_H}
                  stroke="currentColor"
                  className="text-zinc-300 dark:text-zinc-700"
                  strokeWidth={1}
                />
                <circle cx={xFor(hoverIndex)} cy={yFor(avalancheSeries[hoverIndex])} r={5} fill="var(--c-avalanche)" stroke="var(--surface,white)" className="stroke-white dark:stroke-zinc-900" strokeWidth={2} />
                <circle cx={xFor(hoverIndex)} cy={yFor(snowballSeries[hoverIndex])} r={5} fill="var(--c-snowball)" stroke="var(--surface,white)" className="stroke-white dark:stroke-zinc-900" strokeWidth={2} />
              </>
            )}

            <rect
              x={PAD.left}
              y={PAD.top}
              width={PLOT_W}
              height={PLOT_H}
              fill="transparent"
              onMouseMove={handleMove}
              onMouseLeave={() => setHoverIndex(null)}
            />
          </svg>

          {hoverIndex !== null && (
            <div
              className="pointer-events-none absolute top-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-sm dark:border-zinc-700 dark:bg-zinc-800"
              style={{
                left: `${Math.min(78, (xFor(hoverIndex) / WIDTH) * 100)}%`,
              }}
            >
              <div className="mb-1 font-medium text-zinc-700 dark:text-zinc-300">
                Month {hoverIndex + 1}
              </div>
              <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                <span className="inline-block h-0.5 w-3" style={{ background: "var(--c-avalanche)" }} />
                Avalanche: <span className="font-medium text-zinc-900 dark:text-zinc-100">{formatCurrency(avalancheSeries[hoverIndex])}</span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                <span className="inline-block h-0.5 w-3" style={{ background: "var(--c-snowball)" }} />
                Snowball: <span className="font-medium text-zinc-900 dark:text-zinc-100">{formatCurrency(snowballSeries[hoverIndex])}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-0.5 w-3" style={{ background: "var(--c-avalanche)" }} />
        Avalanche
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-0.5 w-3" style={{ background: "var(--c-snowball)" }} />
        Snowball
      </span>
    </div>
  );
}
