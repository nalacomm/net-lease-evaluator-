import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, EmptyState } from "@/components/ui";
import { TenantList } from "@/components/tenant-list";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TenantsPage() {
  const rawTenants = await prisma.tenant.findMany({
    include: {
      requirements: { orderBy: { createdAt: "asc" } },
      _count: { select: { siteAssignments: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  // Flatten requirements array to single default for the list component
  const tenants = rawTenants.map((t) => ({ ...t, requirements: t.requirements[0] ?? null }));

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
        <TenantList tenants={tenants as never} />
      )}
    </div>
  );
}
