import { PageHeader, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function NewsPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="News" subtitle="Market news and deal tagging" />
      <EmptyState
        title="News feed coming in the next build phase"
        description="Manual entry, URL paste, and AI deal tagging land here. Deal-level news flags already render on each deal profile."
      />
    </div>
  );
}
