import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SiteProfile } from "@/components/site-profile";
import { scoreSite } from "@/lib/site-scoring";

export const dynamic = "force-dynamic";

export default async function SitePage({ params }: { params: { id: string } }) {
  const [site, allTenants] = await Promise.all([
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
  ]);

  if (!site) notFound();

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
        const fresh = scoreSite(site, a.tenant.requirements);
        const stored = a.scoreBreakdown as { category: string; points: number; max: number; status: string; detail: string }[] | null;
        const exceptional = stored?.find((r) => r.category === "Exceptional Flag (bonus)") ?? null;
        if (!exceptional) return fresh.score;
        const bd = [...fresh.breakdown, exceptional];
        const totalMax = bd.reduce((s, c) => s + c.max, 0);
        const totalPts = bd.reduce((s, c) => s + c.points, 0);
        return Math.max(0, Math.min(100, totalMax > 0 ? Math.round((totalPts / totalMax) * 100) : 0));
      })(),
      grade: (() => {
        if (!a.tenant.requirements) return a.grade;
        const fresh = scoreSite(site, a.tenant.requirements);
        const stored = a.scoreBreakdown as { category: string; points: number; max: number; status: string; detail: string }[] | null;
        const exceptional = stored?.find((r) => r.category === "Exceptional Flag (bonus)") ?? null;
        let s = fresh.score;
        if (exceptional) {
          const bd = [...fresh.breakdown, exceptional];
          const totalMax = bd.reduce((sum, c) => sum + c.max, 0);
          const totalPts = bd.reduce((sum, c) => sum + c.points, 0);
          s = Math.max(0, Math.min(100, totalMax > 0 ? Math.round((totalPts / totalMax) * 100) : 0));
        }
        return s >= 85 ? "A" : s >= 70 ? "B" : s >= 55 ? "C" : s >= 40 ? "D" : "F";
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
        // Always compute fresh so display is never stale
        if (!a.tenant.requirements) return null;
        const fresh = scoreSite(site, a.tenant.requirements);
        const stored = a.scoreBreakdown as { category: string; points: number; max: number; status: string; detail: string }[] | null;
        const exceptional = stored?.find((r) => r.category === "Exceptional Flag (bonus)") ?? null;
        return exceptional ? [...fresh.breakdown, exceptional] : fresh.breakdown;
      })(),
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

  return <SiteProfile site={serialized} availableTenants={allTenants} />;
}
