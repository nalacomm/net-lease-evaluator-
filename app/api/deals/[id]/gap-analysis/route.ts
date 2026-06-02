import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runGapAnalysis } from "@/lib/gap-analysis";
import { BuyBoxLike, DealLike } from "@/lib/scoring";

export const maxDuration = 60;

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
    if (!deal.investor?.buyBox)
      return NextResponse.json({ error: "No buy box to compare against" }, { status: 400 });

    const result = await runGapAnalysis(
      deal as DealLike & { tenantName?: string | null; address?: string | null; assetType?: string | null },
      deal.investor.buyBox as BuyBoxLike & {
        capRateMin: number; capRateTarget: number; priceMax: number;
        priceStretch?: number | null; termMinYears: number; dscrMin: number;
        bumpMinPercent?: number | null; guarantyPreferred: string;
      }
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
