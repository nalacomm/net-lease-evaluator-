import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, EmptyState } from "@/components/ui";
import { Plus, ChevronRight, Building2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TenantsPage() {
  const tenants = await prisma.tenant.findMany({
    include: {
      requirements: true,
      _count: { select: { siteAssignments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tenants"
        subtitle="Tenant requirements and site matches"
        action={
          <Link href="/tenants/new" className="btn-primary">
            <Plus className="h-4 w-4" /> Add Tenant
          </Link>
        }
      />

      {tenants.length === 0 ? (
        <EmptyState
          title="No tenants yet"
          action={
            <Link href="/tenants/new" className="btn-primary">
              Add Tenant
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tenants.map((tenant) => {
            const req = tenant.requirements;
            const markets = req?.targetMarkets ?? [];
            const sfMin = req?.minSF;
            const sfMax = req?.maxSF;
            const sfLabel =
              sfMin || sfMax
                ? [sfMin && `${sfMin.toLocaleString()} SF`, sfMax && `${sfMax.toLocaleString()} SF`]
                    .filter(Boolean)
                    .join(" – ")
                : null;

            return (
              <Link
                key={tenant.id}
                href={`/tenants/${tenant.id}`}
                className="card flex flex-col justify-between gap-3 hover:bg-gray-50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900">{tenant.name}</p>
                    {tenant.company && (
                      <p className="text-sm text-gray-500">{tenant.company}</p>
                    )}
                  </div>
                  <ChevronRight className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
                </div>

                <div className="space-y-1 text-xs text-gray-500">
                  {sfLabel && (
                    <p className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {sfLabel}
                    </p>
                  )}
                  {markets.length > 0 && (
                    <p className="truncate">
                      {markets.slice(0, 3).join(", ")}
                      {markets.length > 3 && ` +${markets.length - 3} more`}
                    </p>
                  )}
                  <p className="font-medium text-gray-600">
                    {tenant._count.siteAssignments} site
                    {tenant._count.siteAssignments !== 1 ? "s" : ""} assigned
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
