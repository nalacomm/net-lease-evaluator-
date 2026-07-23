import { computeFinance } from "./finance";

export type CheckStatus = "pass" | "warn" | "fail" | "info";

export interface CategoryScore {
  category: string;
  points: number;
  max: number;
  status: CheckStatus;
  detail: string;
}

export interface ScoreResult {
  score: number; // 0-100
  grade: "A" | "B" | "C" | "D" | "F";
  breakdown: CategoryScore[];
  dscrCalculated: number | null;
  capRateCalculated: number | null;
  loanAmount: number;
  monthlyDebtService: number;
  monthlyNetCashFlow: number;
}

// Minimal shapes so this works with Prisma models or plain drafts.
export interface DealLike {
  capRateAsking?: number | null;
  capRateUnderwritten?: number | null;
  askingPrice?: number | null;
  noi?: number | null;
  leaseType?: string | null;
  termRemainingYears?: number | null;
  bumpPercent?: number | null;
  bumpStructure?: string | null;
  guarantyType?: string | null;
  operatorUnitCount?: number | null;
  assetType?: string | null;
  hhi1Mile?: number | null;
  hhi3Mile?: number | null;
  hhi5Mile?: number | null;
  state?: string | null;
  city?: string | null;
}

export interface BuyBoxLike {
  capRateMin: number;
  capRateTarget: number;
  priceMax: number;
  priceStretch?: number | null;
  ltv: number;
  interestRate: number;
  amortizationYears: number;
  assetTypesPreferred: string[];
  assetTypesAcceptable: string[];
  preferredStates?: string[];
  targetMarkets?: string[];
}

function gradeFor(score: number): ScoreResult["grade"] {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "F";
}

const num = (v: number | null | undefined): number | null =>
  v === null || v === undefined || isNaN(v) ? null : v;

