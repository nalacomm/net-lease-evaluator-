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
  },
  additionalContext?: string,
  enabledCategories?: string[]
): Promise<GapAnalysisResult> {
  const scoreResult = scoreDeal(deal, bb);
  const isOtherCre = (deal.dealCategory ?? "net_lease") === "other_cre";

  const contextSection = additionalContext?.trim()
    ? `\nADDITIONAL CONTEXT PROVIDED BY ANALYST:\n${additionalContext.trim()}\n`
    : "";

  // AI prose never mentions scores or grades — display is handled by the UI
  const scoreSuppressionInstruction = "\nDo not mention scores, grades, or numerical ratings in your written analysis.";

  // Build suppression instruction for deselected categories
  const disabledCategories = enabledCategories
    ? scoreResult.breakdown.map((b) => b.category).filter((c) => !enabledCategories.includes(c))
    : [];
  const categoryInstruction = disabledCategories.length > 0
    ? `\nThe investor has opted out of evaluating the following criteria — do not mention them: ${disabledCategories.join(", ")}.`
    : "";

  // Other CRE prompt — focused only on applicable criteria
  if (isOtherCre) {
    const assetLabel = labelFor(ASSET_TYPES, deal.assetType) || "Other CRE";
    const dealDesc = [
      `Address: ${deal.address ?? "?"}`,
      `Asset type: ${assetLabel} (Other CRE — not a net lease income property)`,
      `Asking price: ${fmtMoney(deal.askingPrice)}`,
      `Location: ${[deal.city, deal.state].filter(Boolean).join(", ") || "?"}`,
    ].join("\n");

    const bbDesc = [
      bb.priceMax > 0 ? `Max price budget: ${fmtMoney(bb.priceMax)}${bb.priceStretch ? ` (stretch: ${fmtMoney(bb.priceStretch)})` : ""}` : null,
      (bb.assetTypesPreferred ?? []).length ? `Preferred asset types: ${bb.assetTypesPreferred.join(", ")}` : null,
      (bb.assetTypesAcceptable ?? []).length ? `Acceptable asset types: ${bb.assetTypesAcceptable.join(", ")}` : null,
      (bb.preferredStates ?? []).length ? `Preferred states: ${bb.preferredStates!.join(", ")}` : null,
      (bb.targetMarkets ?? []).length ? `Target markets: ${bb.targetMarkets!.join(", ")}` : null,
      bb.hhiMin ? `Min area income: ${fmtMoney(bb.hhiMin)}` : null,
    ].filter(Boolean).join("\n") || "General commercial investment criteria.";

    const appliedBreakdown = scoreResult.breakdown
      .filter((b) => b.max > 0 && b.status !== "pass" && (enabledCategories ? enabledCategories.includes(b.category) : true))
      .map((b) => `${b.category}: ${b.points}/${b.max} — ${b.detail}`)
      .join("\n");

    return askJson<GapAnalysisResult>(
      `You are a commercial real estate investment advisor.

DEAL (Other CRE — evaluate on its own merits, not as a net lease income property):
${dealDesc}

INVESTOR CRITERIA (applicable to this deal type):
${bbDesc}

SCORE (${scoreResult.score}/100 based on applicable criteria):
${appliedBreakdown || "All applicable criteria passed."}
${contextSection}
This is NOT a net lease deal. Do not mention NNN, lease type, DSCR, term, guaranty, or cap rate in your analysis — those metrics simply don't apply here.${scoreSuppressionInstruction}${categoryInstruction}

Analyze this deal:
1. How well does it fit the investor's budget, location preferences, and asset type focus?
2. What is the investment thesis for this type of property (land banking, development, repositioning, etc.)?
3. Give a plain-language verdict on whether this deal fits the investor's strategy.

Return JSON only:
{
  "isExceptional": true/false,
  "exceptionalReason": "string or null — only if genuinely compelling",
  "buyBoxAdjustments": [
    { "field": "human-readable field name", "currentValue": "current investor criteria", "requiredValue": "what would be needed", "impact": "brief note" }
  ],
  "verdict": "2-3 sentence plain summary focused on the actual investment thesis"
}`,
      { maxTokens: 800 }
    );
  }

  // Net lease prompt — original logic
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
  ].join("\n");

  const bbDesc = [
    `Cap rate floor: ${bb.capRateMin}%, target: ${bb.capRateTarget}%`,
    `Max price: ${fmtMoney(bb.priceMax)}${bb.priceStretch ? ` (stretch: ${fmtMoney(bb.priceStretch)})` : ""}`,
    `Lease: preferred ${(bb as unknown as Record<string, string>).leaseTypePreferred ?? "?"}, acceptable ${(bb as unknown as Record<string, string>).leaseTypeAcceptable ?? "?"}`,
    `Min term: ${bb.termMinYears} yrs`,
    `Guaranty: ${bb.guarantyPreferred} preferred`,
    `Min DSCR: ${bb.dscrMin}x`,
    `Min bump: ${bb.bumpMinPercent ?? 0}%`,
  ].join("\n");

  const breakdown = scoreResult.breakdown
    .filter((b) => b.max > 0 && b.status !== "pass" && (enabledCategories ? enabledCategories.includes(b.category) : true))
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
${contextSection}${scoreSuppressionInstruction}${categoryInstruction}
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
