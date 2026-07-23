import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const investors = await prisma.investor.findMany({
    orderBy: { createdAt: "asc" },
    include: { buyBox: true },
  });
  return NextResponse.json(investors);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.name) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }
    const bb = body.buyBox;
    const investor = await prisma.investor.create({
      data: {
        name: body.name,
        email: body.email || null,
        phone: body.phone || null,
        entityName: body.entityName || null,
        notes: body.notes || null,
        buyBox: bb
          ? {
              create: {
                capRateMin: Number(bb.capRateMin) || 0,
                capRateTarget: Number(bb.capRateTarget) || 0,
                priceMax: Number(bb.priceMax) || 0,
                priceStretch: bb.priceStretch ? Number(bb.priceStretch) : null,
                leaseTypePreferred: bb.leaseTypePreferred || "absolute_nnn",
                leaseTypeAcceptable: bb.leaseTypeAcceptable || "nnn",
                termMinYears: Number(bb.termMinYears) || 0,
                termPreferredYears: bb.termPreferredYears
                  ? Number(bb.termPreferredYears)
                  : null,
                bumpMinPercent: bb.bumpMinPercent
                  ? Number(bb.bumpMinPercent)
                  : null,
                bumpAltStructure: bb.bumpAltStructure || null,
                flatLeaseAllowed: !!bb.flatLeaseAllowed,
                guarantyPreferred: bb.guarantyPreferred || "corporate",
                guarantyAcceptable:
                  bb.guarantyAcceptable || "multi_unit_franchisee",
                guarantyFloor: bb.guarantyFloor || "single_personal",
                operatorMinUnits: bb.operatorMinUnits
                  ? Number(bb.operatorMinUnits)
                  : null,
                dscrMin: Number(bb.dscrMin) || 1.35,
                ltv: Number(bb.ltv) || 0.65,
                interestRate: Number(bb.interestRate) || 7.0,
                amortizationYears: Number(bb.amortizationYears) || 25,
                constructionPreferred: bb.constructionPreferred || null,
                hhiMin: bb.hhiMin ? Number(bb.hhiMin) : null,
                assetTypesPreferred: bb.assetTypesPreferred || [],
                assetTypesAcceptable: bb.assetTypesAcceptable || [],
                preferredStates: bb.preferredStates || [],
                targetMarkets: bb.targetMarkets || [],
                currentMonthlyIncome: bb.currentMonthlyIncome
                  ? Number(bb.currentMonthlyIncome)
                  : null,
                notes: bb.notes || null,
              },
            }
          : undefined,
      },
      include: { buyBox: true },
    });
    return NextResponse.json(investor, { status: 201 });
  } catch (e) {
    console.error("investors POST error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Create failed" },
      { status: 500 }
    );
  }
}
