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

export interface TenantLeaseRow {
  tenantName: string;
  suite?: string | null;
  squareFeet?: number | null;
  annualRent: number;
  remainingYears: number;
  leaseType?: string | null;
  bumpPercent?: number | null;
  creditType?: string | null; // "national" | "regional" | "local"
}

export function computeWalt(rentRoll: TenantLeaseRow[]): number | null {
  const totalRent = rentRoll.reduce((s, r) => s + (r.annualRent ?? 0), 0);
  if (totalRent === 0) return null;
  const weighted = rentRoll.reduce((s, r) => s + r.remainingYears * (r.annualRent ?? 0), 0);
  return Math.round((weighted / totalRent) * 100) / 100;
}

// Minimal shapes so this works with Prisma models or plain drafts.
export interface DealLike {
  dealCategory?: string | null;
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
  // multi-tenant / retail plaza
  walt?: number | null;
  vacancyRate?: number | null;
  rentRoll?: TenantLeaseRow[] | null;
  anchorTenant?: string | null;
  // land / all
  zoning?: string | null;
  entitlements?: string | null;
  lotSize?: number | null;
}

export interface BuyBoxLike {
  capRateMin: number;
  capRateTarget: number;
  priceMax: number;
  priceStretch?: number | null;
  ltv: number;
  interestRate: number;
  amortizationYears: number;
  dscrMin?: number | null;
  termMinYears?: number | null;
  termPreferredYears?: number | null;
  hhiMin?: number | null;
  assetTypesPreferred: string[];
  assetTypesAcceptable: string[];
  preferredStates?: string[];
  targetMarkets?: string[];
}

export function gradeFor(score: number): ScoreResult["grade"] {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "F";
}

const num = (v: number | null | undefined): number | null =>
  v === null || v === undefined || isNaN(v) ? null : v;

function skip(category: string, detail: string): CategoryScore {
  return { category, points: 0, max: 0, status: "info", detail };
}

