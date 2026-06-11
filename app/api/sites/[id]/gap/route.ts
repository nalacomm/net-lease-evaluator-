import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runSiteGapAnalysis } from "@/lib/site-gap-analysis";

export const maxDuration = 60;

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { tenantId } = await req.json();
    if (!tenantId) return NextResponse.json({ error: "tenantId required" }, { status: 400 });

    const [site, tenant] = await Promise.all([
      prisma.prospectiveSite.findUnique({ where: { id: params.id } }),
      prisma.tenant.findUnique({ where: { id: tenantId }, include: { requirements: true } }),
    ]);
    if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });
    if (!tenant?.requirements) return NextResponse.json({ error: "Tenant requirements not found" }, { status: 404 });

    const result = await runSiteGapAnalysis(site, tenant.requirements, tenant.name);

    await prisma.siteAssignment.upsert({
      where: { siteId_tenantId: { siteId: params.id, tenantId } },
      update: { gapAnalysis: result as object },
      create: { siteId: params.id, tenantId, gapAnalysis: result as object },
    });

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
