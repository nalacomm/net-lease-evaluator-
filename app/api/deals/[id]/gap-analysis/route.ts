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
    let investorId: string | null = null;
    let runtimeContext = "";

    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      investorId = (form.get("investorId") as string | null) ?? null;
      runtimeContext = (form.get("additionalContext") as string | null) ?? "";

      // Extract text from any uploaded PDFs
      const files = form.getAll("files") as File[];
      for (const file of files) {
        if (file.size === 0) continue;
        try {
          const buffer = Buffer.from(await file.arrayBuffer());
          if (file.type === "application/pdf") {
            const pdfParse = (await import("pdf-parse")).default;
            const parsed = await pdfParse(buffer);
            runtimeContext += `\n\n--- ${file.name} ---\n${parsed.text.slice(0, 8000)}`;
          } else {
            runtimeContext += `\n\n--- ${file.name} ---\n${buffer.toString("utf-8").slice(0, 8000)}`;
          }
        } catch {
          // Skip unreadable files
        }
      }
    } else {
      const body = await req.json().catch(() => ({}));
      investorId = body.investorId ?? null;
    }

    const deal = await prisma.deal.findUnique({
      where: { id: params.id },
      include: { investor: { include: { buyBox: true } } },
    });
    if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 });

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

    // Combine stored context with anything passed at run time
    const combined = [deal.analysisContext?.trim(), runtimeContext.trim()]
      .filter(Boolean)
      .join("\n\n");

    const result = await runGapAnalysis(
      deal as DealLike & { tenantName?: string | null; address?: string | null; assetType?: string | null },
      bb as BuyBoxLike & {
        capRateMin: number; capRateTarget: number; priceMax: number;
        priceStretch?: number | null; termMinYears: number; dscrMin: number;
        bumpMinPercent?: number | null; guarantyPreferred: string;
      },
      combined || undefined
    );

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
