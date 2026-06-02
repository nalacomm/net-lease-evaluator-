import Link from "next/link";
import { getActiveInvestor, getAllInvestors } from "@/lib/investor";
import { prisma } from "@/lib/prisma";
import { labelFor, ASSET_TYPES } from "@/lib/constants";
import { PageHeader, Stat, GradeBadge, EmptyState } from "@/components/ui";
import { AssetClassChart } from "@/components/charts";
import { InvestorSwitcher } from "@/components/investor-switcher";
import { Plus, FileText, Newspaper } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { investor?: string };
}) {
  const allInvestors = await getAllInvestors();
  const investor = await getActiveInvestor(searchParams.investor);

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

  // Pull primary deals AND assigned deals, then merge
  const [primaryDeals, assignments] = await Promise.all([
    prisma.deal.findMany({
      where: { investorId: investor.id },
      orderBy: { score: "desc" },
    }),
    prisma.dealAssignment.findMany({
      where: { investorId: investor.id },
      include: { deal: true },
      orderBy: { score: "desc" },
    }),
  ]);

  // Unified deal shape for dashboard stats
  type DashDeal = {
    id: string;
    address: string | null;
    tenantName: string | null;
    assetType: string | null;
    status: string;
    score: number | null;
    grade: string | null;
  };

  const seen = new Set(primaryDeals.map((d) => d.id));

  const allDeals: DashDeal[] = [
    ...primaryDeals.map((d) => ({
      id: d.id,
      address: d.address,
      tenantName: d.tenantName,
      assetType: d.assetType,
      status: d.status,
      score: d.score,
      grade: d.grade,
    })),
    // Assigned deals not already in primary — use assignment-specific score/grade
    ...assignments
      .filter((a) => !seen.has(a.dealId))
      .map((a) => ({
        id: a.dealId,
        address: a.deal.address,
        tenantName: a.deal.tenantName,
        assetType: a.deal.assetType,
        status: a.deal.status,
        score: a.score,       // investor-specific score
        grade: a.grade,       // investor-specific grade
      })),
  ].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));

  const activeDeals = allDeals.filter((d) => d.status === "active");
  const scored = allDeals.filter((d) => d.score != null);
  const topDeal = scored[0] ?? null;

  // Asset class ranking — use investor-specific scores
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

  // News flags: primary deals + assigned deal IDs
  const allDealIds = allDeals.map((d) => d.id);
  const recentFlags = await prisma.dealNewsFlag.findMany({
    where: { dealId: { in: allDealIds } },
    orderBy: { createdAt: "desc" },
    take: 3,
    include: { newsItem: true, deal: true },
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        subtitle={`${investor.name}${investor.entityName ? ` · ${investor.entityName}` : ""}`}
      />

      {allInvestors.length > 1 && (
        <InvestorSwitcher
          investors={allInvestors.map((i) => ({ id: i.id, name: i.name }))}
          activeId={investor.id}
        />
      )}

      <div className="flex flex-wrap gap-2">
        <Link href="/deals/new" className="btn-primary">
          <Plus className="h-4 w-4" /> Add Deal
        </Link>
        <Link href={`/reports?investorId=${investor.id}`} className="btn-secondary">
          <FileText className="h-4 w-4" /> Generate Report
        </Link>
        <Link href="/news" className="btn-secondary">
          <Newspaper className="h-4 w-4" /> Add News
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Active Deals" value={activeDeals.length} hint="Under review" />
        <Stat label="Scored Deals" value={scored.length} hint="With AI analysis" />
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
      </div>

      <div className="card">
        <h2 className="mb-2 font-semibold text-gray-900">Average Score by Asset Class</h2>
        <AssetClassChart data={chartData} />
      </div>

      <div className="card">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent News Flags</h2>
          <Link href="/news" className="text-sm text-brand">View all</Link>
        </div>
        {recentFlags.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">No news flags yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {recentFlags.map((f) => (
              <li key={f.id} className="py-2">
                <Link href={`/deals/${f.dealId}`} className="block hover:opacity-80">
                  <p className="text-sm font-medium text-gray-900">{f.newsItem.headline}</p>
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
