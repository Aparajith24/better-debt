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

export const api = {
  listDebts: () => request<Debt[]>("/debts"),
  getDebt: (id: string) => request<Debt>(`/debts/${id}`),
  createDebt: (input: DebtInput) =>
    request<Debt>("/debts", { method: "POST", body: JSON.stringify(input) }),
  updateDebt: (id: string, input: Partial<DebtInput> & { isActive?: boolean }) =>
    request<Debt>(`/debts/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  deleteDebt: (id: string) => request<void>(`/debts/${id}`, { method: "DELETE" }),
};
