import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { DealEditForm } from "@/components/deal-edit-form";

export const dynamic = "force-dynamic";

export default async function EditDealPage({
  params,
}: {
  params: { id: string };
}) {
  const deal = await prisma.deal.findUnique({ where: { id: params.id } });
  if (!deal) notFound();

  return (
    <div className="space-y-5">
      <PageHeader title="Edit Deal" subtitle={deal.address ?? undefined} />
      <DealEditForm id={deal.id} initial={deal as Record<string, unknown>} />
    </div>
  );
}
