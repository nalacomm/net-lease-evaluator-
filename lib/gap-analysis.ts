import { askJson } from "./anthropic";
import { scoreDeal, BuyBoxLike, DealLike } from "./scoring";
import { fmtMoney, fmtPercent } from "./format";
import { labelFor, ASSET_TYPES, LEASE_TYPES, GUARANTY_TYPES } from "./constants";

export interface GapAnalysisResult {
  isExceptional: boolean;
  exceptionalReason: string | null;
  buyBoxAdjustments: {
    field: string;
    currentValue: string;
    requiredValue: string;
    impact: string;
  }[];
  verdict: string;
}

export async function runGapAnalysis(
  deal: DealLike & {
    tenantName?: string | null;
    address?: string | null;
    assetType?: string | null;
  },
  bb: BuyBoxLike & {
    capRateMin: number;
    capRateTarget: number;
    priceMax: number;
    priceStretch?: number | null;
    termMinYears: number;
    dscrMin: number;
    bumpMinPercent?: number | null;
    guarantyPreferred: string;
  }
): Promise<GapAnalysisResult> {
  const scoreResult = scoreDeal(deal, bb);

  const dealDesc = [
    `Address: ${deal.address ?? "?"}`,
    `Tenant: ${deal.tenantName ?? "?"}`,
    `Asset type: ${labelFor(ASSET_TYPES, deal.assetType)}`,
    `Price: ${fmtMoney(deal.askingPrice)}`,
    `NOI: ${fmtMoney(deal.noi)}`,
    `Cap rate: ${fmtPercent(deal.capRateAsking)}`,
    `Lease: ${labelFor(LEASE_TYPES, deal.leaseType)}`,
    `Term remaining: ${deal.termRemainingYears ?? "?"} yrs`,
    `Guaranty: ${labelFor(GUARANTY_TYPES, deal.guarantyType)}`,
    `Operator units: ${deal.operatorUnitCount ?? "?"}`,
    `Score vs buy box: ${scoreResult.score}/100 (${scoreResult.grade})`,
  ].join("\n");

  const bbDesc = [
    `Cap rate floor: ${bb.capRateMin}%, target: ${bb.capRateTarget}%`,
    `Max price: ${fmtMoney(bb.priceMax)}${bb.priceStretch ? ` (stretch: ${fmtMoney(bb.priceStretch)})` : ""}`,
    `Lease: preferred ${(bb as unknown as Record<string,string>).leaseTypePreferred ?? "?"}, acceptable ${(bb as unknown as Record<string,string>).leaseTypeAcceptable ?? "?"}`,
    `Min term: ${bb.termMinYears} yrs`,
    `Guaranty: ${bb.guarantyPreferred} preferred`,
    `Min DSCR: ${bb.dscrMin}x`,
    `Min bump: ${bb.bumpMinPercent ?? 0}%`,
  ].join("\n");

  const breakdown = scoreResult.breakdown
    .filter((b) => b.status !== "pass")
    .map((b) => `${b.category}: ${b.points}/${b.max} — ${b.detail}`)
    .join("\n");

  return askJson<GapAnalysisResult>(
    `You are a commercial real estate investment advisor.

DEAL:
${dealDesc}

INVESTOR BUY BOX:
${bbDesc}

SCORE GAPS (categories that failed or warned):
${breakdown || "None — deal meets all thresholds."}

Analyze this deal:
1. Despite any low score, are there exceptional qualities that make it potentially worth a second look? (location, tenant quality, construction age, market position, credit, etc.)
2. What specific buy box parameters would the investor need to relax to make this deal work?
3. Give a plain-language verdict.

Return JSON only:
{
  "isExceptional": true/false,
  "exceptionalReason": "string or null — only if genuinely compelling",
  "buyBoxAdjustments": [
    { "field": "human-readable field name", "currentValue": "current buy box value", "requiredValue": "what it would need to be", "impact": "brief note on trade-off" }
  ],
  "verdict": "2-3 sentence plain summary"
}`,
    { maxTokens: 800 }
  );
}
