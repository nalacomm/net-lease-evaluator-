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
  const tenant = await prisma.tenant.findUnique({
    where: { id: params.id },
    include: {
      requirements: true,
      siteAssignments: { include: { site: true } },
      campaigns: true,
    },
  });
  if (!tenant) notFound();

  return (
    <div className="space-y-5">
      <PageHeader
        title={tenant.name}
        subtitle={tenant.company ?? undefined}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href={`/tenants/${tenant.id}/edit`} className="btn-secondary">
              Edit Tenant
            </Link>
          </div>
        }
      />
      <TenantProfile tenant={tenant as never} />
    </div>
  );
}
