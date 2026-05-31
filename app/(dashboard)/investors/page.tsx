import Link from "next/link";
import { getAllInvestors } from "@/lib/investor";
import { fmtMoney } from "@/lib/format";
import { PageHeader, EmptyState } from "@/components/ui";
import { Plus, ChevronRight } from "lucide-react";

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
        <ul className="space-y-2">
          {investors.map((inv) => (
            <li key={inv.id}>
              <Link href={`/investors/${inv.id}`} className="card flex items-center justify-between hover:bg-gray-50">
                <div>
                  <p className="font-semibold text-gray-900">{inv.name}</p>
                  <p className="text-sm text-gray-500">
                    {inv.entityName ?? "—"} · {inv._count.deals} deals
                  </p>
                  {inv.buyBox && (
                    <p className="mt-1 text-xs text-gray-400">
                      Cap floor {inv.buyBox.capRateMin}% · Max{" "}
                      {fmtMoney(inv.buyBox.priceMax)} ·{" "}
                      {inv.buyBox.assetTypesPreferred.join(", ")}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
