import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { InvestorEditForm } from "@/components/investor-edit-form";

export const dynamic = "force-dynamic";

export default async function EditInvestorPage({
  params,
}: {
  params: { id: string };
}) {
  const investor = await prisma.investor.findUnique({
    where: { id: params.id },
    include: { buyBox: true },
  });
  if (!investor) notFound();

  return (
    <div className="space-y-5">
      <PageHeader title={`Edit — ${investor.name}`} />
      <InvestorEditForm investor={investor as never} />
    </div>
  );
}
