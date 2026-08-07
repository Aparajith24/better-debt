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
};
