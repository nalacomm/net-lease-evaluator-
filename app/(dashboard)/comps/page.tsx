import { PageHeader, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function CompsPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Comps" subtitle="Closed-deal benchmark tracker" />
      <EmptyState
        title="Comp tracker coming in the next build phase"
        description="Record closed sales for internal benchmarking and link them to deals."
      />
    </div>
  );
}