export function scoreMultiTenantDeal(deal: DealLike, bb: BuyBoxLike): ScoreResult {
  const breakdown: CategoryScore[] = [];

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
  const skipCapRate = bb.capRateMin === 0 && bb.capRateTarget === 0;
  if (skipCapRate) {
    breakdown.push(skip("Cap Rate", "No cap rate target set"));
  } else {
    const capRate = num(deal.capRateUnderwritten) ?? num(deal.capRateAsking) ?? capRateCalc;
    let pts = 0; let status: CheckStatus = "fail"; let detail: string;
    if (capRate === null) { detail = "Cap rate unknown"; }
    else if (capRate >= bb.capRateTarget) { pts = 20; status = "pass"; detail = `${capRate.toFixed(2)}% ≥ target ${bb.capRateTarget}%`; }
    else if (capRate >= bb.capRateMin) { pts = 12; status = "warn"; detail = `${capRate.toFixed(2)}% between floor ${bb.capRateMin}% and target ${bb.capRateTarget}%`; }
    else { pts = 0; status = "fail"; detail = `${capRate.toFixed(2)}% below floor ${bb.capRateMin}%`; }
    breakdown.push({ category: "Cap Rate", points: pts, max: 20, status, detail });
  }

  // ----- DSCR (20) -----
  const dscrFloor = num(bb.dscrMin);
  if (!dscrFloor) {
    breakdown.push(skip("DSCR", "No DSCR minimum set"));
  } else {
    let pts = 0; let status: CheckStatus = "fail"; let detail: string;
    if (dscr === null) { pts = 20; status = "pass"; detail = "All cash — no debt service"; }
    else if (dscr >= dscrFloor * 1.07) { pts = 20; status = "pass"; detail = `${dscr.toFixed(2)}x — strong coverage`; }
    else if (dscr >= dscrFloor) { pts = 15; status = "pass"; detail = `${dscr.toFixed(2)}x ≥ ${dscrFloor.toFixed(2)}x floor`; }
    else if (dscr >= dscrFloor * 0.93) { pts = 5; status = "warn"; detail = `${dscr.toFixed(2)}x slightly below ${dscrFloor.toFixed(2)}x floor`; }
    else { pts = 0; status = "fail"; detail = `${dscr.toFixed(2)}x well below ${dscrFloor.toFixed(2)}x floor`; }
    breakdown.push({ category: "DSCR", points: pts, max: 20, status, detail });
  }

  // ----- WALT (20) -----
  const rentRoll = deal.rentRoll ?? [];
  const walt = num(deal.walt) ?? (rentRoll.length > 0 ? computeWalt(rentRoll) : null);
  {
    let pts = 0; let status: CheckStatus = "fail"; let detail: string;
    if (walt === null) { detail = "WALT unknown — no rent roll data"; status = "info"; }
    else if (walt >= 7) { pts = 20; status = "pass"; detail = `${walt.toFixed(1)} yrs — strong income durability`; }
    else if (walt >= 5) { pts = 14; status = "warn"; detail = `${walt.toFixed(1)} yrs — moderate term`; }
    else if (walt >= 3) { pts = 7; status = "warn"; detail = `${walt.toFixed(1)} yrs — short, near-term rollover risk`; }
    else { pts = 0; status = "fail"; detail = `${walt.toFixed(1)} yrs — high rollover risk`; }
    breakdown.push({ category: "WALT", points: pts, max: 20, status, detail });
  }

  // ----- Occupancy (15) -----
  const occ = num(deal.vacancyRate) !== null ? 100 - (num(deal.vacancyRate) ?? 0) : null;
  {
    let pts = 0; let status: CheckStatus = "fail"; let detail: string;
    if (occ === null) { detail = "Occupancy unknown"; status = "info"; }
    else if (occ >= 95) { pts = 15; status = "pass"; detail = `${occ.toFixed(0)}% occupied`; }
    else if (occ >= 90) { pts = 10; status = "warn"; detail = `${occ.toFixed(0)}% occupied — minor vacancy`; }
    else if (occ >= 85) { pts = 5; status = "warn"; detail = `${occ.toFixed(0)}% occupied — meaningful vacancy`; }
    else { pts = 0; status = "fail"; detail = `${occ.toFixed(0)}% occupied — high vacancy`; }
    breakdown.push({ category: "Occupancy", points: pts, max: 15, status, detail });
  }

  // ----- Lease Stagger (10) — check for rollover concentration -----
  if (rentRoll.length === 0) {
    breakdown.push(skip("Lease Stagger", "No rent roll data"));
  } else {
    const totalRent = rentRoll.reduce((s, r) => s + (r.annualRent ?? 0), 0);
    const byYear: Record<number, number> = {};
    for (const r of rentRoll) {
      const yr = Math.ceil(r.remainingYears);
      byYear[yr] = (byYear[yr] ?? 0) + r.annualRent;
    }
    const maxConc = totalRent > 0 ? Math.max(...Object.values(byYear)) / totalRent : 0;
    const worstYear = Object.entries(byYear).find(([, v]) => v / totalRent === maxConc)?.[0];
    let pts = 0; let status: CheckStatus = "fail"; let detail: string;
    if (maxConc <= 0.30) { pts = 10; status = "pass"; detail = `Well staggered — max ${(maxConc * 100).toFixed(0)}% of NOI expires in any one year`; }
    else if (maxConc <= 0.45) { pts = 5; status = "warn"; detail = `Moderate concentration — ${(maxConc * 100).toFixed(0)}% of NOI expires in year ${worstYear}`; }
    else { pts = 0; status = "fail"; detail = `High concentration — ${(maxConc * 100).toFixed(0)}% of NOI expires in year ${worstYear}`; }
    breakdown.push({ category: "Lease Stagger", points: pts, max: 10, status, detail });
  }

  // ----- Price vs Ceiling (5) -----
  if (bb.priceMax > 0) {
    const stretch = num(bb.priceStretch) ?? bb.priceMax;
    let pts = 0; let status: CheckStatus = "fail"; let detail: string;
    if (price <= 0) { detail = "Price unknown"; status = "info"; }
    else if (price <= bb.priceMax) { pts = 5; status = "pass"; detail = `$${(price / 1e6).toFixed(2)}M ≤ ceiling`; }
    else if (price <= stretch) { pts = 3; status = "warn"; detail = `$${(price / 1e6).toFixed(2)}M in stretch range`; }
    else { status = "fail"; detail = `$${(price / 1e6).toFixed(2)}M above stretch ceiling`; }
    breakdown.push({ category: "Price vs Ceiling", points: pts, max: 5, status, detail });
  } else {
    breakdown.push(skip("Price vs Ceiling", "No price ceiling set"));
  }

  // ----- Demographics (5) -----
  const hhiFloor2 = num(bb.hhiMin);
  if (!hhiFloor2) {
    breakdown.push(skip("Demographics", "No HHI minimum set"));
  } else {
    const hhi = num(deal.hhi3Mile) ?? num(deal.hhi1Mile) ?? num(deal.hhi5Mile);
    let pts = 0; let status: CheckStatus = "warn"; let detail: string;
    if (hhi === null) { detail = "HHI unknown"; }
    else if (hhi >= hhiFloor2 * 1.22) { pts = 5; status = "pass"; detail = `HHI $${Math.round(hhi / 1000)}K — strong`; }
    else if (hhi >= hhiFloor2) { pts = 3; status = "warn"; detail = `HHI $${Math.round(hhi / 1000)}K ≥ floor $${Math.round(hhiFloor2 / 1000)}K`; }
    else { pts = 0; status = "fail"; detail = `HHI $${Math.round(hhi / 1000)}K < floor $${Math.round(hhiFloor2 / 1000)}K`; }
    breakdown.push({ category: "Demographics", points: pts, max: 5, status, detail });
  }

  // Normalize base score
  const baseMetrics2 = breakdown.filter((c) => c.max > 0);
  const baseMax2 = baseMetrics2.reduce((s, c) => s + c.max, 0);
  const baseEarned2 = baseMetrics2.reduce((s, c) => s + c.points, 0);
  let score2 = baseMax2 > 0 ? Math.round((baseEarned2 / baseMax2) * 100) : 0;

  // Asset Type (bonus)
  {
    const at = (deal.assetType ?? "").toLowerCase();
    let bonus = 0; let status: CheckStatus = "info"; let detail = at || "unknown";
    const preferred = bb.assetTypesPreferred.map((s) => s.toLowerCase());
    const acceptable = bb.assetTypesAcceptable.map((s) => s.toLowerCase());
    if (preferred.includes(at)) { bonus = 3; status = "pass"; detail = `Preferred type (${at})`; }
    else if (acceptable.includes(at)) { bonus = 1; status = "warn"; detail = `Acceptable type (${at})`; }
    else if (at) { detail = `Off-thesis type (${at})`; }
    breakdown.push({ category: "Asset Type Match (bonus)", points: bonus, max: 5, status, detail });
    score2 += bonus;
  }

  // Location Match (bonus)
  {
    const dealState = (deal.state ?? "").trim().toUpperCase();
    const dealCity = (deal.city ?? "").toLowerCase().trim();
    const states = (bb.preferredStates ?? []).map((s) => s.trim().toUpperCase());
    const markets = (bb.targetMarkets ?? []).map((m) => m.toLowerCase().trim());
    const hasPrefs = states.length > 0 || markets.length > 0;
    let bonus = 0; let status: CheckStatus = "info"; let detail = "No location preferences set";
    if (hasPrefs) {
      const stateMatch = states.length > 0 && dealState && states.includes(dealState);
      const marketMatch = markets.length > 0 && dealCity && markets.some((m) => dealCity.includes(m) || m.includes(dealCity));
      if (stateMatch || marketMatch) { bonus = 5; status = "pass"; detail = `${deal.city ?? ""}${deal.city && deal.state ? ", " : ""}${deal.state ?? ""} — in preferred locations`; }
      else { status = "warn"; detail = `${deal.city ?? "?"}${deal.city && deal.state ? ", " : ""}${deal.state ?? ""} — outside preferred locations`; }
    }
    breakdown.push({ category: "Location Match (bonus)", points: bonus, max: hasPrefs ? 5 : 0, status, detail });
    score2 += bonus;
  }

  score2 = Math.max(0, Math.min(100, score2));
  return {
    score: score2,
    grade: gradeFor(score2) as ScoreResult["grade"],
    breakdown,
    dscrCalculated: dscr,
    capRateCalculated: capRateCalc,
    loanAmount: fin.loanAmount,
    monthlyDebtService: fin.monthlyDebtService,
    monthlyNetCashFlow: fin.monthlyNetCashFlow,
  };
}

