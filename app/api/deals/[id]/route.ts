import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { analyzeDeal } from "@/lib/analyze";

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

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const deal = await prisma.deal.findUnique({
    where: { id: params.id },
    include: {
      investor: { include: { buyBox: true } },
      updates: { orderBy: { createdAt: "desc" } },
      newsFlags: { include: { newsItem: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(deal);
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const data: Record<string, unknown> = { ...body };
    delete data.id;
    delete data.investor;
    delete data.updates;
    delete data.newsFlags;
    delete data.createdAt;
    delete data.updatedAt;

    // Saving only analysisContext doesn't need re-scoring
    const onlyContext = Object.keys(data).length === 1 && "analysisContext" in data;

    for (const f of NUM_FIELDS) {
      if (f in data) {
        if (data[f] === "" || data[f] === undefined) data[f] = null;
        else if (data[f] !== null) {
          const n = Number(data[f]);
          data[f] = isNaN(n) ? null : n;
        }
      }
    }
    await prisma.deal.update({ where: { id: params.id }, data: data as never });
    if (!onlyContext) await analyzeDeal(params.id);
    const full = await prisma.deal.findUnique({ where: { id: params.id } });
    return NextResponse.json(full);
  } catch (e) {
    console.error("deals PATCH error", e);
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
  await prisma.deal.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
