import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { analyzeDeal } from "@/lib/analyze";
import { extractDeal } from "@/lib/extract";

export const maxDuration = 60;

const MERGEABLE = [
  "address",
  "city",
  "state",
  "assetType",
  "tenantName",
  "operatorName",
  "operatorUnitCount",
  "guarantyType",
  "askingPrice",
  "noi",
  "capRateAsking",
  "leaseType",
  "termRemainingYears",
  "bumpStructure",
  "bumpPercent",
  "constructionYear",
  "buildingSize",
  "hhi1Mile",
  "hhi3Mile",
  "population1Mile",
];

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { content, sourceType = "text" } = await req.json();
    if (!content || content.trim().length < 5) {
      return NextResponse.json({ error: "Provide update text." }, { status: 400 });
    }
    const deal = await prisma.deal.findUnique({ where: { id: params.id } });
    if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const previousScore = deal.score;

    // Extract any new field values and merge non-null ones.
    let fieldsUpdated: string[] = [];
    let aiAnalysis = "";
    try {
      const extracted = await extractDeal(content);
      const data: Record<string, unknown> = {};
      const extractedDeal = extracted.deal as unknown as Record<string, unknown>;
      for (const k of MERGEABLE) {
        const v = extractedDeal[k];
        if (v !== null && v !== undefined && v !== "") {
          data[k] = v;
          fieldsUpdated.push(k);
        }
      }
      if (fieldsUpdated.length) {
        await prisma.deal.update({ where: { id: params.id }, data });
      }
      aiAnalysis = extracted.notes ?? "";
    } catch (e) {
      aiAnalysis = "Could not auto-parse update; logged as note.";
    }

    const { newScore } = await analyzeDeal(params.id);

    await prisma.dealUpdate.create({
      data: {
        dealId: params.id,
        content,
        sourceType,
        aiAnalysis,
        fieldsUpdated,
        previousScore,
        newScore,
      },
    });

    return NextResponse.json({ ok: true, previousScore, newScore, fieldsUpdated });
  } catch (e) {
    console.error("deal updates error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Update failed" },
      { status: 500 }
    );
  }
}
