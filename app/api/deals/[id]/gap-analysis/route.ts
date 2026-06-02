import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runGapAnalysis } from "@/lib/gap-analysis";
import { BuyBoxLike, DealLike } from "@/lib/scoring";

export const maxDuration = 60;

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Optional: pass investorId to save result to a specific assignment
    const body = await req.json().catch(() => ({}));
    const investorId: string | null = body.investorId ?? null;

    const deal = await prisma.deal.findUnique({
      where: { id: params.id },
      include: { investor: { include: { buyBox: true } } },
    });
    if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 });

    // Use investor context if provided, else fall back to primary investor
    let bb = deal.investor?.buyBox ?? null;
    if (investorId) {
      const inv = await prisma.investor.findUnique({
        where: { id: investorId },
        include: { buyBox: true },
      });
      if (inv?.buyBox) bb = inv.buyBox;
    }
    const effectiveInvestorId = investorId ?? deal.investor?.id ?? null;

    if (!bb) return NextResponse.json({ error: "No buy box to compare against" }, { status: 400 });

    const result = await runGapAnalysis(
      deal as DealLike & { tenantName?: string | null; address?: string | null; assetType?: string | null },
      bb as BuyBoxLike & {
        capRateMin: number; capRateTarget: number; priceMax: number;
        priceStretch?: number | null; termMinYears: number; dscrMin: number;
        bumpMinPercent?: number | null; guarantyPreferred: string;
      }
    );

    // Persist to DealAssignment so it doesn't need re-running
    if (effectiveInvestorId) {
      await prisma.dealAssignment.upsert({
        where: { dealId_investorId: { dealId: params.id, investorId: effectiveInvestorId } },
        update: { gapAnalysis: result as object },
        create: {
          dealId: params.id,
          investorId: effectiveInvestorId,
          gapAnalysis: result as object,
        },
      });
    }

    return NextResponse.json(result);
  } catch (e) {
    console.error("gap-analysis error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Analysis failed" },
      { status: 500 }
    );
  }
}