// Shared location/asset bonus appended after base normalization
function appendBonuses(
  deal: DealLike,
  bb: BuyBoxLike,
  breakdown: CategoryScore[],
  score: number
): number {
  const at = (deal.assetType ?? "").toLowerCase();
  let atBonus = 0; let atStatus: CheckStatus = "info"; let atDetail = at || "unknown";
  const preferred = bb.assetTypesPreferred.map((s) => s.toLowerCase());
  const acceptable = bb.assetTypesAcceptable.map((s) => s.toLowerCase());
  if (at === "eclc") { atBonus = 5; atStatus = "pass"; atDetail = "ECLC (primary thesis)"; }
  else if (preferred.includes(at)) { atBonus = 3; atStatus = "pass"; atDetail = `Preferred type (${at})`; }
  else if (acceptable.includes(at)) { atBonus = 1; atStatus = "warn"; atDetail = `Acceptable type (${at})`; }
  else if (at) { atDetail = `Off-thesis type (${at})`; }
  breakdown.push({ category: "Asset Type Match (bonus)", points: atBonus, max: 5, status: atStatus, detail: atDetail });
  score += atBonus;

  const dealState = (deal.state ?? "").trim().toUpperCase();
  const dealCity = (deal.city ?? "").toLowerCase().trim();
  const states = (bb.preferredStates ?? []).map((s) => s.trim().toUpperCase());
  const markets = (bb.targetMarkets ?? []).map((m) => m.toLowerCase().trim());
  const hasPrefs = states.length > 0 || markets.length > 0;
  let locBonus = 0; let locStatus: CheckStatus = "info"; let locDetail = "No location preferences set";
  if (hasPrefs) {
    const stateMatch = states.length > 0 && dealState && states.includes(dealState);
    const mktMatch = markets.length > 0 && dealCity && markets.some((m) => dealCity.includes(m) || m.includes(dealCity));
    if (stateMatch || mktMatch) { locBonus = 5; locStatus = "pass"; locDetail = `${deal.city ?? ""}${deal.city && deal.state ? ", " : ""}${deal.state ?? ""} — in preferred locations`; }
    else { locStatus = "warn"; locDetail = `${deal.city ?? "?"}${deal.city && deal.state ? ", " : ""}${deal.state ?? ""} — outside preferred locations`; }
  }
  breakdown.push({ category: "Location Match (bonus)", points: locBonus, max: hasPrefs ? 5 : 0, status: locStatus, detail: locDetail });
  score += locBonus;

  return Math.max(0, Math.min(100, score));
}

