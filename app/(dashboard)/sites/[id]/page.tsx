import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SiteProfile } from "@/components/site-profile";
import { scoreSite, applyMetricConfig, computeScore, SCORE_CATEGORIES, SiteCategoryScore, CheckStatus } from "@/lib/site-scoring";

export const dynamic = "force-dynamic";

export default async function SitePage({ params }: { params: { id: string } }) {
  const [site, allTenants, allSiteIds] = await Promise.all([
    prisma.prospectiveSite.findUnique({
      where: { id: params.id },
      include: {
        assignments: {
          include: {
            tenant: { include: { requirements: true } },
          },
        },
        newsFlags: {
          include: { newsItem: true },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.tenant.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.prospectiveSite.findMany({ orderBy: { createdAt: "desc" }, select: { id: true } }),
  ]);

  if (!site) notFound();

  function castEntry(r: { category: string; points: number; max: number; status: string; detail: string }): SiteCategoryScore {
    return { ...r, status: r.status as CheckStatus };
  }

  const serialized = {
    id: site.id,
    name: site.name,
    address: site.address,
    city: site.city,
    state: site.state,
    zip: site.zip,
    quadrant: site.quadrant,
    siteType: site.siteType,
    availableDate: site.availableDate,
    squareFeet: site.squareFeet,
    parkingSpaces: site.parkingSpaces,
    parkingRatio: site.parkingRatio,
    askingRentPerSF: site.askingRentPsf,
    nnnEstimate: site.nnnEstimate,
    leaseType: site.leaseType,
    leaseTermOffered: site.leaseTermOffered,
    dailyTrafficCount: site.dailyTraffic,
    population1Mile: site.population1mi,
    population3Mile: site.population3mi,
    population5Mile: site.population5mi,
    medianIncome: site.medianIncome,
    coTenants: site.coTenants,
    zoning: site.zoning,
    brokerName: site.brokerName,
    brokerEmail: site.brokerEmail,
    brokerPhone: site.brokerPhone,
    notes: site.notes,
    newsFlags: site.newsFlags.map((f) => ({
      id: f.id,
      relevance: f.relevance,
      impact: f.impact,
      newsItem: {
        headline: f.newsItem.headline,
        source: f.newsItem.source,
        publishedAt: f.newsItem.publishedAt ? f.newsItem.publishedAt.toISOString() : null,
      },
    })),
    assignments: site.assignments.map((a) => ({
      id: a.id,
      tenantId: a.tenantId,
      score: (() => {
        if (!a.tenant.requirements) return a.score;
        const config = a.scoringConfig as { enabledCategories?: string[] } | null;
        const enabled = config?.enabledCategories ?? [...SCORE_CATEGORIES];
        const fresh = scoreSite(site, a.tenant.requirements);
        const stored = a.scoreBreakdown as { category: string; points: number; max: number; status: string; detail: string }[] | null;
        const exceptional = stored?.find((r) => r.category === "Exceptional Flag (bonus)") ?? null;
        let bd = applyMetricConfig(fresh.breakdown, enabled);
        if (exceptional) bd = [...bd, castEntry(exceptional)];
        return computeScore(bd).score;
      })(),
      grade: (() => {
        if (!a.tenant.requirements) return a.grade;
        const config = a.scoringConfig as { enabledCategories?: string[] } | null;
        const enabled = config?.enabledCategories ?? [...SCORE_CATEGORIES];
        const fresh = scoreSite(site, a.tenant.requirements);
        const stored = a.scoreBreakdown as { category: string; points: number; max: number; status: string; detail: string }[] | null;
        const exceptional = stored?.find((r) => r.category === "Exceptional Flag (bonus)") ?? null;
        let bd = applyMetricConfig(fresh.breakdown, enabled);
        if (exceptional) bd = [...bd, castEntry(exceptional)];
        return computeScore(bd).grade;
      })(),
      gapAnalysis: a.gapAnalysis as {
        isExceptional: boolean;
        exceptionalReason: string | null;
        buyBoxAdjustments: { field: string; currentValue: string; requiredValue: string; impact: string }[];
        verdict: string;
      } | null,
      gapHistory: (a.gapHistory as {
        runAt: string;
        score: number;
        grade: string;
        context: string | null;
        isExceptional: boolean;
        exceptionalReason: string | null;
        buyBoxAdjustments: { field: string; currentValue: string; requiredValue: string; impact: string }[];
        verdict: string;
      }[] | null) ?? null,
      gapContext: a.gapContext ?? null,
      scoreBreakdown: (() => {
        if (!a.tenant.requirements) return null;
        const config = a.scoringConfig as { enabledCategories?: string[] } | null;
        const enabled = config?.enabledCategories ?? [...SCORE_CATEGORIES];
        const fresh = scoreSite(site, a.tenant.requirements);
        const stored = a.scoreBreakdown as { category: string; points: number; max: number; status: string; detail: string }[] | null;
        const exceptional = stored?.find((r) => r.category === "Exceptional Flag (bonus)") ?? null;
        let bd = applyMetricConfig(fresh.breakdown, enabled);
        if (exceptional) bd = [...bd, castEntry(exceptional)];
        return bd;
      })(),
      fullBreakdown: a.tenant.requirements ? scoreSite(site, a.tenant.requirements).breakdown : null,
      scoringConfig: (a.scoringConfig as { enabledCategories?: string[] } | null) ?? null,
      tenant: { id: a.tenant.id, name: a.tenant.name },
      requirements: a.tenant.requirements
        ? {
            minSF: a.tenant.requirements.minSF,
            maxSF: a.tenant.requirements.maxSF,
            leaseTermYears: a.tenant.requirements.minTerm,
            minTrafficCount: a.tenant.requirements.minTraffic,
            preferredSiteTypes: a.tenant.requirements.siteTypePrefs,
          }
        : null,
    })),
  };

  const ids = allSiteIds.map((s) => s.id);
  const idx = ids.indexOf(params.id);
  const prevId = idx > 0 ? ids[idx - 1] : null;
  const nextId = idx < ids.length - 1 ? ids[idx + 1] : null;

  return <SiteProfile site={serialized} availableTenants={allTenants} prevId={prevId} nextId={nextId} totalCount={ids.length} currentIndex={idx} />;
}
