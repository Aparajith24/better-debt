"use client";

import { useRef, useState, type FormEvent } from "react";
import { ApiError, type DebtType, type ExtractedLoanTerms, type LoanOfferCheckResult, type RateType } from "@/lib/api";
import { useExtractLoanOffer, useScoreLoanOffer } from "@/lib/queries";
import { formatCurrency } from "@/lib/format";
import { InfoTooltip } from "@/components/InfoTooltip";

const DEBT_TYPE_OPTIONS: { value: DebtType; label: string }[] = [
  { value: "CREDIT_CARD", label: "Credit card" },
  { value: "PERSONAL_LOAN", label: "Personal loan" },
  { value: "EMI", label: "EMI" },
  { value: "BNPL", label: "BNPL" },
  { value: "OTHER", label: "Other" },
];

interface FormState {
  lenderName: string;
  loanType: DebtType;
  principal: string;
  tenureMonths: string;
  rateType: RateType;
  quotedRateAnnual: string;
  processingFeeValue: string;
  otherUpfrontFees: string;
  prepaymentPenaltyPercent: string;
  teaserRateAnnual: string;
  teaserMonths: string;
  postTeaserRateAnnual: string;
}

function formStateFromExtraction(extracted: ExtractedLoanTerms): FormState {
  const str = (n: number | null) => (n === null ? "" : String(n));
  return {
    lenderName: extracted.lenderName ?? "",
    loanType: extracted.loanType ?? "OTHER",
    principal: str(extracted.principal),
    tenureMonths: str(extracted.tenureMonths),
    rateType: extracted.rateType ?? "REDUCING",
    quotedRateAnnual: str(extracted.quotedRateAnnual),
    processingFeeValue: str(extracted.processingFeeValue),
    otherUpfrontFees: extracted.otherUpfrontFees === null ? "0" : String(extracted.otherUpfrontFees),
    prepaymentPenaltyPercent: str(extracted.prepaymentPenaltyPercent),
    teaserRateAnnual: str(extracted.teaserRateAnnual),
    teaserMonths: str(extracted.teaserMonths),
    postTeaserRateAnnual: str(extracted.postTeaserRateAnnual),
  };
}

