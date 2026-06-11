import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SiteProfile } from "@/components/site-profile";

export const dynamic = "force-dynamic";

export default async function SitePage({
  params,
}: {
  params: { id: string };
}) {
  const site = await prisma.prospectiveSite.findUnique({
    where: { id: params.id },
    include: {
      assignments: {
        include: {
          tenant: {
            include: {
              requirements: true,
            },
          },
        },
      },
      newsFlags: {
        include: { newsItem: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!site) notFound();

  // Remap Prisma field names to the shape SiteProfile expects
  const serialized = {
    id: site.id,
    name: site.name,
    address: site.address,
    city: site.city,
    state: site.state,
    zip: site.zip,
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
    newsFlags: site.newsFlags.map((f: {
      id: string;
      relevance: string | null;
      impact: string | null;
      createdAt: Date;
      newsItemId: string;
      siteId: string;
      newsItem: {
        headline: string;
        source: string | null;
        publishedAt: Date | null;
      };
    }) => ({
      id: f.id,
      relevance: f.relevance,
      impact: f.impact,
      newsItem: {
        headline: f.newsItem.headline,
        source: f.newsItem.source,
        publishedAt: f.newsItem.publishedAt
          ? f.newsItem.publishedAt.toISOString()
          : null,
      },
    })),
    assignments: site.assignments.map((a: {
      id: string;
      siteId: string;
      tenantId: string;
      score: number | null;
      grade: string | null;
      scoreBreakdown: unknown;
      gapAnalysis: unknown;
      createdAt: Date;
      tenant: {
        id: string;
        name: string;
        requirements: {
          minSF: number | null;
          maxSF: number | null;
          minTerm: number | null;
          minTraffic: number | null;
          siteTypePrefs: string[];
        } | null;
      };
    }) => ({
      id: a.id,
      tenantId: a.tenantId,
      score: a.score,
      grade: a.grade,
      gapAnalysis: a.gapAnalysis as {
        isExceptional: boolean;
        exceptionalReason: string | null;
        buyBoxAdjustments: {
          field: string;
          currentValue: string;
          requiredValue: string;
          impact: string;
        }[];
        verdict: string;
      } | null,
      tenant: {
        id: a.tenant.id,
        name: a.tenant.name,
      },
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

  return <SiteProfile site={serialized} />;
}
