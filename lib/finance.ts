export interface FinanceInput {
  price: number;
  noi: number;
  ltv: number; // fraction 0..1
  ratePercent: number; // annual %, e.g. 7.0
  amortizationYears: number;
  currentMonthlyIncome?: number;
  dscrFloor?: number;
}

export interface FinanceResult {
  loanAmount: number;
  equityRequired: number;
  monthlyDebtService: number;
  annualDebtService: number;
  monthlyNetCashFlow: number;
  dscr: number | null; // null = all cash
  capRate: number; // fraction
  cashOnCash: number; // fraction
  additiveMonthlyIncome: number;
  newPortfolioMonthlyTotal: number;
  isAllCash: boolean;
}

/**
 * Standard amortizing mortgage monthly payment.
 */
export function monthlyPayment(
  principal: number,
  ratePercent: number,
  amortizationYears: number
): number {
  if (principal <= 0) return 0;
  const r = ratePercent / 100 / 12;
  const n = amortizationYears * 12;
  if (n <= 0) return principal;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

export function computeFinance(input: FinanceInput): FinanceResult {
  const {
    price,
    noi,
    ltv,
    ratePercent,
    amortizationYears,
    currentMonthlyIncome = 0,
  } = input;

  const loanAmount = price * ltv;
  const equityRequired = price - loanAmount;
  const monthlyDebtService = monthlyPayment(
    loanAmount,
    ratePercent,
    amortizationYears
  );
  const annualDebtService = monthlyDebtService * 12;
  const monthlyNetCashFlow = (noi - annualDebtService) / 12;
  const isAllCash = loanAmount <= 0;
  const dscr = isAllCash || annualDebtService === 0 ? null : noi / annualDebtService;
  const capRate = price > 0 ? noi / price : 0;
  const cashOnCash =
    equityRequired > 0 ? (noi - annualDebtService) / equityRequired : 0;
  const additiveMonthlyIncome = monthlyNetCashFlow;
  const newPortfolioMonthlyTotal = currentMonthlyIncome + monthlyNetCashFlow;

  return {
    loanAmount,
    equityRequired,
    monthlyDebtService,
    annualDebtService,
    monthlyNetCashFlow,
    dscr,
    capRate,
    cashOnCash,
    additiveMonthlyIncome,
    newPortfolioMonthlyTotal,
    isAllCash,
  };
}

/**
 * LTV (fraction) at which DSCR equals the floor. Returns clamped 0..1,
 * or null if not solvable (e.g. zero NOI/price).
 */
export function breakEvenLtv(
  price: number,
  noi: number,
  ratePercent: number,
  amortizationYears: number,
  dscrFloor: number
): number | null {
  if (price <= 0 || noi <= 0 || dscrFloor <= 0) return null;
  const r = ratePercent / 100 / 12;
  const n = amortizationYears * 12;
  // monthly payment factor per dollar of principal
  const factor = r === 0 ? 1 / n : r / (1 - Math.pow(1 + r, -n));
  const annualFactor = factor * 12;
  // DSCR = NOI / (price * ltv * annualFactor) = floor
  const ltv = noi / (dscrFloor * price * annualFactor);
  if (!isFinite(ltv)) return null;
  return Math.max(0, Math.min(1, ltv));
}

/**
 * Interest rate (%) at which DSCR equals the floor, for a given LTV.
 * Solved numerically by bisection.
 */
export function breakEvenRate(
  price: number,
  noi: number,
  ltv: number,
  amortizationYears: number,
  dscrFloor: number,
  loRate = 0.1,
  hiRate = 25
): number | null {
  const loan = price * ltv;
  if (loan <= 0 || noi <= 0) return null;
  const dscrAt = (rate: number) => {
    const ds = monthlyPayment(loan, rate, amortizationYears) * 12;
    return ds === 0 ? Infinity : noi / ds;
  };
  // DSCR decreases as rate increases. Find rate where DSCR = floor.
  let lo = loRate;
  let hi = hiRate;
  if (dscrAt(lo) < dscrFloor) return null; // floor breached even at low rate
  if (dscrAt(hi) > dscrFloor) return null; // never breached in range
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (dscrAt(mid) > dscrFloor) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