export default function LoanOfferCheckPage() {
  const [form, setForm] = useState<FormState | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [result, setResult] = useState<LoanOfferCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractMutation = useExtractLoanOffer();
  const scoreMutation = useScoreLoanOffer();

  async function handleFileSelected(file: File) {
    setError(null);
    setResult(null);
    try {
      const { extracted } = await extractMutation.mutateAsync(file);
      setForm(formStateFromExtraction(extracted));
      setNotes(extracted.notes);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not read this PDF.");
    }
  }

  async function handleScore(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError(null);
    try {
      const scored = await scoreMutation.mutateAsync({
        lenderName: form.lenderName || undefined,
        loanType: form.loanType,
        principal: Number(form.principal),
        tenureMonths: Number(form.tenureMonths),
        rateType: form.rateType,
        quotedRateAnnual: Number(form.quotedRateAnnual),
        processingFeeValue: Number(form.processingFeeValue) || 0,
        otherUpfrontFees: Number(form.otherUpfrontFees) || 0,
        prepaymentPenaltyPercent: form.prepaymentPenaltyPercent ? Number(form.prepaymentPenaltyPercent) : undefined,
        teaserRateAnnual: form.teaserRateAnnual ? Number(form.teaserRateAnnual) : undefined,
        teaserMonths: form.teaserMonths ? Number(form.teaserMonths) : undefined,
        postTeaserRateAnnual: form.postTeaserRateAnnual ? Number(form.postTeaserRateAnnual) : undefined,
      });
      setResult(scored);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not score this offer.");
    }
  }

  function reset() {
    setForm(null);
    setResult(null);
    setNotes([]);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="flex flex-1 bg-zinc-50 dark:bg-black">
      <main className="w-full px-6 py-8 lg:px-10">
        <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Check a loan offer
        </h1>
        <p className="mb-6 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
          Upload a loan, EMI, BNPL, or credit-card offer PDF before you say yes. We read the terms
          off the page, you confirm them, and we compute the real annualized cost — fees and all —
          plus any red flags.
        </p>

        <div className="lg:grid lg:grid-cols-[420px_1fr] lg:items-start lg:gap-6">
          <div className="mb-6 flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 lg:mb-0 dark:border-zinc-800 dark:bg-zinc-900">
            {!form && !result && (
              <>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    Loan offer PDF
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelected(file);
                    }}
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-sm file:font-medium dark:border-zinc-700 dark:bg-zinc-900 dark:file:bg-zinc-800 dark:file:text-zinc-100"
                  />
                </label>
                {extractMutation.isPending && (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Reading the document…</p>
                )}
              </>
            )}

            {form && !result && (
              <form onSubmit={handleScore} className="flex flex-col gap-4">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Review these before scoring — anything left blank couldn&apos;t be found
                  automatically.
                </p>

                {notes.length > 0 && (
                  <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    <ul className="list-disc space-y-1 pl-4">
                      {notes.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <Field label="Lender name (optional)">
                  <input
                    value={form.lenderName}
                    onChange={(e) => setForm({ ...form, lenderName: e.target.value })}
                    className="input"
                  />
                </Field>
                <Field label="Type">
                  <select
                    value={form.loanType}
                    onChange={(e) => setForm({ ...form, loanType: e.target.value as DebtType })}
                    className="input"
                  >
                    {DEBT_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Loan amount (₹)">
                  <input
                    required
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.principal}
                    onChange={(e) => setForm({ ...form, principal: e.target.value })}
                    className="input"
                  />
                </Field>
                <Field label="Tenure (months)">
                  <input
                    required
                    type="number"
                    min={1}
                    step="1"
                    value={form.tenureMonths}
                    onChange={(e) => setForm({ ...form, tenureMonths: e.target.value })}
                    className="input"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Rate type"
                    info="Flat rate charges interest on the original amount the whole way through — it looks lower than it is. Reducing balance charges interest only on what's still owed."
                  >
                    <select
                      value={form.rateType}
                      onChange={(e) => setForm({ ...form, rateType: e.target.value as RateType })}
                      className="input"
                    >
                      <option value="REDUCING">Reducing balance</option>
                      <option value="FLAT">Flat rate</option>
                    </select>
                  </Field>
                  <Field label="Quoted rate (%)">
                    <input
                      required
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      value={form.quotedRateAnnual}
                      onChange={(e) => setForm({ ...form, quotedRateAnnual: e.target.value })}
                      className="input"
                    />
                  </Field>
                </div>
                <Field
                  label="Processing fee (₹)"
                  info="The one-time charge the lender takes for setting up the loan. Often looks small next to the loan amount, but it's paid on top of every EMI."
                >
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.processingFeeValue}
                    onChange={(e) => setForm({ ...form, processingFeeValue: e.target.value })}
                    className="input"
                    placeholder="0"
                  />
                </Field>
                <Field label="Other upfront fees (₹)" info="Documentation, convenience, or handling charges — anything else billed once at the start.">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.otherUpfrontFees}
                    onChange={(e) => setForm({ ...form, otherUpfrontFees: e.target.value })}
                    className="input"
                    placeholder="0"
                  />
                </Field>
                <Field label="Prepayment penalty (%, optional)">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={form.prepaymentPenaltyPercent}
                    onChange={(e) => setForm({ ...form, prepaymentPenaltyPercent: e.target.value })}
                    className="input"
                    placeholder="0"
                  />
                </Field>

                <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
                  <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
                    Only fill these in if the offer has an introductory rate that changes later.
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Field label="Intro rate (%)">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        value={form.teaserRateAnnual}
                        onChange={(e) => setForm({ ...form, teaserRateAnnual: e.target.value })}
                        className="input"
                      />
                    </Field>
                    <Field label="For (months)">
                      <input
                        type="number"
                        min={1}
                        step="1"
                        value={form.teaserMonths}
                        onChange={(e) => setForm({ ...form, teaserMonths: e.target.value })}
                        className="input"
                      />
                    </Field>
                    <Field label="Then (%)">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        value={form.postTeaserRateAnnual}
                        onChange={(e) => setForm({ ...form, postTeaserRateAnnual: e.target.value })}
                        className="input"
                      />
                    </Field>
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={scoreMutation.isPending}
                    className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
                  >
                    {scoreMutation.isPending ? "Calculating…" : "Check my real cost"}
                  </button>
                  <button
                    type="button"
                    onClick={reset}
                    className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
                  >
                    Start over
                  </button>
                </div>
              </form>
            )}

            {result && (
              <button
                onClick={reset}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
              >
                Check another offer
              </button>
            )}

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                {error}
              </p>
            )}
          </div>

          {result && <ResultView result={result} />}
        </div>
      </main>
    </div>
  );
}

