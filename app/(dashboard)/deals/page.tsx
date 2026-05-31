import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, EmptyState } from "@/components/ui";
import { DealList } from "@/components/deal-list";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DealsPage() {
  const deals = await prisma.deal.findMany({
    orderBy: { score: "desc" },
    select: {
      id: true,
      address: true,
      tenantName: true,
      assetType: true,
      askingPrice: true,
      capRateAsking: true,
      dscrCalculated: true,
      grade: true,
      score: true,
      status: true,
      sourcePlatform: true,
    },
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Deals"
        subtitle={`${deals.length} total`}
        action={
          <Link href="/deals/new" className="btn-primary">
            <Plus className="h-4 w-4" /> Add Deal
          </Link>
        }
      />
      {deals.length === 0 ? (
        <EmptyState
          title="No deals yet"
          description="Add your first deal to start scoring."
          action={
            <Link href="/deals/new" className="btn-primary">
              Add Deal
            </Link>
          }
        />
      ) : (
        <DealList deals={deals} />
      )}
    </div>
  );
}
