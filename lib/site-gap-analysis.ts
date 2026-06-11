import { askJson } from "./anthropic";
import { scoreSite, RequirementsLike, SiteLike } from "./site-scoring";

export interface SiteGapResult {
  isExceptional: boolean;
  exceptionalReason: string | null;
  requirementAdjustments: {
    field: string;
    currentValue: string;
    requiredValue: string;
    impact: string;
  }[];
  verdict: string;
}

export async function runSiteGapAnalysis(
  site: SiteLike & { name?: string | null; address?: string | null; city?: string | null; state?: string | null },
  req: RequirementsLike & { minSF?: number | null; maxSF?: number | null; maxRentPsf?: number | null; minTraffic?: number | null; minIncome?: number | null; targetMarkets?: string[] },
  tenantName: string
): Promise<SiteGapResult> {
  const scoreResult = scoreSite(site, req);

  const fmt = (v: number | null | undefined, prefix = "", suffix = "") =>
    v != null ? `${prefix}${v}${suffix}` : "?";

  const siteDesc = [
    `Site: ${site.name ?? "?"} — ${site.address ?? "?"}, ${site.city ?? "?"}, ${site.state ?? "?"}`,
    `Size: ${fmt(site.squareFeet, "", " SF")}`,
    `Asking rent: ${fmt(site.askingRentPsf, "$", "/SF/yr")}`,
    `Traffic: ${fmt(site.dailyTraffic, "", " VPD")}`,
    `3-mi population: ${fmt(site.population3mi)}`,
    `Median income: ${fmt(site.medianIncome, "$")}`,
    `Parking ratio: ${fmt(site.parkingRatio, "", "/1000 SF")}`,
    `Site type: ${site.siteType ?? "?"}`,
    `Score vs requirements: ${scoreResult.score}/100 (${scoreResult.grade})`,
  ].join("\n");

  const reqDesc = [
    `Tenant: ${tenantName}`,
    `Size range: ${fmt(req.minSF, "", " SF")} – ${fmt(req.maxSF, "", " SF")}`,
    `Max rent: ${fmt(req.maxRentPsf, "$", "/SF/yr")}`,
    `Min traffic: ${fmt(req.minTraffic, "", " VPD")}`,
    `Min income: ${fmt(req.minIncome, "$")}`,
    `Target markets: ${(req.targetMarkets ?? []).join(", ") || "?"}`,
  ].join("\n");

  const gaps = scoreResult.breakdown
    .filter((b) => b.status !== "pass" && b.status !== "info")
    .map((b) => `${b.category}: ${b.points}/${b.max} — ${b.detail}`)
    .join("\n");

  return askJson<SiteGapResult>(
    `You are a commercial real estate tenant rep advisor.

PROSPECTIVE SITE:
${siteDesc}

TENANT REQUIREMENTS:
${reqDesc}

SCORE GAPS (categories that failed or warned):
${gaps || "None — site meets all thresholds."}

Analyze this site:
1. Despite any low score, are there exceptional qualities — visibility, co-tenancy, market position, traffic patterns, demographics — that make it worth pursuing?
2. What specific requirements would need to be relaxed to make this site work?
3. Give a plain-language verdict for the tenant rep.

Return JSON only:
{
  "isExceptional": true/false,
  "exceptionalReason": "string or null",
  "requirementAdjustments": [
    { "field": "human-readable name", "currentValue": "current req value", "requiredValue": "what it needs to be", "impact": "brief trade-off note" }
  ],
  "verdict": "2-3 sentence plain summary"
}`,
    { maxTokens: 800 }
  );
}
