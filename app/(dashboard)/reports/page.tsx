import { PageHeader, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function ReportsPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Reports" subtitle="Top 3 deal reports for clients" />
      <EmptyState
        title="Report export coming in the next build phase"
        description="Select up to 3 deals and generate a Blake-Dickson PDF with score breakdowns, finance snapshots, and AI recommendations."
      />
    </div>
  );
}
