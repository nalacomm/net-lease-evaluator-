import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { labelFor, SITE_TYPES, TENANT_LEASE_TYPES } from "@/lib/constants";
import { SiteExportClient } from "@/components/site-export-client";

export const dynamic = "force-dynamic";

export default async function SiteExportPage({
  params,
}: {
  params: { id: string };
}) {
  const site = await prisma.prospectiveSite.findUnique({
    where: { id: params.id },
    include: {
      assignments: {
        include: {
          tenant: { include: { requirements: true } },
        },
        orderBy: { score: "desc" },
      },
      newsFlags: {
        include: { newsItem: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!site) notFound();

  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const data = {
    site: {
      name: site.name,
      address: site.address,
      city: site.city,
      state: site.state,
      zip: site.zip,
      quadrant: site.quadrant,
      siteType: labelFor(SITE_TYPES, site.siteType),
      status: site.status,
      squareFeet: site.squareFeet ? site.squareFeet.toLocaleString() : null,
      parkingSpaces: site.parkingSpaces?.toString() ?? null,
      parkingRatio: site.parkingRatio ? `${site.parkingRatio}/1000 SF` : null,
      askingRentPsf: site.askingRentPsf ? `$${site.askingRentPsf.toFixed(2)}/SF/yr` : null,
      nnnEstimate: site.nnnEstimate ? `$${site.nnnEstimate.toFixed(2)}/SF/yr` : null,
      leaseType: labelFor(TENANT_LEASE_TYPES, site.leaseType),
      leaseTermOffered: site.leaseTermOffered ? `${site.leaseTermOffered} yrs` : null,
      availableDate: site.availableDate
        ? new Date(site.availableDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
        : null,
      dailyTraffic: site.dailyTraffic ? site.dailyTraffic.toLocaleString() + " VPD" : null,
      population1mi: site.population1mi?.toLocaleString() ?? null,
      population3mi: site.population3mi?.toLocaleString() ?? null,
      population5mi: site.population5mi?.toLocaleString() ?? null,
      medianIncome: site.medianIncome ? `$${Math.round(site.medianIncome).toLocaleString()}` : null,
      coTenants: site.coTenants,
      zoning: site.zoning,
      brokerName: site.brokerName,
      brokerEmail: site.brokerEmail,
      brokerPhone: site.brokerPhone,
      notes: site.notes,
      source: site.source,
    },
    assignments: site.assignments.map((a) => ({
      id: a.id,
      tenantName: a.tenant.name,
      score: a.score,
      grade: a.grade,
      scoreBreakdown: a.scoreBreakdown as {
        category: string;
        points: number;
        max: number;
        status: string;
        detail: string;
      }[] | null,
      gapAnalysis: a.gapAnalysis as {
        isExceptional: boolean;
        exceptionalReason: string | null;
        buyBoxAdjustments?: { field: string; currentValue: string; requiredValue: string; impact: string }[];
        requirementAdjustments?: { field: string; currentValue: string; requiredValue: string; impact: string }[];
        verdict: string;
      } | null,
      requirements: a.tenant.requirements
        ? {
            minSF: a.tenant.requirements.minSF,
            maxSF: a.tenant.requirements.maxSF,
            maxRentPsf: a.tenant.requirements.maxRentPsf,
            minTraffic: a.tenant.requirements.minTraffic,
            targetMarkets: a.tenant.requirements.targetMarkets,
            siteTypePrefs: a.tenant.requirements.siteTypePrefs,
          }
        : null,
    })),
    newsFlags: site.newsFlags.map((f) => ({
      id: f.id,
      relevance: f.relevance,
      impact: f.impact,
      headline: f.newsItem.headline,
      source: f.newsItem.source,
      publishedAt: f.newsItem.publishedAt
        ? new Date(f.newsItem.publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
        : null,
    })),
    date,
  };

  return <SiteExportClient data={data} />;
}
