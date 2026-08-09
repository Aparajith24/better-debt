const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export type DebtType = "CREDIT_CARD" | "PERSONAL_LOAN" | "EMI" | "BNPL" | "OTHER";
export type RateType = "FLAT" | "REDUCING";

// Shape returned by the API — Decimal fields are serialized as strings to
// preserve precision (see backend/src/modules/debts/serialize.ts).
export interface Debt {
  id: string;
  userId: string;
  name: string;
  type: DebtType;
  principal: string | null;
  currentBalance: string;
  rateType: RateType;
  interestRateAnnual: string;
  minPayment: string | null;
  dueDay: number | null;
  tenureMonths: number | null;
  startDate: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DebtInput {
  name: string;
  type: DebtType;
  principal?: number;
  currentBalance: number;
  rateType?: RateType;
  interestRateAnnual: number;
  minPayment?: number;
  dueDay?: number;
  tenureMonths?: number;
  startDate?: string;
}

export class ApiError extends Error {
  issues?: unknown;
  constructor(message: string, issues?: unknown) {
    super(message);
    this.name = "ApiError";
    this.issues = issues;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.error ?? `Request failed with status ${res.status}`, body.issues);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// No Content-Type header here — the browser sets the multipart boundary
// itself when the body is a FormData instance.
async function requestFormData<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { method: "POST", body: form });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.error ?? `Request failed with status ${res.status}`, body.issues);
  }

  return res.json() as Promise<T>;
}

// ---- Calculators ----

export interface SingleDebtProjection {
  months: number;
  payoffAchieved: boolean;
  totalInterest: string;
  totalPaid: string;
  schedule: { month: number; interest: string; principal: string; balance: string }[];
}

export interface PayoffPlanDebtInput {
  id: string;
  balance: number;
  rateType?: RateType;
  interestRateAnnual: number;
  minPayment: number;
  principal?: number;
  tenureMonths?: number;
}

export interface MultiDebtPlan {
  strategy: "avalanche" | "snowball";
  payoffAchieved: boolean;
  totalMonths: number;
  totalInterestPaid: string;
  totalPaid: string;
  payoffOrder: string[];
  debts: { id: string; payoffMonth: number | null; totalInterestPaid: string }[];
  monthlySummary: {
    month: number;
    totalBalance: string;
    interestThisMonth: string;
    payments: { id: string; amount: string; balance: string }[];
  }[];
}

export interface PayoffPlanComparison {
  ratesUsed: {
    id: string;
    rateType: RateType;
    quotedRateAnnual: number;
    effectiveRateAnnual: number;
  }[];
  avalanche: MultiDebtPlan;
  snowball: MultiDebtPlan;
  comparison: { interestSavedByAvalanche: string; monthsSavedByAvalanche: number };
}

export interface FlatRateNormalization {
  principal: number;
  flatRateAnnual: number;
  tenureMonths: number;
  monthlyEMI: string;
  equivalentReducingBalanceAPR: string;
  multiplier: string;
}

export interface CreditCardProjection {
  months: number;
  payoffAchieved: boolean;
  totalInterest: string;
  totalNewSpend: string;
  totalPaid: string;
  schedule: {
    month: number;
    newSpend: string;
    interest: string;
    payment: string;
    balance: string;
  }[];
}

export interface CreditCardComparison {
  withContinuedSpending: CreditCardProjection;
  baseline: CreditCardProjection;
  costOfContinuedSpending: string;
}

export interface PrepaymentOutcome {
  months: number;
  totalInterest: string;
  totalPaid: string;
}

export interface PrepaymentComparison {
  lumpSum: number;
  newBalanceAfterLumpSum: string;
  baseline: PrepaymentOutcome;
  reduceTenure: PrepaymentOutcome & { monthsSaved: number; interestSaved: string };
  reduceEMI: PrepaymentOutcome & {
    newMonthlyPayment: string;
    paymentReduction: string;
    interestSaved: string;
  };
}

export interface BalanceTransferResult {
  fee: string;
  transferredBalance: string;
  staying: SingleDebtProjection;
  transferred: SingleDebtProjection;
  breakEvenMonths: number | null;
  interestSaved: string;
  netSavings: string;
  worthIt: boolean;
}

// ---- Loan offer check ----

export interface LoanOfferTermsInput {
  lenderName?: string;
  loanType: DebtType;
  principal: number;
  tenureMonths: number;
  rateType: RateType;
  quotedRateAnnual: number;
  processingFeeValue: number;
  otherUpfrontFees: number;
  prepaymentPenaltyPercent?: number;
  teaserRateAnnual?: number;
  teaserMonths?: number;
  postTeaserRateAnnual?: number;
}