const TIER_STYLES: Record<
  LoanOfferCheckResult["tier"],
  { wrap: string; label: string }
> = {
  GREAT: {
    wrap: "border-emerald-400/30 bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-600 dark:border-emerald-500/30 dark:from-emerald-700 dark:via-emerald-600 dark:to-teal-700",
    label: "Great deal",
  },
  FAIR: {
    wrap: "border-amber-400/30 bg-gradient-to-br from-amber-500 via-amber-500 to-yellow-500 dark:border-amber-500/30 dark:from-amber-600 dark:via-amber-600 dark:to-yellow-600",
    label: "Fair",
  },
  HIGH_COST: {
    wrap: "border-orange-400/30 bg-gradient-to-br from-orange-500 via-orange-500 to-red-500 dark:border-orange-500/30 dark:from-orange-600 dark:via-orange-600 dark:to-red-600",
    label: "High cost",
  },
  PREDATORY: {
    wrap: "border-red-400/30 bg-gradient-to-br from-red-600 via-red-600 to-rose-700 dark:border-red-500/30 dark:from-red-700 dark:via-red-700 dark:to-rose-800",
    label: "Predatory",
  },
};

function ResultView({ result }: { result: LoanOfferCheckResult }) {
  const tier = TIER_STYLES[result.tier];
  const quoted = Number(result.quotedRateAnnual);
  const trueApr = Number(result.trueApr);

  return (
    <div className="flex flex-col gap-4">
      <div className={`rounded-xl border p-6 text-white ${tier.wrap}`}>
        <p className="text-sm font-semibold uppercase tracking-wide opacity-80">{tier.label}</p>
        <p className="mt-1 text-2xl font-semibold">{trueApr.toFixed(1)}% true APR</p>
        <p className="mt-1 text-sm opacity-90">
          {quoted !== trueApr
            ? `Quoted as ${quoted}% — once fees are folded in, this is what it actually costs you.`
            : "This matches the quoted rate — no hidden cost from fees."}
        </p>
      </div>

      {result.redFlags.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-3 flex items-center gap-1.5 font-semibold text-zinc-900 dark:text-zinc-50">
            Red flags
            <InfoTooltip text="Things worth knowing before you sign — none of these are dealbreakers on their own, but they change what this offer actually costs you." />
          </h3>
          <ul className="flex flex-col gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            {result.redFlags.map((flag) => (
              <li key={flag} className="flex gap-2">
                <span className="text-amber-500">⚠</span>
                <span>{flag}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-50">The math</h3>
          <div className="flex flex-col gap-1.5 text-sm">
            <Row label="Monthly payment" value={formatCurrency(result.baseEmi)} />
            <Row label="Upfront fees" value={formatCurrency(result.totalUpfrontFees)} />
            <Row label="Total you'll pay" value={formatCurrency(result.totalRepayment)} />
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-50">The offer</h3>
          <div className="flex flex-col gap-1.5 text-sm">
            <Row label="Lender" value={result.lenderName ?? "—"} />
            <Row label="Amount" value={formatCurrency(result.principal)} />
            <Row label="Tenure" value={`${result.tenureMonths} months`} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className="font-medium text-zinc-900 dark:text-zinc-100">{value}</span>
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
