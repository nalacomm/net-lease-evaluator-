import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scoreSite, applyMetricConfig, computeScore, SCORE_CATEGORIES, SiteLike, RequirementsLike } from "@/lib/site-scoring";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: params.id },
    include: {
      requirements: true,
      siteAssignments: {
        include: { site: true },
        orderBy: { createdAt: "desc" },
      },
      campaigns: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(tenant);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { name, company, contact, email, phone, notes, requirements } = body;

    const tenant = await prisma.tenant.update({
      where: { id: params.id },
      data: {
        ...(name && { name: name.trim() }),
        company: company ?? undefined,
        contact: contact ?? undefined,
        email: email ?? undefined,
        phone: phone ?? undefined,
        notes: notes ?? undefined,
      },
    });

    if (requirements) {
      const reqData = {
        minSF: requirements.minSF ? parseFloat(requirements.minSF) : null,
        maxSF: requirements.maxSF ? parseFloat(requirements.maxSF) : null,
        preferredSF: requirements.preferredSF ? parseFloat(requirements.preferredSF) : null,
        minRentPsf: requirements.minRentPsf ? parseFloat(requirements.minRentPsf) : null,
        maxRentPsf: requirements.maxRentPsf ? parseFloat(requirements.maxRentPsf) : null,
        leaseType: requirements.leaseType || null,
        minParking: requirements.minParking ? parseFloat(requirements.minParking) : null,
        minTraffic: requirements.minTraffic ? parseInt(requirements.minTraffic) : null,
        minPopulation: requirements.minPopulation ? parseInt(requirements.minPopulation) : null,
        minIncome: requirements.minIncome ? parseInt(requirements.minIncome) : null,
        radiusMiles: requirements.radiusMiles ? parseFloat(requirements.radiusMiles) : null,
        minTerm: requirements.minTerm ? parseInt(requirements.minTerm) : null,
        preferredTerm: requirements.preferredTerm ? parseInt(requirements.preferredTerm) : null,
        targetMarkets: requirements.targetMarkets ?? [],
        coTenancy: requirements.coTenancy || null,
        exclusivity: requirements.exclusivity || null,
        zoningReqs: Array.isArray(requirements.zoningReqs)
          ? requirements.zoningReqs
          : requirements.zoningReqs
            ? requirements.zoningReqs.split(/[,;]+/).map((s: string) => s.trim()).filter(Boolean)
            : [],
        siteTypePrefs: requirements.siteTypePrefs ?? [],
        additionalNotes: requirements.additionalNotes || null,
        rawInput: requirements.rawInput || null,
        inferredFields: requirements.inferredFields ?? [],
        missingFields: requirements.missingFields ?? [],
        confidenceLevel: requirements.confidenceLevel || null,
        narrativeSummary: requirements.narrativeSummary || null,
      };

      await prisma.tenantRequirements.upsert({
        where: { tenantId: params.id },
        update: reqData,
        create: { tenantId: params.id, ...reqData },
      });
    }

    // Re-score all site assignments when requirements change
    let rescoreResults: {
      siteId: string;
      siteLabel: string;
      previousScore: number | null;
      previousGrade: string | null;
      newScore: number;
      newGrade: string;
    }[] = [];

    if (requirements) {
      const [siteAssignments, updatedReqs] = await Promise.all([
        prisma.siteAssignment.findMany({
          where: { tenantId: params.id },
          include: { site: true },
        }),
        prisma.tenantRequirements.findUnique({ where: { tenantId: params.id } }),
      ]);

      if (updatedReqs && siteAssignments.length > 0) {
        rescoreResults = (
          await Promise.all(
            siteAssignments.map(async (sa) => {
              const previousScore = sa.score;
              const previousGrade = sa.grade;
              const config = sa.scoringConfig as { enabledCategories?: string[] } | null;
              const enabledCats = config?.enabledCategories ?? [...SCORE_CATEGORIES];
              const fullBreakdown = scoreSite(sa.site as SiteLike, updatedReqs as RequirementsLike).breakdown;
              const breakdown = applyMetricConfig(fullBreakdown, enabledCats);
              const { score, grade } = computeScore(breakdown);
              await prisma.siteAssignment.update({
                where: { siteId_tenantId: { siteId: sa.siteId, tenantId: params.id } },
                data: { score, grade, scoreBreakdown: breakdown as object[] },
              });
              return {
                siteId: sa.siteId,
                siteLabel: sa.site.name ?? sa.site.address ?? "Site",
                previousScore,
                previousGrade,
                newScore: score,
                newGrade: grade,
              };
            })
          )
        );
      }
    }

    return NextResponse.json({ ...tenant, rescoreResults });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  await prisma.tenant.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
