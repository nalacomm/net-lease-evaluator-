import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, EmptyState, StatusPill } from "@/components/ui";
import { Plus } from "lucide-react";
import { labelFor, SITE_TYPES, SITE_STATUSES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function SitesPage() {
  const sites = await prisma.prospectiveSite.findMany({
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
      _count: { select: { assignments: true } },
    },
  });

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
                <th className="px-4 py-3 text-right">Tenants</th>
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
                    <Link
                      href={`/sites/${site.id}`}
                      className="hover:underline text-foreground"
                    >
                      {site.name}
                    </Link>
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
                  <td className="px-4 py-3 text-right">
                    {site._count.assignments}
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
