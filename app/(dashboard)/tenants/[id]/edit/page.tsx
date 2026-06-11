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
  const tenant = await prisma.tenant.findUnique({
    where: { id: params.id },
    include: { requirements: true },
  });
  if (!tenant) notFound();

  return (
    <div className="space-y-5">
      <PageHeader title={`Edit — ${tenant.name}`} />
      <TenantEditForm tenant={tenant as never} />
    </div>
  );
}
