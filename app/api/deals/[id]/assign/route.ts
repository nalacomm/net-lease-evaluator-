import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scoreDeal, BuyBoxLike, DealLike } from "@/lib/scoring";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { investorId } = await req.json();
    if (!investorId) {
      return NextResponse.json({ error: "investorId required" }, { status: 400 });
    }

    const [deal, investor] = await Promise.all([
      prisma.deal.findUnique({ where: { id: params.id } }),
      prisma.investor.findUnique({
        where: { id: investorId },
        include: { buyBox: true },
      }),
    ]);

    if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    if (!investor?.buyBox) return NextResponse.json({ error: "Investor has no buy box" }, { status: 400 });

    const result = scoreDeal(deal as DealLike, investor.buyBox as BuyBoxLike);

    const assignment = await prisma.dealAssignment.upsert({
      where: { dealId_investorId: { dealId: params.id, investorId } },
      update: {
        score: result.score,
        grade: result.grade,
        scoreBreakdown: result.breakdown as unknown as object,
      },
      create: {
        dealId: params.id,
        investorId,
        score: result.score,
        grade: result.grade,
        scoreBreakdown: result.breakdown as unknown as object,
      },
    });

    return NextResponse.json(assignment);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { investorId } = await req.json();
  await prisma.dealAssignment.deleteMany({
    where: { dealId: params.id, investorId },
  });
  return NextResponse.json({ ok: true });
}
