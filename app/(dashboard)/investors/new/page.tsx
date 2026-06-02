import { PageHeader } from "@/components/ui";
import { InvestorOnboarding } from "@/components/investor-onboarding";

export default function NewInvestorPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Add Investor"
        subtitle="Enter buy box manually or describe what they want and let AI build it"
      />
      <InvestorOnboarding />
    </div>
  );
}
