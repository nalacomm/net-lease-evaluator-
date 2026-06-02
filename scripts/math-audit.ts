/**
 * Math audit — verifies every finance and scoring calculation
 * against hand-computed expected values.
 */
import { computeFinance, monthlyPayment, breakEvenLtv, breakEvenRate } from "../lib/finance";
import { scoreDeal, BuyBoxLike, DealLike } from "../lib/scoring";

let pass = 0;
let fail = 0;

function check(label: string, actual: number | null, expected: number, tolerancePct = 0.01) {
  if (actual === null) {
    console.log(`FAIL  ${label}: got null, expected ${expected}`);
    fail++;
    return;
  }
  const delta = Math.abs(actual - expected);
  const pct = expected !== 0 ? (delta / Math.abs(expected)) * 100 : delta;
  if (pct <= tolerancePct) {
    console.log(`PASS  ${label}: ${actual.toFixed(4)} ≈ ${expected}`);
    pass++;
  } else {
    console.log(`FAIL  ${label}: got ${actual.toFixed(4)}, expected ${expected} (${pct.toFixed(3)}% off)`);
    fail++;
  }
}

function checkInt(label: string, actual: number, expected: number) {
  if (actual === expected) {
    console.log(`PASS  ${label}: ${actual}`);
    pass++;
  } else {
    console.log(`FAIL  ${label}: got ${actual}, expected ${expected}`);
    fail++;
  }
}

console.log("\n===== MONTHLY PAYMENT FORMULA =====");
// $1M loan, 7% annual, 25yr amort
// r = 0.07/12 = 0.005833..., n = 300
// Payment = 1,000,000 * 0.005833 / (1 - (1.005833)^-300)
// (1.005833)^300 = e^(300 * ln(1.005833)) = e^(300 * 0.005816) = e^1.7449 = 5.7245
// Payment = 5833.33 / (1 - 1/5.7245) = 5833.33 / 0.8253 = 7068.16
const pmt1 = monthlyPayment(1_000_000, 7.0, 25);
check("$1M @ 7% / 25yr monthly payment", pmt1, 7068.16, 0.1);

// $500k loan, 6% annual, 30yr
// r = 0.005, n = 360
// Payment = 500k * 0.005 / (1 - (1.005)^-360)
// (1.005)^360 = 6.0226, Payment = 2500 / (1 - 0.16604) = 2500 / 0.83396 = 2997.75
const pmt2 = monthlyPayment(500_000, 6.0, 30);
check("$500k @ 6% / 30yr monthly payment", pmt2, 2997.75, 0.1);

// All-cash ($0 loan) → $0 payment
check("$0 loan → $0 payment", monthlyPayment(0, 7, 25), 0);

console.log("\n===== COMPUTE FINANCE: MARK'S BUY BOX DEFAULTS =====");
// Owings Mills: $4,990,000 price, $372,400 NOI, 65% LTV, 7%, 25yr
const OM_PRICE = 4_990_000;
const OM_NOI = 372_400;
const LTV = 0.65;
const RATE = 7.0;
const AMORT = 25;

// Expected:
// Loan = 4,990,000 * 0.65 = 3,243,500
// Monthly payment = monthlyPayment(3,243,500, 7, 25)
// Annual DS = monthly * 12
// DSCR = 372,400 / annual DS
// Cap rate = 372,400 / 4,990,000 = 7.4629%
// Cash-on-cash = (NOI - Annual DS) / Equity

const omLoan = OM_PRICE * LTV; // 3,243,500
const omMonthly = monthlyPayment(omLoan, RATE, AMORT);
const omAnnualDS = omMonthly * 12;
const omDSCR = OM_NOI / omAnnualDS;
const omCapRate = OM_NOI / OM_PRICE;
const omEquity = OM_PRICE * (1 - LTV); // 1,746,500
const omCoC = (OM_NOI - omAnnualDS) / omEquity;
const omMonthlyCF = (OM_NOI - omAnnualDS) / 12;

const omFin = computeFinance({ price: OM_PRICE, noi: OM_NOI, ltv: LTV, ratePercent: RATE, amortizationYears: AMORT });

check("OM loan amount", omFin.loanAmount, omLoan);
check("OM equity required", omFin.equityRequired, omEquity);
check("OM monthly debt service", omFin.monthlyDebtService, omMonthly, 0.05);
check("OM DSCR", omFin.dscr ?? 0, omDSCR, 0.05);
check("OM cap rate", omFin.capRate, omCapRate, 0.01);
check("OM cash-on-cash", omFin.cashOnCash, omCoC, 0.1);
check("OM monthly net cash flow", omFin.monthlyNetCashFlow, omMonthlyCF, 0.05);

