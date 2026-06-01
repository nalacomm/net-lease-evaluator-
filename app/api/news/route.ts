import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { askJson } from "@/lib/anthropic";

export async function GET() {
  const news = await prisma.newsItem.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      dealFlags: {
        include: { deal: { select: { id: true, address: true, tenantName: true } } },
      },
    },
  });
  return NextResponse.json(news);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { headline, summary, source, url, publishedAt, category, rawContent } = body;
    if (!headline) {
      return NextResponse.json({ error: "headline required" }, { status: 400 });
    }

    const newsItem = await prisma.newsItem.create({
      data: {
        headline,
        summary: summary ?? null,
        source: source ?? null,
        url: url ?? null,
        publishedAt: publishedAt ? new Date(publishedAt) : null,
        category: category ?? null,
        rawContent: rawContent ?? null,
      },
    });

    // AI tag active deals
    const deals = await prisma.deal.findMany({
      where: { status: "active" },
      select: {
        id: true,
        tenantName: true,
        assetType: true,
        address: true,
        operatorName: true,
      },
    });

    if (deals.length > 0 && process.env.ANTHROPIC_API_KEY) {
      try {
        const dealList = deals
          .map(
            (d) =>
              `ID:${d.id} | Tenant:${d.tenantName ?? "?"} | Type:${d.assetType ?? "?"} | Operator:${d.operatorName ?? "?"} | Address:${d.address ?? "?"}`
          )
          .join("\n");

        type FlagResult = {
          dealId: string;
          impact: "positive" | "negative" | "neutral" | "watch";
          relevance: string;
        };

        const result = await askJson<{ flags: FlagResult[] }>(
          `News headline: "${headline}"\nSummary: ${summary ?? "(none)"}\n\nActive deals:\n${dealList}\n\nFor each deal that could be affected by this news, return a flag. Only flag genuinely relevant deals — do not flag all deals.\n\nReturn JSON only:\n{"flags":[{"dealId":"...","impact":"positive"|"negative"|"neutral"|"watch","relevance":"one sentence"}]}`,
          { maxTokens: 800 }
        );

        if (result.flags?.length) {
          await prisma.dealNewsFlag.createMany({
            data: result.flags.map((f) => ({
              dealId: f.dealId,
              newsItemId: newsItem.id,
              impact: f.impact,
              relevance: f.relevance,
            })),
            skipDuplicates: true,
          });
        }
      } catch (aiErr) {
        console.warn("News AI tagging failed (non-fatal):", aiErr);
      }
    }

    const full = await prisma.newsItem.findUnique({
      where: { id: newsItem.id },
      include: {
        dealFlags: {
          include: { deal: { select: { id: true, address: true, tenantName: true } } },
        },
      },
    });
    return NextResponse.json(full, { status: 201 });
  } catch (e) {
    console.error("news POST error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}