export function scoreLandDeal(deal: DealLike, bb: BuyBoxLike): ScoreResult {
  const breakdown: CategoryScore[] = [];
  const price = num(deal.askingPrice) ?? 0;
  // No income on land — finance fields are all zero
  const fin = computeFinance({ price, noi: 0, ltv: bb.ltv, ratePercent: bb.interestRate, amortizationYears: bb.amortizationYears });

  // ----- Price vs Ceiling (25) — higher weight since no income to normalize against -----
  if (bb.priceMax === 0) {
    breakdown.push(skip("Price vs Ceiling", "No price ceiling set"));
  } else {
    const stretch = num(bb.priceStretch) ?? bb.priceMax;
    let pts = 0; let status: CheckStatus = "fail"; let detail: string;
    if (price <= 0) { detail = "Price unknown"; status = "info"; }
    else if (price <= bb.priceMax) { pts = 25; status = "pass"; detail = `$${(price / 1e6).toFixed(2)}M ≤ ceiling`; }
    else if (price <= stretch) { pts = 15; status = "warn"; detail = `$${(price / 1e6).toFixed(2)}M in stretch range`; }
    else { status = "fail"; detail = `$${(price / 1e6).toFixed(2)}M above stretch ceiling`; }
    breakdown.push({ category: "Price vs Ceiling", points: pts, max: 25, status, detail });
  }

  // ----- Demographics (20) -----
  const hhiFloor = num(bb.hhiMin);
  if (!hhiFloor) {
    breakdown.push(skip("Demographics", "No HHI minimum set"));
  } else {
    const hhi = num(deal.hhi3Mile) ?? num(deal.hhi1Mile) ?? num(deal.hhi5Mile);
    let pts = 0; let status: CheckStatus = "warn"; let detail: string;
    if (hhi === null) { detail = "HHI unknown"; }
    else if (hhi >= hhiFloor * 1.25) { pts = 20; status = "pass"; detail = `HHI $${Math.round(hhi / 1000)}K — strong area`; }
    else if (hhi >= hhiFloor * 1.1) { pts = 15; status = "pass"; detail = `HHI $${Math.round(hhi / 1000)}K — solid`; }
    else if (hhi >= hhiFloor) { pts = 10; status = "warn"; detail = `HHI $${Math.round(hhi / 1000)}K ≥ floor $${Math.round(hhiFloor / 1000)}K`; }
    else { pts = 0; status = "fail"; detail = `HHI $${Math.round(hhi / 1000)}K < floor $${Math.round(hhiFloor / 1000)}K`; }
    breakdown.push({ category: "Demographics", points: pts, max: 20, status, detail });
  }

  // ----- Zoning (20) — info if unknown, scored if present -----
  {
    const z = (deal.zoning ?? "").toLowerCase().trim();
    let pts = 0; let status: CheckStatus = "info"; let detail: string;
    if (!z) { detail = "Zoning unknown — verify before closing"; }
    else {
      const isCommercial = /^c[-\s]?\d|commercial|retail|business|b-\d/i.test(z);
      const isOffice = /office|o-\d/i.test(z);
      const isIndustrial = /industrial|i-\d|flex|warehouse/i.test(z);
      const isMixed = /mixed|m-\d|pud|planned/i.test(z);
      const isResidential = /^r[-\s]?\d|residential|sfr|multi.?family/i.test(z);
      const isAgOrRaw = /ag|agricultural|a-\d|unzoned|rural/i.test(z);
      if (isCommercial || isOffice || isIndustrial || isMixed) {
        pts = 20; status = "pass"; detail = `${deal.zoning} — commercial/developable zoning`;
      } else if (isResidential) {
        pts = 10; status = "warn"; detail = `${deal.zoning} — residential zoning, verify intended use`;
      } else if (isAgOrRaw) {
        pts = 5; status = "warn"; detail = `${deal.zoning} — agricultural/raw, entitlements likely needed`;
      } else {
        pts = 15; status = "warn"; detail = `${deal.zoning} — verify suitability for intended use`;
      }
    }
    breakdown.push({ category: "Zoning", points: pts, max: 20, status, detail });
  }

  // ----- Entitlements (15) -----
  {
    const e = (deal.entitlements ?? "").toLowerCase().trim();
    let pts = 0; let status: CheckStatus = "info"; let detail: string;
    if (!e) { detail = "Entitlement status unknown"; }
    else if (e.includes("permitted") || e.includes("fully_entitled") || e.includes("fully entitled")) {
      pts = 15; status = "pass"; detail = "Fully entitled / permitted — ready to build";
    } else if (e.includes("partially") || e.includes("partial")) {
      pts = 8; status = "warn"; detail = "Partially entitled — entitlement risk remains";
    } else if (e.includes("raw") || e.includes("unentitled")) {
      pts = 2; status = "warn"; detail = "Raw / unentitled — significant entitlement timeline risk";
    } else {
      pts = 8; status = "warn"; detail = deal.entitlements!;
    }
    breakdown.push({ category: "Entitlements", points: pts, max: 15, status, detail });
  }

  const baseMetrics = breakdown.filter((c) => c.max > 0);
  const baseMax = baseMetrics.reduce((s, c) => s + c.max, 0);
  const baseEarned = baseMetrics.reduce((s, c) => s + c.points, 0);
  let score = baseMax > 0 ? Math.round((baseEarned / baseMax) * 100) : 0;
  score = appendBonuses(deal, bb, breakdown, score);

  return { score, grade: gradeFor(score) as ScoreResult["grade"], breakdown, dscrCalculated: null, capRateCalculated: null, loanAmount: 0, monthlyDebtService: 0, monthlyNetCashFlow: 0 };
}