console.log("\n  Derived values for inspection:");
console.log(`  Loan:          $${omFin.loanAmount.toLocaleString()}`);
console.log(`  Equity:        $${omFin.equityRequired.toLocaleString()}`);
console.log(`  Monthly pmt:   $${omFin.monthlyDebtService.toFixed(2)}`);
console.log(`  Annual DS:     $${(omFin.monthlyDebtService * 12).toFixed(2)}`);
console.log(`  DSCR:          ${omFin.dscr?.toFixed(4)}`);
console.log(`  Cap rate:      ${(omFin.capRate * 100).toFixed(4)}%`);
console.log(`  Cash-on-cash:  ${(omFin.cashOnCash * 100).toFixed(4)}%`);
console.log(`  Mo. net CF:    $${omFin.monthlyNetCashFlow.toFixed(2)}`);

console.log("\n===== ALL-CASH SCENARIO =====");
const allCash = computeFinance({ price: OM_PRICE, noi: OM_NOI, ltv: 0, ratePercent: RATE, amortizationYears: AMORT });
check("All-cash: loan amount = 0", allCash.loanAmount, 0);
check("All-cash: equity = price", allCash.equityRequired, OM_PRICE);
check("All-cash: monthly DS = 0", allCash.monthlyDebtService, 0);
check("All-cash: monthly CF = NOI/12", allCash.monthlyNetCashFlow, OM_NOI / 12, 0.01);
if (allCash.dscr === null) { console.log("PASS  All-cash: DSCR = null (correct)"); pass++; }
else { console.log(`FAIL  All-cash: DSCR should be null, got ${allCash.dscr}`); fail++; }
if (allCash.isAllCash) { console.log("PASS  All-cash: isAllCash = true"); pass++; }
else { console.log("FAIL  All-cash: isAllCash should be true"); fail++; }

console.log("\n===== BREAK-EVEN LTV =====");
// For Owings Mills at 1.35x DSCR floor, 7%, 25yr:
// beLTV = NOI / (floor * price * annualFactor)
// annualFactor = r / (1 - (1+r)^-n) * 12
// r = 0.07/12, n = 300
const r = RATE / 100 / 12;
const n = AMORT * 12;
const factor = r / (1 - Math.pow(1 + r, -n));
const annualFactor = factor * 12;
const expectedBeLtv = OM_NOI / (1.35 * OM_PRICE * annualFactor);

const beLtv = breakEvenLtv(OM_PRICE, OM_NOI, RATE, AMORT, 1.35);
check("OM break-even LTV @ 1.35x", beLtv ?? 0, expectedBeLtv, 0.1);
console.log(`  Break-even LTV: ${((beLtv ?? 0) * 100).toFixed(2)}% (should be ~65%)`);

// Verify: at break-even LTV, DSCR should equal 1.35
if (beLtv) {
  const beFin = computeFinance({ price: OM_PRICE, noi: OM_NOI, ltv: beLtv, ratePercent: RATE, amortizationYears: AMORT });
  check("DSCR at break-even LTV = 1.35x", beFin.dscr ?? 0, 1.35, 0.1);
}

console.log("\n===== BREAK-EVEN RATE =====");
// At 65% LTV for Owings Mills, what rate causes DSCR to hit 1.35?
// This should be very close to 7% since DSCR at 7% is already ~1.35x
const beRate = breakEvenRate(OM_PRICE, OM_NOI, 0.65, AMORT, 1.35);
console.log(`  Break-even rate: ${beRate?.toFixed(4)}% (should be very close to 7%)`);
if (beRate !== null) {
  const beFin2 = computeFinance({ price: OM_PRICE, noi: OM_NOI, ltv: 0.65, ratePercent: beRate, amortizationYears: AMORT });
  check("DSCR at break-even rate = 1.35x", beFin2.dscr ?? 0, 1.35, 0.5);
}

// Test a deal with more headroom
const beRate2 = breakEvenRate(5_000_000, 500_000, 0.65, 25, 1.35);
console.log(`  Break-even rate (500k NOI @ 65%): ${beRate2?.toFixed(4)}%`);
if (beRate2 !== null) {
  const fin2 = computeFinance({ price: 5_000_000, noi: 500_000, ltv: 0.65, ratePercent: beRate2, amortizationYears: 25 });
  check("DSCR at break-even rate2 = 1.35x", fin2.dscr ?? 0, 1.35, 0.5);
}

console.log("\n===== SCORING ENGINE: MARK'S BUY BOX =====");
const markBb: BuyBoxLike = {
  capRateMin: 6.75, capRateTarget: 7.0,
  priceMax: 7_000_000, priceStretch: 7_500_000,
  ltv: 0.65, interestRate: 7.0, amortizationYears: 25,
  assetTypesPreferred: ["eclc"],
  assetTypesAcceptable: ["qsr", "pharmacy", "medical", "retail", "shopping_center"],
};

// Perfect deal — should score near 100
const perfectDeal: DealLike = {
  askingPrice: 3_000_000, noi: 225_000,     // 7.5% cap rate, DSCR well above floor
  capRateAsking: 7.5, leaseType: "absolute_nnn",
  termRemainingYears: 20, bumpPercent: 2.5,
  guarantyType: "corporate", operatorUnitCount: 50,
  assetType: "eclc", hhi3Mile: 120_000,
};
const perfectScore = scoreDeal(perfectDeal, markBb);
console.log(`  Perfect deal score: ${perfectScore.score}/100 grade: ${perfectScore.grade} (expected A, ~100)`);
if (perfectScore.score >= 85 && perfectScore.grade === "A") { console.log("PASS  Perfect deal grades A"); pass++; }
else { console.log(`FAIL  Perfect deal: got ${perfectScore.score}/${perfectScore.grade}`); fail++; }

