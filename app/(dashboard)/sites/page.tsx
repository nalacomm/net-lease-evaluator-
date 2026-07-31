import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, EmptyState } from "@/components/ui";
import { Plus } from "lucide-react";
import { SiteList } from "@/components/site-list";

export const dynamic = "force-dynamic";

const GRADE_ORDER = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D", "F"];

function bestGrade(grades: (string | null)[]): string | null {
  const valid = grades.filter(Boolean) as string[];
  if (!valid.length) return null;
  return valid.sort((a, b) => GRADE_ORDER.indexOf(a) - GRADE_ORDER.indexOf(b))[0];
}

export default async function SitesPage() {
  const [sites, siteReports] = await Promise.all([
    prisma.prospectiveSite.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        state: true,
        squareFeet: true,
        askingRentPsf: true,
        siteType: true,
        status: true,
        createdAt: true,
        _count: { select: { assignments: true } },
        assignments: { select: { grade: true, tenant: { select: { name: true } } } },
      },
    }),
    prisma.siteReport.findMany({ select: { siteIds: true } }),
  ]);

  const reportedSiteIds = siteReports.flatMap((r) => r.siteIds);

  const rows = sites.map((site) => ({
    id: site.id,
    name: site.name,
    address: site.address,
    city: site.city,
    state: site.state,
    squareFeet: site.squareFeet,
    askingRentPsf: site.askingRentPsf,
    siteType: site.siteType,
    status: site.status,
    createdAt: site.createdAt.toISOString(),
    tenantCount: site._count.assignments,
    bestGrade: bestGrade(site.assignments.map((a) => a.grade)),
    tenantNames: site.assignments.map((a) => a.tenant.name),
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Sites"
        subtitle={`${sites.length} total`}
        action={
          <Link href="/sites/new" className="btn-primary">
            <Plus className="h-4 w-4" /> Add Site
          </Link>
        }
      />
      {sites.length === 0 ? (
        <EmptyState
          title="No sites yet"
          description="Add a prospective site to start matching tenants."
          action={
            <Link href="/sites/new" className="btn-primary">
              Add Site
            </Link>
          }
        />
      ) : (
        <SiteList sites={rows} reportedSiteIds={reportedSiteIds} />
      )}
    </div>
  );
}