export function scoreRetailPlazaDeal(deal: DealLike, bb: BuyBoxLike): ScoreResult {
  const breakdown: CategoryScore[] = [];
  const price = num(deal.askingPrice) ?? 0;
  const noi = num(deal.noi) ?? 0;
  const fin = computeFinance({ price, noi, ltv: bb.ltv, ratePercent: bb.interestRate, amortizationYears: bb.amortizationYears });
  const dscr = fin.dscr;
  const capRateCalc = price > 0 ? (noi / price) * 100 : null;

  // ----- Cap Rate (20) -----
  const skipCapRate = bb.capRateMin === 0 && bb.capRateTarget === 0;
  if (skipCapRate) { breakdown.push(skip("Cap Rate", "No cap rate target set")); }
  else {
    const capRate = num(deal.capRateUnderwritten) ?? num(deal.capRateAsking) ?? capRateCalc;
    let pts = 0; let status: CheckStatus = "fail"; let detail: string;
    if (capRate === null) { detail = "Cap rate unknown"; }
    else if (capRate >= bb.capRateTarget) { pts = 20; status = "pass"; detail = `${capRate.toFixed(2)}% ≥ target ${bb.capRateTarget}%`; }
    else if (capRate >= bb.capRateMin) { pts = 12; status = "warn"; detail = `${capRate.toFixed(2)}% between floor ${bb.capRateMin}% and target ${bb.capRateTarget}%`; }
    else { detail = `${capRate.toFixed(2)}% below floor ${bb.capRateMin}%`; }
    breakdown.push({ category: "Cap Rate", points: pts, max: 20, status, detail });
  }

  // ----- DSCR (20) -----
  const dscrFloor = num(bb.dscrMin);
  if (!dscrFloor) { breakdown.push(skip("DSCR", "No DSCR minimum set")); }
  else {
    let pts = 0; let status: CheckStatus = "fail"; let detail: string;
    if (dscr === null) { pts = 20; status = "pass"; detail = "All cash — no debt service"; }
    else if (dscr >= dscrFloor * 1.07) { pts = 20; status = "pass"; detail = `${dscr.toFixed(2)}x — strong coverage`; }
    else if (dscr >= dscrFloor) { pts = 15; status = "pass"; detail = `${dscr.toFixed(2)}x ≥ ${dscrFloor.toFixed(2)}x floor`; }
    else if (dscr >= dscrFloor * 0.93) { pts = 5; status = "warn"; detail = `${dscr.toFixed(2)}x slightly below ${dscrFloor.toFixed(2)}x floor`; }
    else { detail = `${dscr.toFixed(2)}x well below ${dscrFloor.toFixed(2)}x floor`; }
    breakdown.push({ category: "DSCR", points: pts, max: 20, status, detail });
  }

  // ----- Anchor Tenant Quality (15) -----
  {
    const anchor = deal.anchorTenant ?? "";
    let pts = 0; let status: CheckStatus = "info"; let detail: string;
    if (!anchor) { detail = "No anchor tenant identified"; }
    else {
      const isNational = /walmart|target|home depot|lowe|kroger|publix|costco|tj maxx|ross|burlington|dollar tree|dollar general|family dollar|aldi|trader joe|whole foods|sprouts|petco|petsmart|best buy|dick's|ulta|bath|academy/i.test(anchor);
      const isStrong = /cvs|walgreens|starbucks|mcdonald|chick-fil|chipotle|panera|subway|dunkin|7-eleven|autozone|o'reilly|advance auto|marshall|old navy|gap|h&m|michaels|jo-ann|hobby lobby|cinema|amc|regal/i.test(anchor);
      if (isNational) { pts = 15; status = "pass"; detail = `${anchor} — national credit anchor`; }
      else if (isStrong) { pts = 10; status = "pass"; detail = `${anchor} — strong regional/national anchor`; }
      else { pts = 5; status = "warn"; detail = `${anchor} — anchor identified, credit quality unknown`; }
    }
    breakdown.push({ category: "Anchor Tenant", points: pts, max: 15, status, detail });
  }

  // ----- WALT (15) -----
  const rentRoll2 = deal.rentRoll ?? [];
  const walt2 = num(deal.walt) ?? (rentRoll2.length > 0 ? computeWalt(rentRoll2) : null);
  {
    let pts = 0; let status: CheckStatus = "fail"; let detail: string;
    if (walt2 === null) { detail = "WALT unknown — no rent roll data"; status = "info"; }
    else if (walt2 >= 7) { pts = 15; status = "pass"; detail = `${walt2.toFixed(1)} yrs — strong income durability`; }
    else if (walt2 >= 5) { pts = 10; status = "warn"; detail = `${walt2.toFixed(1)} yrs — moderate term`; }
    else if (walt2 >= 3) { pts = 5; status = "warn"; detail = `${walt2.toFixed(1)} yrs — near-term rollover risk`; }
    else { detail = `${walt2.toFixed(1)} yrs — high rollover risk`; }
    breakdown.push({ category: "WALT", points: pts, max: 15, status, detail });
  }

  // ----- Occupancy (15) -----
  const occ2 = num(deal.vacancyRate) !== null ? 100 - (num(deal.vacancyRate) ?? 0) : null;
  {
    let pts = 0; let status: CheckStatus = "fail"; let detail: string;
    if (occ2 === null) { detail = "Occupancy unknown"; status = "info"; }
    else if (occ2 >= 95) { pts = 15; status = "pass"; detail = `${occ2.toFixed(0)}% occupied`; }
    else if (occ2 >= 90) { pts = 10; status = "warn"; detail = `${occ2.toFixed(0)}% — minor vacancy`; }
    else if (occ2 >= 85) { pts = 5; status = "warn"; detail = `${occ2.toFixed(0)}% — meaningful vacancy`; }
    else { detail = `${occ2.toFixed(0)}% — high vacancy`; }
    breakdown.push({ category: "Occupancy", points: pts, max: 15, status, detail });
  }

  // ----- Price vs Ceiling (5) -----
  if (bb.priceMax > 0) {
    const stretch2 = num(bb.priceStretch) ?? bb.priceMax;
    let pts = 0; let status: CheckStatus = "fail"; let detail: string;
    if (price <= 0) { detail = "Price unknown"; status = "info"; }
    else if (price <= bb.priceMax) { pts = 5; status = "pass"; detail = `$${(price / 1e6).toFixed(2)}M ≤ ceiling`; }
    else if (price <= stretch2) { pts = 3; status = "warn"; detail = `$${(price / 1e6).toFixed(2)}M in stretch range`; }
    else { detail = `$${(price / 1e6).toFixed(2)}M above stretch ceiling`; }
    breakdown.push({ category: "Price vs Ceiling", points: pts, max: 5, status, detail });
  } else {
    breakdown.push(skip("Price vs Ceiling", "No price ceiling set"));
  }

  // ----- Demographics (5) -----
  const hhiFloor3 = num(bb.hhiMin);
  if (!hhiFloor3) { breakdown.push(skip("Demographics", "No HHI minimum set")); }
  else {
    const hhi3 = num(deal.hhi3Mile) ?? num(deal.hhi1Mile) ?? num(deal.hhi5Mile);
    let pts = 0; let status: CheckStatus = "warn"; let detail: string;
    if (hhi3 === null) { detail = "HHI unknown"; }
    else if (hhi3 >= hhiFloor3 * 1.22) { pts = 5; status = "pass"; detail = `HHI $${Math.round(hhi3 / 1000)}K — strong`; }
    else if (hhi3 >= hhiFloor3) { pts = 3; status = "warn"; detail = `HHI $${Math.round(hhi3 / 1000)}K ≥ floor $${Math.round(hhiFloor3 / 1000)}K`; }
    else { pts = 0; status = "fail"; detail = `HHI $${Math.round(hhi3 / 1000)}K < floor $${Math.round(hhiFloor3 / 1000)}K`; }
    breakdown.push({ category: "Demographics", points: pts, max: 5, status, detail });
  }

  const baseMetrics3 = breakdown.filter((c) => c.max > 0);
  const baseMax3 = baseMetrics3.reduce((s, c) => s + c.max, 0);
  const baseEarned3 = baseMetrics3.reduce((s, c) => s + c.points, 0);
  let score3 = baseMax3 > 0 ? Math.round((baseEarned3 / baseMax3) * 100) : 0;
  score3 = appendBonuses(deal, bb, breakdown, score3);

  return { score: score3, grade: gradeFor(score3) as ScoreResult["grade"], breakdown, dscrCalculated: dscr, capRateCalculated: capRateCalc, loanAmount: fin.loanAmount, monthlyDebtService: fin.monthlyDebtService, monthlyNetCashFlow: fin.monthlyNetCashFlow };
}

