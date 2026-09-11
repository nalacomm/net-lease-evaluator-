import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { TenantProfile } from "@/components/tenant-profile";

export const dynamic = "force-dynamic";

export default async function TenantPage({
  params,
}: {
  params: { id: string };
}) {
  const [rawTenant, allSites, tenantSiteReports] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: params.id },
      include: {
        requirements: { orderBy: { createdAt: "asc" } },
        siteAssignments: {
          include: { site: true },
          orderBy: { createdAt: "desc" },
        },
        campaigns: true,
      },
    }),
    prisma.prospectiveSite.findMany({
      select: { id: true, name: true, city: true, state: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.siteReport.findMany({
      where: { tenantId: params.id },
      select: { siteIds: true },
    }),
  ]);

  const reportedSiteIds = new Set(tenantSiteReports.flatMap((r) => r.siteIds));
  if (!rawTenant) notFound();
  const tenant = { ...rawTenant, requirements: rawTenant.requirements[0] ?? null };

  return (
    <div className="space-y-5">
      <PageHeader
        title={rawTenant.name}
        subtitle={rawTenant.company ?? undefined}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href={`/tenants/${rawTenant.id}/edit`} className="btn-secondary">
              Edit Tenant
            </Link>
          </div>
        }
      />
      <TenantProfile tenant={tenant as never} availableSites={allSites} reportedSiteIds={reportedSiteIds} />
    </div>
  );
}
