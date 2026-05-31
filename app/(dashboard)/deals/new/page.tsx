import { redirect } from "next/navigation";
import { getAllInvestors } from "@/lib/investor";
import { PageHeader } from "@/components/ui";
import { DealIntake } from "@/components/deal-intake";

export const dynamic = "force-dynamic";

export default async function NewDealPage() {
  const investors = await getAllInvestors();
  if (investors.length === 0) redirect("/investors/new");

  return (
    <div className="space-y-5">
      <PageHeader
        title="Add Deal"
        subtitle="Paste text, upload a PDF, or drop a listing URL"
      />
      <DealIntake investors={investors.map((i) => ({ id: i.id, name: i.name }))} />
    </div>
  );
}