export function scoreDeal(deal: DealLike, bb: BuyBoxLike): ScoreResult {
  const breakdown: CategoryScore[] = [];
  const isOtherCre = (deal.dealCategory ?? "net_lease") === "other_cre";
  if ((deal.dealCategory ?? "net_lease") === "multi_tenant") return scoreMultiTenantDeal(deal, bb);
  if ((deal.dealCategory ?? "net_lease") === "retail_plaza") return scoreRetailPlazaDeal(deal, bb);
  if ((deal.dealCategory ?? "net_lease") === "land") return scoreLandDeal(deal, bb);

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

  // ----- Cap Rate (20) — skip for Other CRE or if no target set -----
  const skipCapRate = isOtherCre || (bb.capRateMin === 0 && bb.capRateTarget === 0);
  if (skipCapRate) {
    breakdown.push(skip("Cap Rate", isOtherCre ? "Not applicable for Other CRE" : "No cap rate target set"));
  } else {
    const capRate =
      num(deal.capRateUnderwritten) ?? num(deal.capRateAsking) ?? capRateCalc;
    let pts = 0;
    let status: CheckStatus = "fail";
    let detail: string;
    if (capRate === null) {
      detail = "Cap rate unknown";
    } else if (capRate >= bb.capRateTarget) {
      pts = 20; status = "pass";
      detail = `${capRate.toFixed(2)}% ≥ target ${bb.capRateTarget}%`;
    } else if (capRate >= bb.capRateMin) {
      pts = 12; status = "warn";
      detail = `${capRate.toFixed(2)}% between floor ${bb.capRateMin}% and target ${bb.capRateTarget}%`;
    } else {
      pts = 0; status = "fail";
      detail = `${capRate.toFixed(2)}% below floor ${bb.capRateMin}%`;
    }
    breakdown.push({ category: "Cap Rate", points: pts, max: 20, status, detail });
  }

  // ----- DSCR (20) — skip for Other CRE or if no DSCR minimum set -----
  const dscrFloor = num(bb.dscrMin);
  const skipDscr = isOtherCre || (dscrFloor === null || dscrFloor === 0);
  if (skipDscr) {
    breakdown.push(skip("DSCR", isOtherCre ? "Not applicable for Other CRE" : "No DSCR minimum set"));
  } else {
    let pts = 0;
    let status: CheckStatus = "fail";
    let detail: string;
    if (dscr === null) {
      pts = 20; status = "pass";
      detail = "All cash — no debt service";
    } else if (dscr >= dscrFloor! * 1.07) {
      pts = 20; status = "pass";
      detail = `${dscr.toFixed(2)}x — strong coverage`;
    } else if (dscr >= dscrFloor!) {
      pts = 15; status = "pass";
      detail = `${dscr.toFixed(2)}x ≥ ${dscrFloor!.toFixed(2)}x floor`;
    } else if (dscr >= dscrFloor! * 0.93) {
      pts = 5; status = "warn";
      detail = `${dscr.toFixed(2)}x slightly below ${dscrFloor!.toFixed(2)}x floor`;
    } else {
      pts = 0; status = "fail";
      detail = `${dscr.toFixed(2)}x well below ${dscrFloor!.toFixed(2)}x floor`;
    }
    breakdown.push({ category: "DSCR", points: pts, max: 20, status, detail });
  }

  // ----- Lease Type (15) — skip for Other CRE -----
  if (isOtherCre) {
    breakdown.push(skip("Lease Type", "Not applicable for Other CRE"));
  } else {
    const lt = (deal.leaseType ?? "").toLowerCase();
    let pts = 0;
    let status: CheckStatus = "fail";
    let detail = lt || "unknown";
    if (lt === "absolute_nnn") {
      pts = 15; status = "pass"; detail = "Absolute NNN";
    } else if (lt === "nnn") {
      pts = 10; status = "pass"; detail = "NNN";
    } else if (lt === "modified_nnn") {
      pts = 5; status = "warn"; detail = "Modified NNN";
    } else if (lt === "gross") {
      pts = 0; status = "fail"; detail = "Gross";
    } else {
      detail = "Lease type unknown";
    }
    breakdown.push({ category: "Lease Type", points: pts, max: 15, status, detail });
  }

  // ----- Term Remaining (15) — skip for Other CRE or if no term minimum set -----
  const termMin = num(bb.termMinYears);
  const skipTerm = isOtherCre || (termMin === null || termMin === 0);
  if (skipTerm) {
    breakdown.push(skip("Term Remaining", isOtherCre ? "Not applicable for Other CRE" : "No minimum term set"));
  } else {
    const t = num(deal.termRemainingYears);
    const tPref = num(bb.termPreferredYears) ?? termMin!;
    let pts = 0;
    let status: CheckStatus = "fail";
    let detail: string;
    if (t === null) {
      detail = "Term unknown";
    } else if (t >= tPref + 5) {
      pts = 15; status = "pass"; detail = `${t} yrs — excellent`;
    } else if (t >= tPref) {
      pts = 10; status = "pass"; detail = `${t} yrs ≥ preferred ${tPref} yrs`;
    } else if (t >= termMin!) {
      pts = 5; status = "warn"; detail = `${t} yrs ≥ min ${termMin} yrs`;
    } else {
      pts = 0; status = "fail"; detail = `${t} yrs < min ${termMin} yrs`;
    }
    breakdown.push({ category: "Term Remaining", points: pts, max: 15, status, detail });
  }

  // ----- Rent Bumps (10) — skip for Other CRE -----
  if (isOtherCre) {
    breakdown.push(skip("Rent Bumps", "Not applicable for Other CRE"));
  } else {
    const bp = num(deal.bumpPercent);
    const struct = (deal.bumpStructure ?? "").toLowerCase();
    const isFlat = struct.includes("flat") || (bp !== null && bp === 0);
    const hasAltStructure =
      /10%?\s*(every)?\s*5\s*(yr|year)/.test(struct) ||
      struct.includes("10% every 5");
    let pts = 5;
    let status: CheckStatus = "warn";
    let detail = struct || (bp !== null ? `${bp}%` : "unknown");
    if (isFlat) {
      pts = 0; status = "fail"; detail = "Flat / no escalations";
    } else if ((bp !== null && bp >= 2) || hasAltStructure) {
      pts = 10; status = "pass";
      detail = bp !== null ? `${bp}% annual` : "10% every 5 years";
    } else if (bp !== null) {
      pts = 5; status = "warn"; detail = `${bp}% (< 2% / irregular)`;
    } else {
      pts = 5; status = "warn"; detail = "Bump structure unclear";
    }
    breakdown.push({ category: "Rent Bumps", points: pts, max: 10, status, detail });
  }

  // ----- Guaranty (10) — skip for Other CRE -----
  if (isOtherCre) {
    breakdown.push(skip("Guaranty", "Not applicable for Other CRE"));
  } else {
    const g = (deal.guarantyType ?? "").toLowerCase();
    const units = num(deal.operatorUnitCount);
    let pts = 0;
    let status: CheckStatus = "fail";
    let detail = g || "unknown";
    if (g === "corporate") {
      pts = 10; status = "pass"; detail = "Corporate";
    } else if (g === "multi_unit_franchisee") {
      if (units !== null && units >= 12) {
        pts = 8; status = "pass"; detail = `Multi-unit franchisee (${units} units)`;
      } else {
        pts = 5; status = "warn"; detail = `Multi-unit franchisee (${units ?? "?"} units, < 12)`;
      }
    } else if (g === "single_personal") {
      pts = 2; status = "warn"; detail = "Single / personal guaranty";
    } else {
      detail = "Guaranty unknown";
    }
    breakdown.push({ category: "Guaranty", points: pts, max: 10, status, detail });
  }

  // ----- Price vs Ceiling (5) — skip if no price max set -----
  const skipPrice = bb.priceMax === 0;
  if (skipPrice) {
    breakdown.push(skip("Price vs Ceiling", "No price ceiling set"));
  } else {
    const stretch = num(bb.priceStretch) ?? bb.priceMax;
    let pts = 0;
    let status: CheckStatus = "fail";
    let detail: string;
    if (price <= 0) {
      detail = "Price unknown"; status = "info";
    } else if (price <= bb.priceMax) {
      pts = 5; status = "pass"; detail = `$${(price / 1e6).toFixed(2)}M ≤ ceiling`;
    } else if (price <= stretch) {
      pts = 3; status = "warn"; detail = `$${(price / 1e6).toFixed(2)}M in stretch range`;
    } else {
      pts = 0; status = "fail"; detail = `$${(price / 1e6).toFixed(2)}M above stretch ceiling`;
    }
    breakdown.push({ category: "Price vs Ceiling", points: pts, max: 5, status, detail });
  }

  // ----- Demographics (5) — skip if no HHI minimum set -----
  const hhiFloor = num(bb.hhiMin);
  const skipHhi = hhiFloor === null || hhiFloor === 0;
  if (skipHhi) {
    breakdown.push(skip("Demographics", "No HHI minimum set"));
  } else {
    const hhi = num(deal.hhi3Mile) ?? num(deal.hhi1Mile) ?? num(deal.hhi5Mile);
    let pts = 0;
    let status: CheckStatus = "warn";
    let detail: string;
    if (hhi === null) {
      pts = 0; status = "warn"; detail = "HHI unknown";
    } else if (hhi >= hhiFloor! * 1.22) {
      pts = 5; status = "pass"; detail = `HHI $${Math.round(hhi / 1000)}K — strong`;
    } else if (hhi >= hhiFloor!) {
      pts = 3; status = "warn"; detail = `HHI $${Math.round(hhi / 1000)}K ≥ floor $${Math.round(hhiFloor! / 1000)}K`;
    } else {
      pts = 0; status = "fail"; detail = `HHI $${Math.round(hhi / 1000)}K < floor $${Math.round(hhiFloor! / 1000)}K`;
    }
    breakdown.push({ category: "Demographics", points: pts, max: 5, status, detail });
  }

  // ----- Normalize base score against achievable max -----
  // Only metrics with max > 0 count toward the score
  const baseMetrics = breakdown.filter((c) => c.max > 0);
  const baseMax = baseMetrics.reduce((s, c) => s + c.max, 0);
  const baseEarned = baseMetrics.reduce((s, c) => s + c.points, 0);
  let score = baseMax > 0 ? Math.round((baseEarned / baseMax) * 100) : 0;

  // ----- Asset Type Match (bonus up to +5, added after normalization) -----
  {
    const at = (deal.assetType ?? "").toLowerCase();
    let bonus = 0;
    let status: CheckStatus = "info";
    let detail = at || "unknown";
    const preferred = bb.assetTypesPreferred.map((s) => s.toLowerCase());
    const acceptable = bb.assetTypesAcceptable.map((s) => s.toLowerCase());
    if (at === "eclc") {
      bonus = 5; status = "pass"; detail = "ECLC (primary thesis)";
    } else if (preferred.includes(at)) {
      bonus = 3; status = "pass"; detail = `Preferred type (${at})`;
    } else if (acceptable.includes(at)) {
      bonus = 1; status = "warn"; detail = `Acceptable type (${at})`;
    } else if (at) {
      detail = `Off-thesis type (${at})`;
    }
    breakdown.push({ category: "Asset Type Match (bonus)", points: bonus, max: 5, status, detail });
    score += bonus;
  }

  // ----- Location Match (bonus up to +5) -----
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
        bonus = 5; status = "pass";
        detail = `${deal.city ?? ""}${deal.city && deal.state ? ", " : ""}${deal.state ?? ""} — in preferred locations`;
      } else {
        bonus = 0; status = "warn";
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

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    grade: gradeFor(score) as ScoreResult["grade"],
    breakdown,
    dscrCalculated: dscr,
    capRateCalculated: capRateCalc,
    loanAmount: fin.loanAmount,
    monthlyDebtService: fin.monthlyDebtService,
    monthlyNetCashFlow: fin.monthlyNetCashFlow,
  };
}

// Recompute score from a stored breakdown with optional metric toggles.
// Bonus categories (containing "bonus") are added after normalization.
export function computeScoreFromBreakdown(
  breakdown: CategoryScore[],
  enabledCategories?: Set<string>
): { score: number; grade: ScoreResult["grade"] } {
  const enabled = enabledCategories ?? new Set(breakdown.map((c) => c.category));
  const base = breakdown.filter((c) => !c.category.toLowerCase().includes("bonus"));
  const bonuses = breakdown.filter((c) => c.category.toLowerCase().includes("bonus"));

  const activeBase = base.map((c) =>
    enabled.has(c.category) ? c : { ...c, points: 0, max: 0 }
  );
  const totalMax = activeBase.reduce((s, c) => s + c.max, 0);
  const totalPts = activeBase.reduce((s, c) => s + c.points, 0);
  let score = totalMax > 0 ? Math.round((totalPts / totalMax) * 100) : 0;

  for (const bonus of bonuses) {
    if (enabled.has(bonus.category)) score += bonus.points;
  }

  score = Math.max(0, Math.min(100, score));
  return { score, grade: gradeFor(score) as ScoreResult["grade"] };
}
