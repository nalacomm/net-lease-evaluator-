import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scoreSite } from "@/lib/site-scoring";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { tenantId } = await req.json();
    if (!tenantId) return NextResponse.json({ error: "tenantId required" }, { status: 400 });

    const [site, tenant] = await Promise.all([
      prisma.prospectiveSite.findUnique({ where: { id: params.id } }),
      prisma.tenant.findUnique({ where: { id: tenantId }, include: { requirements: true } }),
    ]);
    if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const req_ = tenant.requirements;
    let score: number | null = null;
    let grade: string | null = null;
    let scoreBreakdown = null;

    if (req_) {
      const result = scoreSite(site, req_);
      score = result.score;
      grade = result.grade;
      scoreBreakdown = result.breakdown;
    }

    const assignment = await prisma.siteAssignment.upsert({
      where: { siteId_tenantId: { siteId: params.id, tenantId } },
      update: { score, grade, scoreBreakdown: scoreBreakdown ? JSON.parse(JSON.stringify(scoreBreakdown)) : undefined },
      create: { siteId: params.id, tenantId, score, grade, scoreBreakdown: scoreBreakdown ? JSON.parse(JSON.stringify(scoreBreakdown)) : undefined },
    });

    return NextResponse.json({ ...assignment, breakdown: scoreBreakdown });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
