import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runSiteGapAnalysis } from "@/lib/site-gap-analysis";
import { scoreSite } from "@/lib/site-scoring";

export const maxDuration = 60;

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { tenantId, context } = await req.json();
    if (!tenantId) return NextResponse.json({ error: "tenantId required" }, { status: 400 });

    const [site, tenant] = await Promise.all([
      prisma.prospectiveSite.findUnique({ where: { id: params.id } }),
      prisma.tenant.findUnique({ where: { id: tenantId }, include: { requirements: true } }),
    ]);
    if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });
    if (!tenant?.requirements) return NextResponse.json({ error: "Tenant requirements not found" }, { status: 404 });

    const result = await runSiteGapAnalysis(site, tenant.requirements, tenant.name, context ?? undefined);

    // Build score breakdown, adding exceptional bonus if flagged
    const baseScore = scoreSite(site, tenant.requirements);
    const breakdown = [...baseScore.breakdown];

    if (result.isExceptional) {
      breakdown.push({
        category: "Exceptional Flag (bonus)",
        points: 10,
        max: 10,
        status: "pass",
        detail: result.exceptionalReason ?? "Exceptional qualities identified by gap analysis",
      });
    }

    const totalMax = breakdown.reduce((s, c) => s + c.max, 0);
    const totalPts = breakdown.reduce((s, c) => s + c.points, 0);
    const rawScore = totalMax > 0 ? Math.round((totalPts / totalMax) * 100) : 0;
    // Market match bonus already in breakdown — score is already proportional
    // Just need to re-derive grade from updated score
    const adjustedScore = Math.max(0, Math.min(100, rawScore));
    const grade =
      adjustedScore >= 85 ? "A" :
      adjustedScore >= 70 ? "B" :
      adjustedScore >= 55 ? "C" :
      adjustedScore >= 40 ? "D" : "F";

    await prisma.siteAssignment.upsert({
      where: { siteId_tenantId: { siteId: params.id, tenantId } },
      update: {
        gapAnalysis: result as object,
        ...(result.isExceptional && {
          score: adjustedScore,
          grade,
          scoreBreakdown: breakdown as object[],
        }),
      },
      create: {
        siteId: params.id,
        tenantId,
        gapAnalysis: result as object,
        score: adjustedScore,
        grade,
        scoreBreakdown: breakdown as object[],
      },
    });

    return NextResponse.json({ ...result, score: adjustedScore, grade });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
