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
    include: { buyBoxes: true },
  });
  if (!investor) notFound();

  const { pickBuyBox } = await import("@/lib/investor");
  const defaultBb = pickBuyBox(investor.buyBoxes);
  const investorForForm = { ...investor, buyBox: defaultBb ?? null };

  return (
    <div className="space-y-5">
      <PageHeader title={`Edit — ${investor.name}`} />
      <InvestorEditForm investor={investorForForm as never} />
    </div>
  );
}