// A best-effort guess at an offer's terms, read off the PDF by pattern
// matching — anything it couldn't find is null, with a note explaining what
// to fill in. Never trusted directly; the user reviews/corrects it first.
export interface ExtractedLoanTerms {
  lenderName: string | null;
  loanType: DebtType | null;
  principal: number | null;
  tenureMonths: number | null;
  rateType: RateType | null;
  quotedRateAnnual: number | null;
  processingFeeValue: number | null;
  otherUpfrontFees: number | null;
  prepaymentPenaltyPercent: number | null;
  teaserRateAnnual: number | null;
  teaserMonths: number | null;
  postTeaserRateAnnual: number | null;
  notes: string[];
}

export interface LoanExtractionResult {
  extracted: ExtractedLoanTerms;
  documentTextLength: number;
}

export type LoanOfferTier = "GREAT" | "FAIR" | "HIGH_COST" | "PREDATORY";

export interface LoanOfferCheck {
  id: string;
  userId: string;
  lenderName: string | null;
  loanType: DebtType;
  principal: string;
  tenureMonths: number;
  rateType: RateType;
  quotedRateAnnual: string;
  processingFeeValue: string;
  otherUpfrontFees: string;
  prepaymentPenaltyPercent: string | null;
  teaserRateAnnual: string | null;
  teaserMonths: number | null;
  postTeaserRateAnnual: string | null;
  trueApr: string;
  tier: LoanOfferTier;
  redFlags: string[];
  createdAt: string;
}

export interface LoanOfferCheckResult extends LoanOfferCheck {
  baseEmi: string;
  totalUpfrontFees: string;
  totalRepayment: string;
}

// ---- Affordability check ----

export interface AffordabilityCheckInput {
  monthlyIncome: number;
  existingMonthlyDebtPayments: number;
  desiredPrincipal: number;
  desiredTenureMonths: number;
  proposedRateAnnual?: number;
}

export type ReadinessVerdict = "GOOD_TIME" | "TIGHT" | "NOT_RECOMMENDED";

export interface AffordabilityResult {
  currentDTI: string;
  maxAffordableMonthlyPayment: string;
  maxAffordableAPR: string | null;
  proposedMonthlyPayment: string | null;
  projectedDTI: string | null;
  verdict: ReadinessVerdict;
  reasons: string[];
}

export const api = {
  listDebts: () => request<Debt[]>("/debts"),
  getDebt: (id: string) => request<Debt>(`/debts/${id}`),
  createDebt: (input: DebtInput) =>
    request<Debt>("/debts", { method: "POST", body: JSON.stringify(input) }),
  updateDebt: (id: string, input: Partial<DebtInput> & { isActive?: boolean }) =>
    request<Debt>(`/debts/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  deleteDebt: (id: string) => request<void>(`/debts/${id}`, { method: "DELETE" }),

  singleDebtProjection: (input: {
    balance: number;
    interestRateAnnual: number;
    monthlyPayment: number;
  }) =>
    request<SingleDebtProjection>("/calculators/single-debt-projection", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  payoffPlan: (input: { debts: PayoffPlanDebtInput[]; extraMonthlyBudget: number }) =>
    request<PayoffPlanComparison>("/calculators/payoff-plan", {
      method: "POST",
      body: JSON.stringify({ ...input, strategy: "both" }),
    }),

  normalizeFlatRate: (input: {
    principal: number;
    flatRateAnnual: number;
    tenureMonths: number;
  }) =>
    request<FlatRateNormalization>("/calculators/normalize-flat-rate", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  creditCardProjection: (input: {
    currentBalance: number;
    interestRateAnnual: number;
    monthlyPayment: number;
    monthlyNewSpend?: number;
  }) =>
    request<CreditCardComparison>("/calculators/credit-card-projection", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  prepayment: (input: {
    balance: number;
    interestRateAnnual: number;
    monthlyPayment: number;
    lumpSum: number;
  }) =>
    request<PrepaymentComparison>("/calculators/prepayment", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  balanceTransfer: (input: {
    currentBalance: number;
    currentRateAnnual: number;
    monthlyPayment: number;
    transferFeeType: "PERCENT" | "FLAT";
    transferFeeValue: number;
    teaserRateAnnual: number;
    teaserMonths: number;
    postTeaserRateAnnual: number;
    addFeeToBalance?: boolean;
  }) =>
    request<BalanceTransferResult>("/calculators/balance-transfer", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  extractLoanOffer: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return requestFormData<LoanExtractionResult>("/loan-offers/extract", form);
  },

  scoreLoanOffer: (input: LoanOfferTermsInput) =>
    request<LoanOfferCheckResult>("/loan-offers", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  listLoanOffers: () => request<LoanOfferCheck[]>("/loan-offers"),

  checkAffordability: (input: AffordabilityCheckInput) =>
    request<AffordabilityResult>("/affordability/check", {
      method: "POST",
      body: JSON.stringify(input),
    }),
};
