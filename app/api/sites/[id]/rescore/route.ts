import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scoreSite } from "@/lib/site-scoring";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { tenantId } = await req.json();
    if (!tenantId) return NextResponse.json({ error: "tenantId required" }, { status: 400 });

    const [site, tenant, existing] = await Promise.all([
      prisma.prospectiveSite.findUnique({ where: { id: params.id } }),
      prisma.tenant.findUnique({ where: { id: tenantId }, include: { requirements: true } }),
      prisma.siteAssignment.findUnique({ where: { siteId_tenantId: { siteId: params.id, tenantId } } }),
    ]);
    if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });
    if (!tenant?.requirements) return NextResponse.json({ error: "Tenant requirements not found" }, { status: 404 });

    const { score, grade, breakdown } = scoreSite(site, tenant.requirements);

    // If there's a stored exceptional bonus, preserve it
    const prevBreakdown = existing?.scoreBreakdown as { category: string; points: number; max: number; status: string; detail: string }[] | null;
    const exceptionalEntry = prevBreakdown?.find((r) => r.category === "Exceptional Flag (bonus)");
    const finalBreakdown = exceptionalEntry ? [...breakdown, exceptionalEntry] : breakdown;
    const totalMax = finalBreakdown.reduce((s, c) => s + c.max, 0);
    const totalPts = finalBreakdown.reduce((s, c) => s + c.points, 0);
    const finalScore = Math.max(0, Math.min(100, totalMax > 0 ? Math.round((totalPts / totalMax) * 100) : score));
    const finalGrade =
      finalScore >= 85 ? "A" :
      finalScore >= 70 ? "B" :
      finalScore >= 55 ? "C" :
      finalScore >= 40 ? "D" : "F";

    await prisma.siteAssignment.upsert({
      where: { siteId_tenantId: { siteId: params.id, tenantId } },
      update: { score: finalScore, grade: finalGrade, scoreBreakdown: finalBreakdown as object[] },
      create: { siteId: params.id, tenantId, score: finalScore, grade: finalGrade, scoreBreakdown: finalBreakdown as object[] },
    });

    return NextResponse.json({ score: finalScore, grade: finalGrade, breakdown: finalBreakdown });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
