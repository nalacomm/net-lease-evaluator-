import Link from "next/link";
import { getActiveInvestor } from "@/lib/investor";
import { prisma } from "@/lib/prisma";
import { computeFinance } from "@/lib/finance";
import { fmtMoney, fmtMoneyShort } from "@/lib/format";
import { labelFor, ASSET_TYPES } from "@/lib/constants";
import { PageHeader, Stat, GradeBadge, EmptyState } from "@/components/ui";
import { AssetClassChart } from "@/components/charts";
import { Plus, FileText, Newspaper } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const investor = await getActiveInvestor();

  if (!investor) {
    return (
      <EmptyState
        title="No investor yet"
        description="Add an investor and buy box to begin evaluating deals."
        action={
          <Link href="/investors/new" className="btn-primary">
            Add Investor
          </Link>
        }
      />
    );
  }

  const bb = investor.buyBox;
  const deals = await prisma.deal.findMany({
    where: { investorId: investor.id },
    orderBy: { score: "desc" },
  });

  const activeDeals = deals.filter((d) => d.status === "active");
  const scored = deals.filter((d) => d.score != null);
  const topDeal = scored[0] ?? null;

  // Asset class ranking
  const byType = new Map<string, { sum: number; n: number }>();
  for (const d of scored) {
    const t = d.assetType ?? "other";
    const e = byType.get(t) ?? { sum: 0, n: 0 };
    e.sum += d.score ?? 0;
    e.n += 1;
    byType.set(t, e);
  }
  const chartData = Array.from(byType.entries()).map(([type, v]) => ({
    type: labelFor(ASSET_TYPES, type),
    avgScore: v.sum / v.n,
    count: v.n,
  }));

  // Projected income if top deal closes at default LTV
  let projection: { additive: number; newTotal: number } | null = null;
  if (topDeal && bb && topDeal.askingPrice && topDeal.noi) {
    const fin = computeFinance({
      price: topDeal.askingPrice,
      noi: topDeal.noi,
      ltv: bb.ltv,
      ratePercent: bb.interestRate,
      amortizationYears: bb.amortizationYears,
      currentMonthlyIncome: bb.currentMonthlyIncome ?? 0,
    });
    projection = {
      additive: fin.additiveMonthlyIncome,
      newTotal: fin.newPortfolioMonthlyTotal,
    };
  }

  const recentFlags = await prisma.dealNewsFlag.findMany({
    where: { deal: { investorId: investor.id } },
    orderBy: { createdAt: "desc" },
    take: 3,
    include: { newsItem: true, deal: true },
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Portfolio Dashboard"
        subtitle={`${investor.name}${
          investor.entityName ? ` · ${investor.entityName}` : ""
        }`}
      />

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Link href="/deals/new" className="btn-primary">
          <Plus className="h-4 w-4" /> Add Deal
        </Link>
        <Link href="/reports" className="btn-secondary">
          <FileText className="h-4 w-4" /> Generate Report
        </Link>
        <Link href="/news" className="btn-secondary">
          <Newspaper className="h-4 w-4" /> Add News
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Monthly Income"
          value={fmtMoney(bb?.currentMonthlyIncome ?? 0)}
          hint="Current portfolio"
        />
        <Stat label="Active Deals" value={activeDeals.length} hint="Under review" />
        <Stat
          label="Top Deal"
          value={
            topDeal ? (
              <span className="flex items-center gap-2">
                <GradeBadge grade={topDeal.grade} size="sm" />
                {topDeal.score?.toFixed(0)}
              </span>
            ) : (
              "—"
            )
          }
          hint={topDeal?.tenantName ?? topDeal?.address ?? undefined}
        />
        <Stat
          label="Projected Total"
          value={projection ? fmtMoney(projection.newTotal) : "—"}
          hint={
            projection
              ? `+${fmtMoneyShort(projection.additive)}/mo if top closes`
              : undefined
          }
        />
      </div>

      {/* Projection callout */}
      {projection && topDeal && (
        <div className="card bg-brand text-white">
          <p className="text-sm opacity-90">
            If you close{" "}
            <span className="font-semibold">
              {topDeal.tenantName ?? topDeal.address ?? "the top deal"}
            </span>{" "}
            at {((bb?.ltv ?? 0) * 100).toFixed(0)}% LTV:
          </p>
          <p className="mt-1 text-2xl font-bold">
            {fmtMoney(projection.newTotal)}/mo
          </p>
          <p className="text-sm opacity-90">
            +{fmtMoney(projection.additive)}/mo added to portfolio
          </p>
        </div>
      )}

      {/* Asset class chart */}
      <div className="card">
        <h2 className="mb-2 font-semibold text-gray-900">
          Average Score by Asset Class
        </h2>
        <AssetClassChart data={chartData} />
      </div>

      {/* Recent news flags */}
      <div className="card">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent News Flags</h2>
          <Link href="/news" className="text-sm text-brand">
            View all
          </Link>
        </div>
        {recentFlags.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">
            No news flags yet.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {recentFlags.map((f) => (
              <li key={f.id} className="py-2">
                <Link
                  href={`/deals/${f.dealId}`}
                  className="block hover:opacity-80"
                >
                  <p className="text-sm font-medium text-gray-900">
                    {f.newsItem.headline}
                  </p>
                  <p className="text-xs text-gray-500">{f.relevance}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
