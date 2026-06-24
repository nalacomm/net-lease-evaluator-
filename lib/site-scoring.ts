export type CheckStatus = "pass" | "warn" | "fail" | "info" | "skip";

export interface SiteCategoryScore {
  category: string;
  points: number;
  max: number;
  status: CheckStatus;
  detail: string;
}

export interface SiteScoreResult {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  breakdown: SiteCategoryScore[];
}

export interface SiteLike {
  squareFeet?: number | null;
  askingRentPsf?: number | null;
  dailyTraffic?: number | null;
  population3mi?: number | null;
  population1mi?: number | null;
  population5mi?: number | null;
  medianIncome?: number | null;
  parkingRatio?: number | null;
  leaseType?: string | null;
  leaseTermOffered?: number | null;
  city?: string | null;
  state?: string | null;
  siteType?: string | null;
}

export interface RequirementsLike {
  minSF?: number | null;
  maxSF?: number | null;
  preferredSF?: number | null;
  minRentPsf?: number | null;
  maxRentPsf?: number | null;
  minTraffic?: number | null;
  minPopulation?: number | null;
  minIncome?: number | null;
  minParking?: number | null;
  leaseType?: string | null;
  minTerm?: number | null;
  targetMarkets?: string[];
  siteTypePrefs?: string[];
}

function gradeFor(score: number): SiteScoreResult["grade"] {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "F";
}

const num = (v: number | null | undefined): number | null =>
  v === null || v === undefined || isNaN(v as number) ? null : v as number;

