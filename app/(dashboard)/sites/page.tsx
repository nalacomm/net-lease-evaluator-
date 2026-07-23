import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, EmptyState, StatusPill, GradeBadge } from "@/components/ui";
import { Plus } from "lucide-react";
import { labelFor, SITE_TYPES, SITE_STATUSES } from "@/lib/constants";

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
      assignments: { select: { grade: true, score: true } },
    },
  }),
  prisma.siteReport.findMany({ select: { siteIds: true } }),
  ]);

  const reportedSiteIds = new Set(siteReports.flatMap((r) => r.siteIds));

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
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs font-medium text-muted-foreground">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">SF</th>
                <th className="px-4 py-3 text-right">Asking Rent/SF</th>
                <th className="px-4 py-3 text-center">Grade</th>
                <th className="px-4 py-3 text-right">Tenants</th>
                <th className="px-4 py-3">Added</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sites.map((site: (typeof sites)[number]) => (
                <tr
                  key={site.id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/sites/${site.id}`}
                        className="hover:underline text-foreground"
                      >
                        {site.name}
                      </Link>
                      {reportedSiteIds.has(site.id) && (
                        <span title="Included in a report" className="inline-flex h-2 w-2 rounded-full bg-brand shrink-0" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {[site.address, site.city, site.state]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {labelFor(SITE_TYPES, site.siteType)}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {site.squareFeet
                      ? site.squareFeet.toLocaleString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {site.askingRentPsf
                      ? `$${site.askingRentPsf.toFixed(2)}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <GradeBadge grade={bestGrade(site.assignments.map((a) => a.grade))} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {site._count.assignments}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(site.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={site.status}>
                      {labelFor(SITE_STATUSES, site.status)}
                    </StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
