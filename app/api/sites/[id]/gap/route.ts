import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runSiteGapAnalysis } from "@/lib/site-gap-analysis";
import { scoreSite } from "@/lib/site-scoring";

export const maxDuration = 60;

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { tenantId, context } = await req.json();
    if (!tenantId) return NextResponse.json({ error: "tenantId required" }, { status: 400 });

    const [site, tenant, existing] = await Promise.all([
      prisma.prospectiveSite.findUnique({ where: { id: params.id } }),
      prisma.tenant.findUnique({ where: { id: tenantId }, include: { requirements: true } }),
      prisma.siteAssignment.findUnique({ where: { siteId_tenantId: { siteId: params.id, tenantId } } }),
    ]);
    if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });
    if (!tenant?.requirements) return NextResponse.json({ error: "Tenant requirements not found" }, { status: 404 });

    // Combine explicit context with persistent site notes
    const combinedContext = [context?.trim(), site.notes?.trim()].filter(Boolean).join("\n\n") || undefined;

    const result = await runSiteGapAnalysis(site, tenant.requirements, tenant.name, combinedContext);

    // Build score with optional exceptional bonus
    const baseScore = scoreSite(site, tenant.requirements);
    const breakdown = [...baseScore.breakdown];
    if (result.isExceptional) {
      breakdown.push({
        category: "Exceptional Flag (bonus)",
        points: 10,
        max: 10,
        status: "pass" as const,
        detail: result.exceptionalReason ?? "Exceptional qualities identified by gap analysis",
      });
    }
    const totalMax = breakdown.reduce((s, c) => s + c.max, 0);
    const totalPts = breakdown.reduce((s, c) => s + c.points, 0);
    const adjustedScore = Math.max(0, Math.min(100, totalMax > 0 ? Math.round((totalPts / totalMax) * 100) : 0));
    const grade =
      adjustedScore >= 85 ? "A" :
      adjustedScore >= 70 ? "B" :
      adjustedScore >= 55 ? "C" :
      adjustedScore >= 40 ? "D" : "F";

    // Append to history (most recent first)
    const historyEntry = {
      runAt: new Date().toISOString(),
      score: adjustedScore,
      grade,
      context: context?.trim() || null,
      ...result,
    };
    const prevHistory = (existing?.gapHistory as object[] | null) ?? [];
    const gapHistory = [historyEntry, ...prevHistory];

    // Persist context if provided (so it carries forward to next run)
    const persistedContext = context?.trim() ? context.trim() : (existing?.gapContext ?? null);

    await prisma.siteAssignment.upsert({
      where: { siteId_tenantId: { siteId: params.id, tenantId } },
      update: {
        gapAnalysis: result as object,
        gapHistory: gapHistory as object[],
        score: adjustedScore,
        grade,
        scoreBreakdown: breakdown as object[],
        ...(persistedContext !== null && { gapContext: persistedContext }),
      },
      create: {
        siteId: params.id,
        tenantId,
        gapAnalysis: result as object,
        gapHistory: [historyEntry] as object[],
        score: adjustedScore,
        grade,
        scoreBreakdown: breakdown as object[],
        gapContext: persistedContext ?? null,
      },
    });

    return NextResponse.json({ ...result, score: adjustedScore, grade, runAt: historyEntry.runAt });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
