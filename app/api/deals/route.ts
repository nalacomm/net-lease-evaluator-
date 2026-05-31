import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { analyzeDeal } from "@/lib/analyze";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const investorId = searchParams.get("investorId") ?? undefined;
  const deals = await prisma.deal.findMany({
    where: investorId ? { investorId } : undefined,
    orderBy: { score: "desc" },
    include: { investor: { select: { name: true } } },
  });
  return NextResponse.json(deals);
}

const NUM_FIELDS = [
  "operatorUnitCount",
  "askingPrice",
  "noi",
  "capRateAsking",
  "termRemainingYears",
  "bumpPercent",
  "constructionYear",
  "buildingSize",
  "lotSize",
  "hhi1Mile",
  "hhi3Mile",
  "hhi5Mile",
  "population1Mile",
];

function coerce(body: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...body };
  for (const f of NUM_FIELDS) {
    if (out[f] === "" || out[f] === undefined) out[f] = null;
    else if (out[f] !== null) {
      const n = Number(out[f]);
      out[f] = isNaN(n) ? null : n;
    }
  }
  return out;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.investorId) {
      return NextResponse.json(
        { error: "investorId is required" },
        { status: 400 }
      );
    }
    const data = coerce(body);
    // strip fields not on the model
    delete (data as Record<string, unknown>).inferredFields;
    delete (data as Record<string, unknown>).missingFields;
    delete (data as Record<string, unknown>).confidenceLevel;
    delete (data as Record<string, unknown>).notes;

    const deal = await prisma.deal.create({
      data: {
        ...(data as object),
        confidenceLevel: body.confidenceLevel ?? null,
      } as never,
    });

    await analyzeDeal(deal.id);
    const full = await prisma.deal.findUnique({ where: { id: deal.id } });
    return NextResponse.json(full, { status: 201 });
  } catch (e) {
    console.error("deals POST error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Create failed" },
      { status: 500 }
    );
  }
}
