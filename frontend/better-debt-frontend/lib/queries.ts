import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  api,
  type AffordabilityCheckInput,
  type Debt,
  type DebtInput,
  type LoanOfferTermsInput,
  type PayoffPlanComparison,
  type PayoffPlanDebtInput,
  type TrackedPlanDebtInput,
} from "./api";

export const debtKeys = {
  all: ["debts"] as const,
};

export function useDebts() {
  return useQuery({ queryKey: debtKeys.all, queryFn: api.listDebts });
}

export function useCreateDebt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DebtInput) => api.createDebt(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: debtKeys.all }),
  });
}

export function useUpdateDebt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<DebtInput> & { isActive?: boolean } }) =>
      api.updateDebt(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: debtKeys.all }),
  });
}

export function useDeleteDebt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteDebt(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: debtKeys.all }),
  });
}

function toPayoffPlanDebtInput(debt: Debt): PayoffPlanDebtInput {
  return {
    id: debt.id,
    balance: Number(debt.currentBalance),
    rateType: debt.rateType,
    interestRateAnnual: Number(debt.interestRateAnnual),
    minPayment: Number(debt.minPayment ?? 0),
    principal: debt.principal ? Number(debt.principal) : undefined,
    tenureMonths: debt.tenureMonths ?? undefined,
  };
}

// A FLAT debt needs its original principal + full tenure to normalize its
// rate — without both, the payoff-plan request the backend would reject.
function isPayoffPlanReady(debt: Debt): boolean {
  return debt.rateType !== "FLAT" || (debt.principal !== null && debt.tenureMonths !== null);
}

// Auto-runs avalanche vs snowball on the saved debts, so the dashboard shows
// a decision ("pay this off, be done by this date") instead of just a list.
export function usePayoffPlan(debts: Debt[]) {
  const ready = debts.length > 0 && debts.every(isPayoffPlanReady);
  const payload = debts.map(toPayoffPlanDebtInput);

  return useQuery<PayoffPlanComparison>({
    queryKey: ["payoff-plan", payload],
    queryFn: () => api.payoffPlan({ debts: payload, extraMonthlyBudget: 0 }),
    enabled: ready,
  });
}

export const loanOfferKeys = {
  all: ["loan-offers"] as const,
};

export function useExtractLoanOffer() {
  return useMutation({ mutationFn: (file: File) => api.extractLoanOffer(file) });
}

export function useScoreLoanOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoanOfferTermsInput) => api.scoreLoanOffer(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: loanOfferKeys.all }),
  });
}

export function useLoanOfferHistory() {
  return useQuery({ queryKey: loanOfferKeys.all, queryFn: api.listLoanOffers });
}

export function useCheckAffordability() {
  return useMutation({ mutationFn: (input: AffordabilityCheckInput) => api.checkAffordability(input) });
}

export const trackedPlanKeys = {
  active: ["tracked-plan", "active"] as const,
};

export function useActiveTrackedPlan() {
  return useQuery({ queryKey: trackedPlanKeys.active, queryFn: api.getActiveTrackedPlan });
}

export function useCreateTrackedPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      debts: TrackedPlanDebtInput[];
      extraMonthlyBudget: number;
      strategy: "avalanche" | "snowball";
    }) => api.createTrackedPlan(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: trackedPlanKeys.active }),
  });
}

export function useAbandonTrackedPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.abandonTrackedPlan(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: trackedPlanKeys.active }),
  });
}
