import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { analyzeDeal } from "@/lib/analyze";

function parseBb(bb: Record<string, unknown>) {
  return {
    capRateMin: Number(bb.capRateMin) || 0,
    capRateTarget: Number(bb.capRateTarget) || 0,
    priceMax: Number(bb.priceMax) || 0,
    priceStretch: bb.priceStretch ? Number(bb.priceStretch) : null,
    leaseTypePreferred: (bb.leaseTypePreferred as string) || "absolute_nnn",
    leaseTypeAcceptable: (bb.leaseTypeAcceptable as string) || "nnn",
    termMinYears: Number(bb.termMinYears) || 0,
    termPreferredYears: bb.termPreferredYears ? Number(bb.termPreferredYears) : null,
    bumpMinPercent: bb.bumpMinPercent ? Number(bb.bumpMinPercent) : null,
    bumpAltStructure: (bb.bumpAltStructure as string) || null,
    flatLeaseAllowed: !!bb.flatLeaseAllowed,
    guarantyPreferred: (bb.guarantyPreferred as string) || "corporate",
    guarantyAcceptable: (bb.guarantyAcceptable as string) || "multi_unit_franchisee",
    guarantyFloor: (bb.guarantyFloor as string) || "single_personal",
    operatorMinUnits: bb.operatorMinUnits ? Number(bb.operatorMinUnits) : null,
    dscrMin: Number(bb.dscrMin) || 1.35,
    ltv: Number(bb.ltv) || 0.65,
    interestRate: Number(bb.interestRate) || 7.0,
    amortizationYears: Number(bb.amortizationYears) || 25,
    constructionPreferred: (bb.constructionPreferred as string) || null,
    hhiMin: bb.hhiMin ? Number(bb.hhiMin) : null,
    assetTypesPreferred: (bb.assetTypesPreferred as string[]) || [],
    assetTypesAcceptable: (bb.assetTypesAcceptable as string[]) || [],
    currentMonthlyIncome: bb.currentMonthlyIncome ? Number(bb.currentMonthlyIncome) : null,
    notes: (bb.notes as string) || null,
  };
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const investor = await prisma.investor.findUnique({
    where: { id: params.id },
    include: { buyBox: true },
  });
  if (!investor) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(investor);
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const bb = body.buyBox as Record<string, unknown> | undefined;

    const investor = await prisma.investor.update({
      where: { id: params.id },
      data: {
        name: body.name,
        email: body.email || null,
        phone: body.phone || null,
        entityName: body.entityName || null,
        notes: body.notes || null,
        buyBox: bb
          ? {
              upsert: {
                create: parseBb(bb),
                update: parseBb(bb),
              },
            }
          : undefined,
      },
      include: { buyBox: true },
    });

    // Re-analyze all deals associated with this investor after buy box change
    if (bb) {
      const [primaryDeals, assignments] = await Promise.all([
        prisma.deal.findMany({ where: { investorId: params.id }, select: { id: true } }),
        prisma.dealAssignment.findMany({ where: { investorId: params.id }, select: { dealId: true } }),
      ]);
      const allIds = [
        ...primaryDeals.map((d) => d.id),
        ...assignments.map((a) => a.dealId),
      ];
      // Re-analyze up to 30 deals synchronously; log if more exist
      const toAnalyze = [...new Set(allIds)].slice(0, 30);
      await Promise.allSettled(toAnalyze.map((id) => analyzeDeal(id).catch(() => null)));
    }

    return NextResponse.json(investor);
  } catch (e) {
    console.error("investors PATCH error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Update failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  await prisma.investor.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