export function scoreSite(site: SiteLike, req: RequirementsLike): SiteScoreResult {
  const breakdown: SiteCategoryScore[] = [];

  // Size Fit (30) — skip if site SF not provided
  {
    const sf = num(site.squareFeet);
    const minSf = num(req.minSF);
    const maxSf = num(req.maxSF);
    let pts = 0, max = 30, status: CheckStatus = "skip", detail = "Size not provided — not scored";
    if (sf !== null && (minSf !== null || maxSf !== null)) {
      const tooSmall = minSf !== null && sf < minSf * 0.9;
      const tooLarge = maxSf !== null && sf > maxSf * 1.1;
      const marginalSmall = minSf !== null && sf < minSf && sf >= minSf * 0.9;
      const marginalLarge = maxSf !== null && sf > maxSf && sf <= maxSf * 1.1;
      if (!tooSmall && !tooLarge && !marginalSmall && !marginalLarge) {
        pts = 30; status = "pass"; detail = `${sf.toLocaleString()} SF — in range`;
      } else if (marginalSmall || marginalLarge) {
        pts = 18; status = "warn"; detail = `${sf.toLocaleString()} SF — marginal fit`;
      } else {
        pts = 0; status = "fail"; detail = `${sf.toLocaleString()} SF — outside range (${minSf?.toLocaleString() ?? "?"}–${maxSf?.toLocaleString() ?? "?"})`;
      }
    } else if (sf !== null) {
      max = 0; status = "skip"; detail = `${sf.toLocaleString()} SF (no size requirement set)`;
    } else {
      max = 0; // not scored
    }
    breakdown.push({ category: "Size Fit", points: pts, max, status, detail });
  }

  // Rent Fit (30) — skip if site rent not provided
  {
    const rent = num(site.askingRentPsf);
    const maxRent = num(req.maxRentPsf);
    const minRent = num(req.minRentPsf);
    let pts = 0, max = 30, status: CheckStatus = "skip", detail = "Rent not provided — not scored";
    if (rent !== null && maxRent !== null) {
      if (rent <= maxRent) {
        pts = 30; status = "pass"; detail = `$${rent.toFixed(2)}/SF ≤ max $${maxRent.toFixed(2)}/SF`;
      } else if (rent <= maxRent * 1.1) {
        pts = 15; status = "warn"; detail = `$${rent.toFixed(2)}/SF slightly above max`;
      } else {
        pts = 0; status = "fail"; detail = `$${rent.toFixed(2)}/SF above max $${maxRent.toFixed(2)}/SF`;
      }
    } else if (rent !== null && minRent !== null) {
      if (rent >= minRent) {
        pts = 30; status = "pass"; detail = `$${rent.toFixed(2)}/SF ≥ min $${minRent.toFixed(2)}/SF`;
      } else {
        pts = 15; status = "warn"; detail = `$${rent.toFixed(2)}/SF — no max set`;
      }
    } else if (rent !== null) {
      max = 0; status = "skip"; detail = `$${rent.toFixed(2)}/SF/mo (no rent requirement set)`;
    } else {
      max = 0; // not scored
    }
    breakdown.push({ category: "Rent Fit", points: pts, max, status, detail });
  }

  // Traffic (10) — skip if site traffic not provided
  {
    const traffic = num(site.dailyTraffic);
    const minTraffic = num(req.minTraffic);
    let pts = 0, max = 10, status: CheckStatus = "skip", detail = "Traffic not provided — not scored";
    if (traffic !== null && minTraffic !== null) {
      if (traffic >= minTraffic * 1.5) {
        pts = 10; status = "pass"; detail = `${traffic.toLocaleString()} VPD ≥ 1.5× min`;
      } else if (traffic >= minTraffic) {
        pts = 8; status = "pass"; detail = `${traffic.toLocaleString()} VPD meets min ${minTraffic.toLocaleString()}`;
      } else if (traffic >= minTraffic * 0.8) {
        pts = 4; status = "warn"; detail = `${traffic.toLocaleString()} VPD — within 20% of min`;
      } else {
        pts = 0; status = "fail"; detail = `${traffic.toLocaleString()} VPD below min ${minTraffic.toLocaleString()}`;
      }
    } else if (traffic !== null) {
      max = 0; status = "skip"; detail = `${traffic.toLocaleString()} VPD (no traffic requirement set)`;
    } else {
      max = 0; // not scored
    }
    breakdown.push({ category: "Traffic", points: pts, max, status, detail });
  }

  // Income / Demographics (10) — skip if site income not provided
  {
    const income = num(site.medianIncome);
    const minIncome = num(req.minIncome);
    let pts = 0, max = 10, status: CheckStatus = "skip", detail = "Income not provided — not scored";
    if (income !== null && minIncome !== null) {
      if (income >= minIncome * 1.2) {
        pts = 10; status = "pass"; detail = `$${Math.round(income / 1000)}K median income — exceeds req`;
      } else if (income >= minIncome) {
        pts = 7; status = "pass"; detail = `$${Math.round(income / 1000)}K median income meets req`;
      } else if (income >= minIncome * 0.85) {
        pts = 3; status = "warn"; detail = `$${Math.round(income / 1000)}K — slightly below req`;
      } else {
        pts = 0; status = "fail"; detail = `$${Math.round(income / 1000)}K below req $${Math.round(minIncome / 1000)}K`;
      }
    } else if (income !== null) {
      max = 0; status = "skip"; detail = `$${Math.round(income / 1000)}K median income (no income requirement set)`;
    } else {
      max = 0; // not scored
    }
    breakdown.push({ category: "Demographics / Income", points: pts, max, status, detail });
  }

  // Population (5) — skip if site population not provided
  {
    const pop = num(site.population3mi) ?? num(site.population1mi) ?? num(site.population5mi);
    const minPop = num(req.minPopulation);
    let pts = 0, max = 5, status: CheckStatus = "skip", detail = "Population not provided — not scored";
    if (pop !== null && minPop !== null) {
      if (pop >= minPop) {
        pts = 5; status = "pass"; detail = `${pop.toLocaleString()} pop meets req`;
      } else if (pop >= minPop * 0.8) {
        pts = 2; status = "warn"; detail = `${pop.toLocaleString()} pop — slightly below req`;
      } else {
        pts = 0; status = "fail"; detail = `${pop.toLocaleString()} below req ${minPop.toLocaleString()}`;
      }
    } else if (pop !== null) {
      max = 0; status = "skip"; detail = `${pop.toLocaleString()} pop (no population requirement set)`;
    } else {
      max = 0; // not scored
    }
    breakdown.push({ category: "Population", points: pts, max, status, detail });
  }

  // Parking (5) — skip if site parking not provided
  {
    const parking = num(site.parkingRatio);
    const minParking = num(req.minParking);
    let pts = 0, max = 5, status: CheckStatus = "skip", detail = "Parking not provided — not scored";
    if (parking !== null && minParking !== null) {
      if (parking >= minParking) {
        pts = 5; status = "pass"; detail = `${parking.toFixed(1)}/1,000 SF meets req`;
      } else if (parking >= minParking * 0.8) {
        pts = 2; status = "warn"; detail = `${parking.toFixed(1)}/1,000 SF — below req ${minParking.toFixed(1)}`;
      } else {
        pts = 0; status = "fail"; detail = `${parking.toFixed(1)}/1,000 SF — significantly below req`;
      }
    } else if (parking !== null) {
      max = 0; status = "skip"; detail = `${parking.toFixed(1)}/1,000 SF (no parking requirement set)`;
    } else {
      max = 0; // not scored
    }
    breakdown.push({ category: "Parking", points: pts, max, status, detail });
  }

  // Proportional score: only categories with data count toward the denominator
  const totalMax = breakdown.reduce((s, c) => s + c.max, 0);
  const totalPts = breakdown.reduce((s, c) => s + c.points, 0);
  let score = totalMax > 0 ? Math.round((totalPts / totalMax) * 100) : 0;

  // Market Match (bonus up to +5 after proportional base, capped at 100)
  {
    const city = (site.city ?? "").toLowerCase().trim();
    const state = (site.state ?? "").toLowerCase().trim();
    const markets = (req.targetMarkets ?? []).map((m) => m.toLowerCase().trim());
    let bonus = 0, status: CheckStatus = "skip", detail = "No target markets set — not scored";
    if (markets.length > 0) {
      const match = markets.some((m) => city.includes(m) || m.includes(city) || state.includes(m));
      if (match) {
        bonus = 10; status = "pass"; detail = `${site.city}, ${site.state} — in target markets`;
      } else {
        bonus = 0; status = "warn"; detail = `${site.city ?? "?"}, ${site.state ?? "?"} — not in target markets`;
      }
      breakdown.push({ category: "Market Match (bonus)", points: bonus, max: 10, status, detail });
      score += bonus;
    }
    // If no target markets set: don't add to breakdown at all (fully neutral)
  }

  score = Math.max(0, Math.min(100, score));

  return { score, grade: gradeFor(score), breakdown };
}
