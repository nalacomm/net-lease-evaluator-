import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { TenantEditForm } from "@/components/tenant-edit-form";

export const dynamic = "force-dynamic";

export default async function EditTenantPage({
  params,
}: {
  params: { id: string };
}) {
  const rawTenant = await prisma.tenant.findUnique({
    where: { id: params.id },
    include: { requirements: { orderBy: { createdAt: "asc" } } },
  });
  if (!rawTenant) notFound();
  const tenant = { ...rawTenant, requirements: rawTenant.requirements[0] ?? null };

  return (
    <div className="space-y-5">
      <PageHeader title={`Edit — ${rawTenant.name}`} />
      <TenantEditForm tenant={tenant as never} />
    </div>
  );
}
