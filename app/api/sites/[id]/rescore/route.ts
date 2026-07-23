import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scoreSite, applyMetricConfig, computeScore, SCORE_CATEGORIES, SiteCategoryScore, CheckStatus } from "@/lib/site-scoring";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { tenantId, enabledCategories } = await req.json();
    if (!tenantId) return NextResponse.json({ error: "tenantId required" }, { status: 400 });

    const [site, tenant, existing] = await Promise.all([
      prisma.prospectiveSite.findUnique({ where: { id: params.id } }),
      prisma.tenant.findUnique({ where: { id: tenantId }, include: { requirements: true } }),
      prisma.siteAssignment.findUnique({ where: { siteId_tenantId: { siteId: params.id, tenantId } } }),
    ]);
    if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });
    if (!tenant?.requirements) return NextResponse.json({ error: "Tenant requirements not found" }, { status: 404 });

    const fullBreakdown = scoreSite(site, tenant.requirements).breakdown;

    // If caller passes enabledCategories, apply config; otherwise default to all
    const categories: string[] = Array.isArray(enabledCategories) && enabledCategories.length > 0
      ? enabledCategories
      : [...SCORE_CATEGORIES];

    let breakdown = applyMetricConfig(fullBreakdown, categories);

    // Preserve exceptional flag from stored breakdown
    const prevBreakdown = existing?.scoreBreakdown as { category: string; points: number; max: number; status: string; detail: string }[] | null;
    const rawExceptional = prevBreakdown?.find((r) => r.category === "Exceptional Flag (bonus)");
    const exceptionalEntry: SiteCategoryScore | null = rawExceptional
      ? { ...rawExceptional, status: rawExceptional.status as CheckStatus }
      : null;
    if (exceptionalEntry) breakdown = [...breakdown, exceptionalEntry];

    const { score, grade } = computeScore(breakdown);
    const scoringConfig = { enabledCategories: categories };

    await prisma.siteAssignment.upsert({
      where: { siteId_tenantId: { siteId: params.id, tenantId } },
      update: { score, grade, scoreBreakdown: breakdown as object[], scoringConfig },
      create: { siteId: params.id, tenantId, score, grade, scoreBreakdown: breakdown as object[], scoringConfig },
    });

    return NextResponse.json({ score, grade, breakdown, fullBreakdown: fullBreakdown, scoringConfig });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
