import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { askJson } from "@/lib/anthropic";
import { scoreDeal, BuyBoxLike, DealLike } from "@/lib/scoring";
import { fmtMoney, fmtPercent } from "@/lib/format";
import { labelFor, ASSET_TYPES, LEASE_TYPES, GUARANTY_TYPES } from "@/lib/constants";

export const maxDuration = 60;

export interface GapAnalysisResult {
  isExceptional: boolean;
  exceptionalReason: string | null;   // why it might be worth it despite low score
  buyBoxAdjustments: {
    field: string;
    currentValue: string;
    requiredValue: string;
    impact: string;
  }[];
  verdict: string; // plain-language 2-3 sentence summary
}

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const deal = await prisma.deal.findUnique({
      where: { id: params.id },
      include: { investor: { include: { buyBox: true } } },
    });
    if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    if (!deal.investor?.buyBox) return NextResponse.json({ error: "No buy box to compare against" }, { status: 400 });

    const bb = deal.investor.buyBox;
    const scoreResult = scoreDeal(deal as DealLike, bb as BuyBoxLike);

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
      `Max price: ${fmtMoney(bb.priceMax)} (stretch: ${fmtMoney(bb.priceStretch)})`,
      `Lease: ${bb.leaseTypePreferred} preferred, ${bb.leaseTypeAcceptable} acceptable`,
      `Min term: ${bb.termMinYears} yrs`,
      `Guaranty: ${bb.guarantyPreferred} preferred`,
      `Min DSCR: ${bb.dscrMin}x`,
      `Min bump: ${bb.bumpMinPercent ?? 0}%`,
    ].join("\n");

    const breakdown = scoreResult.breakdown
      .filter((b) => b.status !== "pass")
      .map((b) => `${b.category}: ${b.points}/${b.max} — ${b.detail}`)
      .join("\n");

    const result = await askJson<GapAnalysisResult>(
      `You are a commercial real estate investment advisor.

DEAL:
${dealDesc}

INVESTOR BUY BOX:
${bbDesc}

SCORE GAPS (categories that failed or warned):
${breakdown}

Analyze this deal:
1. Despite the low score, are there exceptional qualities that make it potentially worth a second look? (location, tenant quality, construction age, market position, etc.)
2. What specific buy box parameters would the investor need to relax to make this deal work?
3. Give a plain-language verdict.

Return JSON only:
{
  "isExceptional": true/false,
  "exceptionalReason": "string or null",
  "buyBoxAdjustments": [
    { "field": "capRateMin", "currentValue": "6.75%", "requiredValue": "6.25%", "impact": "brief note" }
  ],
  "verdict": "2-3 sentence plain summary"
}`,
      { maxTokens: 800 }
    );

    return NextResponse.json(result);
  } catch (e) {
    console.error("gap-analysis error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Analysis failed" },
      { status: 500 }
    );
  }
}