export function scoreDeal(deal: DealLike, bb: BuyBoxLike): ScoreResult {
  const breakdown: CategoryScore[] = [];

  // ----- Finance / DSCR recalculation -----
  const price = num(deal.askingPrice) ?? 0;
  const noi = num(deal.noi) ?? 0;
  const fin = computeFinance({
    price,
    noi,
    ltv: bb.ltv,
    ratePercent: bb.interestRate,
    amortizationYears: bb.amortizationYears,
  });
  const dscr = fin.dscr;
  const capRateCalc = price > 0 ? (noi / price) * 100 : null;

  // ----- Cap Rate (20) -----
  const capRate =
    num(deal.capRateUnderwritten) ?? num(deal.capRateAsking) ?? capRateCalc;
  {
    let pts = 0;
    let status: CheckStatus = "fail";
    let detail: string;
    if (capRate === null) {
      detail = "Cap rate unknown";
    } else if (capRate >= bb.capRateTarget) {
      pts = 20;
      status = "pass";
      detail = `${capRate.toFixed(2)}% ≥ target ${bb.capRateTarget}%`;
    } else if (capRate >= bb.capRateMin) {
      pts = 12;
      status = "warn";
      detail = `${capRate.toFixed(2)}% between floor ${bb.capRateMin}% and target ${bb.capRateTarget}%`;
    } else {
      pts = 0;
      status = "fail";
      detail = `${capRate.toFixed(2)}% below floor ${bb.capRateMin}%`;
    }
    breakdown.push({ category: "Cap Rate", points: pts, max: 20, status, detail });
  }

  // ----- DSCR (20) -----
  {
    let pts = 0;
    let status: CheckStatus = "fail";
    let detail: string;
    if (dscr === null) {
      pts = 20;
      status = "pass";
      detail = "All cash — no debt service";
    } else if (dscr >= 1.45) {
      pts = 20;
      status = "pass";
      detail = `${dscr.toFixed(2)}x ≥ 1.45`;
    } else if (dscr >= 1.35) {
      pts = 15;
      status = "pass";
      detail = `${dscr.toFixed(2)}x ≥ 1.35 floor`;
    } else if (dscr >= 1.25) {
      pts = 5;
      status = "warn";
      detail = `${dscr.toFixed(2)}x below 1.35 floor`;
    } else {
      pts = 0;
      status = "fail";
      detail = `${dscr.toFixed(2)}x well below floor`;
    }
    breakdown.push({ category: "DSCR", points: pts, max: 20, status, detail });
  }

  // ----- Lease Type (15) -----
  {
    const lt = (deal.leaseType ?? "").toLowerCase();
    let pts = 0;
    let status: CheckStatus = "fail";
    let detail = lt || "unknown";
    if (lt === "absolute_nnn") {
      pts = 15;
      status = "pass";
      detail = "Absolute NNN";
    } else if (lt === "nnn") {
      pts = 10;
      status = "pass";
      detail = "NNN";
    } else if (lt === "modified_nnn") {
      pts = 5;
      status = "warn";
      detail = "Modified NNN";
    } else if (lt === "gross") {
      pts = 0;
      status = "fail";
      detail = "Gross";
    } else {
      detail = "Lease type unknown";
    }
    breakdown.push({ category: "Lease Type", points: pts, max: 15, status, detail });
  }

  // ----- Term Remaining (15) -----
  {
    const t = num(deal.termRemainingYears);
    let pts = 0;
    let status: CheckStatus = "fail";
    let detail: string;
    if (t === null) {
      detail = "Term unknown";
    } else if (t >= 15) {
      pts = 15;
      status = "pass";
      detail = `${t} yrs ≥ 15`;
    } else if (t >= 10) {
      pts = 10;
      status = "pass";
      detail = `${t} yrs ≥ 10`;
    } else if (t >= 7) {
      pts = 5;
      status = "warn";
      detail = `${t} yrs ≥ 7`;
    } else {
      pts = 0;
      status = "fail";
      detail = `${t} yrs < 7`;
    }
    breakdown.push({ category: "Term Remaining", points: pts, max: 15, status, detail });
  }

  // ----- Rent Bumps (10) -----
  {
    const bp = num(deal.bumpPercent);
    const struct = (deal.bumpStructure ?? "").toLowerCase();
    const isFlat =
      struct.includes("flat") || (bp !== null && bp === 0);
    const hasAltStructure =
      /10%?\s*(every)?\s*5\s*(yr|year)/.test(struct) ||
      struct.includes("10% every 5");
    let pts = 5;
    let status: CheckStatus = "warn";
    let detail = struct || (bp !== null ? `${bp}%` : "unknown");
    if (isFlat) {
      pts = 0;
      status = "fail";
      detail = "Flat / no escalations";
    } else if ((bp !== null && bp >= 2) || hasAltStructure) {
      pts = 10;
      status = "pass";
      detail = bp !== null ? `${bp}% annual` : "10% every 5 years";
    } else if (bp !== null) {
      pts = 5;
      status = "warn";
      detail = `${bp}% (< 2% / irregular)`;
    } else {
      pts = 5;
      status = "warn";
      detail = "Bump structure unclear";
    }
    breakdown.push({ category: "Rent Bumps", points: pts, max: 10, status, detail });
  }

  // ----- Guaranty (10) -----
  {
    const g = (deal.guarantyType ?? "").toLowerCase();
    const units = num(deal.operatorUnitCount);
    let pts = 0;
    let status: CheckStatus = "fail";
    let detail = g || "unknown";
    if (g === "corporate") {
      pts = 10;
      status = "pass";
      detail = "Corporate";
    } else if (g === "multi_unit_franchisee") {
      if (units !== null && units >= 12) {
        pts = 8;
        status = "pass";
        detail = `Multi-unit franchisee (${units} units)`;
      } else {
        pts = 5;
        status = "warn";
        detail = `Multi-unit franchisee (${units ?? "?"} units, < 12)`;
      }
    } else if (g === "single_personal") {
      pts = 2;
      status = "warn";
      detail = "Single / personal guaranty";
    } else {
      detail = "Guaranty unknown";
    }
    breakdown.push({ category: "Guaranty", points: pts, max: 10, status, detail });
  }

  // ----- Price vs Ceiling (5) -----
  {
    let pts = 0;
    let status: CheckStatus = "fail";
    let detail: string;
    const stretch = num(bb.priceStretch) ?? bb.priceMax;
    if (price <= 0) {
      detail = "Price unknown";
      status = "info";
    } else if (price <= bb.priceMax) {
      pts = 5;
      status = "pass";
      detail = `$${(price / 1e6).toFixed(2)}M ≤ ceiling`;
    } else if (price <= stretch) {
      pts = 3;
      status = "warn";
      detail = `$${(price / 1e6).toFixed(2)}M in stretch range`;
    } else {
      pts = 0;
      status = "fail";
      detail = `$${(price / 1e6).toFixed(2)}M above stretch ceiling`;
    }
    breakdown.push({ category: "Price vs Ceiling", points: pts, max: 5, status, detail });
  }

  // ----- Demographics (5) -----
  {
    const hhi =
      num(deal.hhi3Mile) ?? num(deal.hhi1Mile) ?? num(deal.hhi5Mile);
    let pts = 1;
    let status: CheckStatus = "warn";
    let detail: string;
    if (hhi === null) {
      pts = 1;
      status = "warn";
      detail = "HHI unknown";
    } else if (hhi >= 110000) {
      pts = 5;
      status = "pass";
      detail = `HHI $${Math.round(hhi / 1000)}K ≥ $110K`;
    } else if (hhi >= 90000) {
      pts = 3;
      status = "warn";
      detail = `HHI $${Math.round(hhi / 1000)}K ($90K–$110K)`;
    } else {
      pts = 1;
      status = "fail";
      detail = `HHI $${Math.round(hhi / 1000)}K < $90K`;
    }
    breakdown.push({ category: "Demographics", points: pts, max: 5, status, detail });
  }

  // ----- Base score -----
  let score = breakdown.reduce((s, c) => s + c.points, 0);

  // ----- Asset Type Match (bonus up to +5, capped at 100) -----
  {
    const at = (deal.assetType ?? "").toLowerCase();
    let bonus = 0;
    let status: CheckStatus = "info";
    let detail = at || "unknown";
    const preferred = bb.assetTypesPreferred.map((s) => s.toLowerCase());
    const acceptable = bb.assetTypesAcceptable.map((s) => s.toLowerCase());
    if (at === "eclc") {
      bonus = 5;
      status = "pass";
      detail = "ECLC (primary thesis)";
    } else if (preferred.includes(at)) {
      bonus = 3;
      status = "pass";
      detail = `Preferred type (${at})`;
    } else if (acceptable.includes(at)) {
      bonus = 1;
      status = "warn";
      detail = `Acceptable type (${at})`;
    } else if (at) {
      detail = `Off-thesis type (${at})`;
    }
    breakdown.push({
      category: "Asset Type Match (bonus)",
      points: bonus,
      max: 5,
      status,
      detail,
    });
    score += bonus;
  }

  // ----- Location Match (bonus up to +5, capped at 100) -----
  {
    const dealState = (deal.state ?? "").trim().toUpperCase();
    const dealCity = (deal.city ?? "").toLowerCase().trim();
    const states = (bb.preferredStates ?? []).map((s) => s.trim().toUpperCase());
    const markets = (bb.targetMarkets ?? []).map((m) => m.toLowerCase().trim());
    const hasPrefs = states.length > 0 || markets.length > 0;
    let bonus = 0;
    let status: CheckStatus = "info";
    let detail = "No location preferences set";
    if (hasPrefs) {
      const stateMatch = states.length > 0 && dealState && states.includes(dealState);
      const marketMatch =
        markets.length > 0 &&
        dealCity &&
        markets.some((m) => dealCity.includes(m) || m.includes(dealCity));
      if (stateMatch || marketMatch) {
        bonus = 5;
        status = "pass";
        detail = `${deal.city ?? ""}${deal.city && deal.state ? ", " : ""}${deal.state ?? ""} — in preferred locations`;
      } else {
        bonus = 0;
        status = "warn";
        detail = `${deal.city ?? "?"}${deal.city && deal.state ? ", " : ""}${deal.state ?? ""} — outside preferred locations`;
      }
    }
    breakdown.push({
      category: "Location Match (bonus)",
      points: bonus,
      max: hasPrefs ? 5 : 0,
      status,
      detail,
    });
    score += bonus;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    score,
    grade: gradeFor(score),
    breakdown,
    dscrCalculated: dscr,
    capRateCalculated: capRateCalc,
    loanAmount: fin.loanAmount,
    monthlyDebtService: fin.monthlyDebtService,
    monthlyNetCashFlow: fin.monthlyNetCashFlow,
  };
}
