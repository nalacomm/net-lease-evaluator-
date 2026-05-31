import { PageHeader } from "@/components/ui";
import { InvestorForm } from "@/components/investor-form";

export default function NewInvestorPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Add Investor"
        subtitle="Create a client and define their buy box"
      />
      <InvestorForm />
    </div>
  );
}
