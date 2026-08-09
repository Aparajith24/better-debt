// Flat rate: interest is charged on the ORIGINAL principal for the whole tenure,
// even as the balance is paid down. Total interest = P * flatRate * years.
export function flatRateEMI(principal: number, flatRateAnnualPercent: number, tenureMonths: number): number {
  const years = tenureMonths / 12;
  const totalInterest = principal * (flatRateAnnualPercent / 100) * years;
  return (principal + totalInterest) / tenureMonths;
}

// Standard reducing-balance EMI formula: EMI = P·r·(1+r)^n / ((1+r)^n − 1),
// where r is the monthly rate and n is the tenure in months.
export function reducingBalanceEMI(principal: number, monthlyRate: number, tenureMonths: number): number {
  if (monthlyRate === 0) return principal / tenureMonths;
  const factor = Math.pow(1 + monthlyRate, tenureMonths);
  return (principal * monthlyRate * factor) / (factor - 1);
}

// reducingBalanceEMI(principal, r, n) is strictly increasing in r, so we can
// bisection-search for the monthly rate that reproduces a given EMI. This is
// the same root-finding idea behind XIRR — no closed form, so we iterate.
export function solveMonthlyRateForEMI(principal: number, targetEMI: number, tenureMonths: number): number {
  let lo = 0;
  let hi = 2; // 200%/month upper bound — far beyond any real-world loan rate
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const emi = reducingBalanceEMI(principal, mid, tenureMonths);
    if (emi > targetEMI) {
      hi = mid;
    } else {
      lo = mid;
    }
  }
  return (lo + hi) / 2;
}

export interface FlatRateNormalization {
  principal: number;
  flatRateAnnual: number;
  tenureMonths: number;
  monthlyEMI: string;
  equivalentReducingBalanceAPR: string;
  multiplier: string; // how many times higher the true APR is vs the quoted flat rate
}

// Converts a flat-rate loan into "what reducing-balance APR would this EMI
// actually correspond to" — the number to compare against a credit card APR
// or any other reducing-balance debt on equal footing.
export function normalizeFlatRateToAPR(
  principal: number,
  flatRateAnnualPercent: number,
  tenureMonths: number,
): FlatRateNormalization {
  const emi = flatRateEMI(principal, flatRateAnnualPercent, tenureMonths);
  const monthlyRate = solveMonthlyRateForEMI(principal, emi, tenureMonths);
  const equivalentAPR = monthlyRate * 12 * 100;

  return {
    principal,
    flatRateAnnual: flatRateAnnualPercent,
    tenureMonths,
    monthlyEMI: emi.toFixed(2),
    equivalentReducingBalanceAPR: equivalentAPR.toFixed(2),
    multiplier: flatRateAnnualPercent > 0 ? (equivalentAPR / flatRateAnnualPercent).toFixed(2) : "0.00",
  };
}

export interface RateBearingDebt {
  rateType: "FLAT" | "REDUCING";
  interestRateAnnual: number;
  principal?: number;
  tenureMonths?: number;
}

// Resolves any debt's quoted rate to the reducing-balance APR the payoff
// engine actually needs. REDUCING debts pass through unchanged; FLAT debts
// are normalized using their original principal + tenure — the normalization
// reflects the loan's fixed EMI structure, not the currently outstanding
// balance, so principal/tenureMonths here should be the values from when the
// loan was taken out, not "amount left to pay" / "months left."
export function resolveEffectiveAnnualRate(debt: RateBearingDebt): number {
  if (debt.rateType === "REDUCING") return debt.interestRateAnnual;

  if (debt.principal === undefined || debt.tenureMonths === undefined) {
    throw new Error("principal and tenureMonths are required to normalize a FLAT rate debt");
  }

  const normalized = normalizeFlatRateToAPR(debt.principal, debt.interestRateAnnual, debt.tenureMonths);
  return Number(normalized.equivalentReducingBalanceAPR);
}
