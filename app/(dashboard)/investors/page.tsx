import Link from "next/link";
import { getAllInvestors } from "@/lib/investor";
import { PageHeader, EmptyState } from "@/components/ui";
import { InvestorList } from "@/components/investor-list";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function InvestorsPage() {
  const investors = await getAllInvestors();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Investors"
        subtitle="Clients and their buy boxes"
        action={
          <Link href="/investors/new" className="btn-primary">
            <Plus className="h-4 w-4" /> Add Investor
          </Link>
        }
      />

      {investors.length === 0 ? (
        <EmptyState
          title="No investors yet"
          action={
            <Link href="/investors/new" className="btn-primary">
              Add Investor
            </Link>
          }
        />
      ) : (
        <InvestorList investors={investors} />
      )}
    </div>
  );
}
