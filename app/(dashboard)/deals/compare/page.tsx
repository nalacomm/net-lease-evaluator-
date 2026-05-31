import { PageHeader, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function ComparePage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Compare Deals" subtitle="Side-by-side evaluation" />
      <EmptyState
        title="Comparison mode coming in the next build phase"
        description="Select 2–3 deals to compare every buy-box field side by side with pass/warn/fail badges."
      />
    </div>
  );
}
