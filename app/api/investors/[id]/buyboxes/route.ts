import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULTS = {
  capRateMin: 0,
  capRateTarget: 0,
  priceMax: 0,
  leaseTypePreferred: "absolute_nnn",
  leaseTypeAcceptable: "nnn",
  termMinYears: 10,
  guarantyPreferred: "corporate",
  guarantyAcceptable: "multi_unit_franchisee",
  guarantyFloor: "single_personal",
  dscrMin: 1.35,
  ltv: 0.65,
  interestRate: 7.0,
  amortizationYears: 25,
  flatLeaseAllowed: false,
  assetTypesPreferred: [] as string[],
  assetTypesAcceptable: [] as string[],
  preferredStates: [] as string[],
  targetMarkets: [] as string[],
  acceptableZones: [] as string[],
};

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    const investor = await prisma.investor.findUnique({ where: { id: params.id } });
    if (!investor) return NextResponse.json({ error: "Investor not found" }, { status: 404 });

    const buyBox = await prisma.buyBox.create({
      data: {
        investorId: params.id,
        name: body.name.trim(),
        appliesTo: body.appliesTo ?? [],
        ...DEFAULTS,
      },
    });

    return NextResponse.json(buyBox, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Create failed" },
      { status: 500 }
    );
  }
}