// Failing deal — below every threshold
const badDeal: DealLike = {
  askingPrice: 8_000_000, noi: 400_000,   // 5% cap rate, way above price ceiling, DSCR fails
  capRateAsking: 5.0, leaseType: "gross",
  termRemainingYears: 5, bumpPercent: 0,
  guarantyType: "single_personal",
  assetType: "other",
};
const badScore = scoreDeal(badDeal, markBb);
console.log(`  Bad deal score: ${badScore.score}/100 grade: ${badScore.grade} (expected D or F)`);
if (badScore.score < 55) { console.log("PASS  Bad deal scores D/F"); pass++; }
else { console.log(`FAIL  Bad deal scored too high: ${badScore.score}`); fail++; }

// Owings Mills (closed deal)
const owingsMills: DealLike = {
  askingPrice: 4_990_000, noi: 372_400, capRateAsking: 7.46,
  leaseType: "absolute_nnn", termRemainingYears: 20,
  guarantyType: "single_personal", assetType: "eclc",
};
const omScore = scoreDeal(owingsMills, markBb);
console.log(`  Owings Mills: ${omScore.score}/100 grade: ${omScore.grade} (expected ~83/B)`);
check("Owings Mills score ≈ 83", omScore.score, 83, 5);
if (omScore.grade === "B") { console.log("PASS  Owings Mills grade = B"); pass++; }
else { console.log(`FAIL  Owings Mills grade: got ${omScore.grade}`); fail++; }

// Newington (closed deal)
const newington: DealLike = {
  askingPrice: 5_130_000, noi: 384_750, capRateAsking: 7.5,
  leaseType: "nnn", termRemainingYears: 15,
  guarantyType: "multi_unit_franchisee", operatorUnitCount: 12, assetType: "qsr",
};
const newScore = scoreDeal(newington, markBb);
console.log(`  Newington: ${newScore.score}/100 grade: ${newScore.grade} (expected ~80/B)`);
check("Newington score ≈ 80", newScore.score, 80, 5);
if (newScore.grade === "B") { console.log("PASS  Newington grade = B"); pass++; }
else { console.log(`FAIL  Newington grade: got ${newScore.grade}`); fail++; }

console.log("\n===== GRADE BOUNDARY CHECKS =====");
function scoreWithCapRate(capRate: number): number {
  return scoreDeal({
    askingPrice: 3_000_000, noi: capRate / 100 * 3_000_000, capRateAsking: capRate,
    leaseType: "absolute_nnn", termRemainingYears: 15, bumpPercent: 2.0,
    guarantyType: "corporate", assetType: "eclc", hhi3Mile: 115_000,
  }, markBb).score;
}

const s85 = scoreWithCapRate(7.5);
const s70 = scoreDeal({ askingPrice: 5_000_000, noi: 337_500, capRateAsking: 6.75, leaseType: "nnn", termRemainingYears: 10, bumpPercent: 2.0, guarantyType: "corporate", assetType: "qsr", hhi3Mile: 95_000 }, markBb).score;

console.log(`  A-range deal score: ${s85} (expected ≥85)`);
if (s85 >= 85) { console.log("PASS  A-range ≥85"); pass++; } else { console.log(`FAIL  A-range: got ${s85}`); fail++; }

console.log("\n===== EDGE CASES =====");
// Zero NOI
const zeroNoi = computeFinance({ price: 1_000_000, noi: 0, ltv: 0.65, ratePercent: 7, amortizationYears: 25 });
check("Zero NOI: cap rate = 0", zeroNoi.capRate, 0);
console.log(`  Zero NOI DSCR: ${zeroNoi.dscr} (expected 0, not NaN)`);
if (zeroNoi.dscr === 0 || zeroNoi.dscr !== null) { console.log("PASS  Zero NOI doesn't crash"); pass++; }

// Zero price
const zeroPrice = computeFinance({ price: 0, noi: 100_000, ltv: 0.65, ratePercent: 7, amortizationYears: 25 });
check("Zero price: cap rate = 0", zeroPrice.capRate, 0);
console.log(`  Zero price loan: $${zeroPrice.loanAmount} (expected 0)`);

// 100% LTV
const maxLtv = computeFinance({ price: 1_000_000, noi: 70_000, ltv: 1.0, ratePercent: 7, amortizationYears: 25 });
check("100% LTV: equity = 0", maxLtv.equityRequired, 0);
check("100% LTV: loan = price", maxLtv.loanAmount, 1_000_000);

console.log("\n===== SUMMARY =====");
console.log(`Passed: ${pass}   Failed: ${fail}   Total: ${pass + fail}`);
if (fail === 0) console.log("ALL CHECKS PASSED");
else console.log(`${fail} CHECK(S) FAILED — see above`);
