import { askJson } from "./anthropic";
import { scoreDeal, BuyBoxLike, DealLike } from "./scoring";
import { fmtMoney, fmtPercent } from "./format";
import { labelFor, ASSET_TYPES, LEASE_TYPES, GUARANTY_TYPES } from "./constants";

export type KnowledgeLevel = "level1" | "level2";

// Credit-tenant NNN convenience store educational context.
// Injected into the AI prompt when knowledgeLevel is set and the deal is a c-store.
const CREDIT_TENANT_CONTEXT: Record<KnowledgeLevel, string> = {
  level1: `INVESTOR KNOWLEDGE CONTEXT — LEVEL 1 (investor is new to credit-tenant NNN):
Credit-tenant NNN convenience store investing means buying a property leased to a company so large and stable that the rent check is essentially guaranteed for decades. The investor collects rent from a corporation worth billions — no management, no maintenance, no surprises. The trade-off is a lower cap rate in exchange for near-zero operational risk.

The investor may have been underwriting deals at franchisee cap rates (7.5–8%). Credit-tenant NNN assets (Royal Farms, Sheetz, Wawa) trade at 5.25–6.25% because the tenant IS the corporation — no franchisee layer, no guaranty burnoff, revenue backed by billions. The lower yield reflects dramatically lower risk.

These two product types serve different roles: franchisee TLE deals are yield engines that produce cash flow. Credit-tenant NNN deals are wealth-preservation anchors. Serious investors hold both.

Negative leverage context: If the investor's buy box uses 65% LTV at 7% interest, any deal below ~6.2% cap will show negative leverage. That is NOT a disqualifier for this asset class — it signals a different financing approach (lower LTV, credit-tenant loan rates of 5.5–6%, or partial cash). Evaluate the deal on total return (cash flow + principal paydown + depreciation + rent escalation + appreciation), not cash-on-cash alone.

WALT (weighted average lease term) is the first metric to check. Short WALT on a credit-tenant c-store means the tenant controls the exit — if they walk, the investor owns a gas station with fuel infrastructure and limited re-tenanting options.

Rent escalations (10% bumps every 5 years vs. 3% at option) determine whether income grows or erodes in real terms over a 15–20 year hold.

Leasehold vs. fee simple: If the deal is a ground lease or sublease, the investor owns an income stream, not the land. Lender appetite, resale liquidity, and residual value are all affected. Fee simple (owning land + building) is structurally cleaner for a first credit-tenant acquisition.

Frame the analysis for someone who understands the numbers but is encountering this asset class for the first time. Explain WHY the cap rate is lower and whether that's appropriate given the specific tenant, WALT, escalation structure, and lease type.`,

  level2: `INVESTOR KNOWLEDGE CONTEXT — LEVEL 2 (investor has a year of NNN experience, needs institutional-level logic):
Cap rate compression in credit-tenant NNN reflects the market pricing the credit of the tenant, length of the income stream, and quality of the real estate as a combined bond-like instrument. A corporate-guaranteed absolute NNN with 15+ years of primary term remaining is priced like a bond with real estate characteristics. The cap rate reflects confidence that the income is virtually guaranteed.

Negative leverage is common and manageable at this tier because total return — not cash-on-cash — is the correct measurement framework. Total return includes: (1) net cash flow after debt service, (2) principal paydown, (3) depreciation (39-year straight-line or accelerated via cost segregation), (4) rent escalation compounding over the hold period, and (5) residual value appreciation. The unlevered IRR on a well-structured corporate c-store typically lands 7–8% even at a 5.5% entry cap. With conservative leverage (50% LTV, credit-tenant loan at 5.5–6%), levered IRR can reach 9%+.

Lender pricing differs for credit-tenant assets: DSCR requirement may drop to 1.15x, rate 75–100 bps below market, loan term may extend to match primary lease term. The lender underwrites the tenant's balance sheet, not the property's operating history. This changes the entire debt structure relative to franchisee deals.

WALT analysis: Corporate c-store WALT should be evaluated against what happens at expiration — unlike TLE, these tenants don't just "extend" casually. If WALT is under 5 years, the investor is essentially buying real estate speculation, not an income instrument. If WALT is 10+ years with corporate guaranty and no burnoff, the income stream is as close to institutional quality as single-tenant retail gets.

Leasehold structure risk (if applicable): Ground lease or sublease positions create structural subordination — fewer buyers on exit, lender haircuts, and value erosion as the term burns. The 2033 land purchase option in a sublease structure is a mitigant but introduces a second capital event at an unknown price. Fee simple is superior for first credit-tenant acquisitions.

Rent escalation delta: 10% every 5 years compounds to meaningful NOI growth (roughly 46% over 20 years). At 3% per option period, real income declines against inflation. This structural difference justifies a material cap rate differential between otherwise comparable assets.

Frame the analysis at the level of an experienced investor who understands DCF, leverage mathematics, and lease structure, but may be new to the specific nuances of credit-tenant c-store underwriting.`,
};

// Detect whether a deal qualifies for credit-tenant NNN educational context.
function isCreditTenantCStore(deal: { assetType?: string | null; guarantyType?: string | null }): boolean {
  return deal.assetType === "c_store";
}

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
  enabledCategories?: string[],
  flexAssetType?: boolean,
  knowledgeLevel?: KnowledgeLevel | null
): Promise<GapAnalysisResult> {
  const scoreResult = scoreDeal(deal, bb);
  const isOtherCre = (deal.dealCategory ?? "net_lease") === "other_cre";

  const contextSection = additionalContext?.trim()
    ? `\nADDITIONAL CONTEXT PROVIDED BY ANALYST:\n${additionalContext.trim()}\n`
    : "";

  const knowledgeLevelSection = knowledgeLevel && isCreditTenantCStore(deal)
    ? `\n${CREDIT_TENANT_CONTEXT[knowledgeLevel]}\n`
    : "";

  const flexInstruction = flexAssetType
    ? `\nCROSS-ASSET EVALUATION: The deal's asset type (${labelFor(ASSET_TYPES, deal.assetType)}) differs from the investor's current buy box focus. Evaluate whether the deal's financial fundamentals — yield, income, lease structure, credit quality, and market position — meet the investor's core investment goals. Note any asset-class-specific considerations the investor should be aware of, but let financial fit drive the verdict. Do not flag the asset type difference as a gap to close.`
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
    .filter((b) => !flexAssetType || !b.category.toLowerCase().includes("asset type"))
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
${contextSection}${knowledgeLevelSection}${flexInstruction}${scoreSuppressionInstruction}${categoryInstruction}
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
