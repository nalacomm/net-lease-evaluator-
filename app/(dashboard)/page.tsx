import Link from "next/link";
import { getActiveInvestor, getAllInvestors } from "@/lib/investor";
import { prisma } from "@/lib/prisma";
import { labelFor, ASSET_TYPES } from "@/lib/constants";
import { PageHeader, Stat, GradeBadge, EmptyState } from "@/components/ui";
import { AssetClassChart } from "@/components/charts";
import { InvestorSwitcher } from "@/components/investor-switcher";
import { Plus, FileText, Newspaper, Store, MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { investor?: string };
}) {
  const allInvestors = await getAllInvestors();
  const investor = await getActiveInvestor(searchParams.investor);

  if (allInvestors.length === 0) {
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
  const [
    primaryDeals,
    assignments,
    tenantCount,
    activeSiteCount,
    siteEvalCount,
    recentSiteAssignments,
    recentDealFlags,
    recentSiteFlags,
  ] = await Promise.all([
    prisma.deal.findMany({
      where: { investorId: investor?.id },
      orderBy: { score: "desc" },
    }),
    prisma.dealAssignment.findMany({
      where: { investorId: investor?.id },
      include: { deal: true },
      orderBy: { score: "desc" },
    }),
    prisma.tenant.aggregate({ _count: { id: true } }),
    prisma.prospectiveSite.count({ where: { status: "active" } }),
    prisma.siteAssignment.count(),
    prisma.siteAssignment.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        site: { select: { id: true, name: true, city: true, state: true } },
        tenant: { select: { id: true, name: true } },
      },
    }),
    prisma.dealNewsFlag.findMany({
      orderBy: { createdAt: "desc" },
      take: 3,
      include: { newsItem: true, deal: true },
    }),
    prisma.siteNewsFlag.findMany({
      orderBy: { createdAt: "desc" },
      take: 3,
      include: { newsItem: true, site: true },
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
        score: a.score,
        grade: a.grade,
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle={
          investor
            ? `${investor.name}${investor.entityName ? ` · ${investor.entityName}` : ""}`
            : undefined
        }
      />

      {allInvestors.length > 1 && investor && (
        <InvestorSwitcher
          investors={allInvestors.map((i) => ({ id: i.id, name: i.name }))}
          activeId={investor.id}
        />
      )}

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Link href="/deals/new" className="btn-primary">
          <Plus className="h-4 w-4" /> Add Deal
        </Link>
        <Link href="/sites/new" className="btn-primary" style={{ background: "var(--color-teal, #0d9488)" }}>
          <MapPin className="h-4 w-4" /> Add Site
        </Link>
        <Link href="/news" className="btn-secondary">
          <Newspaper className="h-4 w-4" /> Add News
        </Link>
        {investor && (
          <Link href={`/reports?investorId=${investor.id}`} className="btn-secondary">
            <FileText className="h-4 w-4" /> Reports
          </Link>
        )}
      </div>

      {/* ── SECTION 1: Investment ── */}
      <div className="space-y-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Investment</p>
          <hr className="mt-1 border-gray-200" />
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
      </div>

      {/* ── SECTION 2: Tenant Rep ── */}
      <div className="space-y-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Tenant Rep</p>
          <hr className="mt-1 border-gray-200" />
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Stat label="Tenant Clients" value={tenantCount._count.id} hint="All tenants" />
          <Stat label="Active Sites" value={activeSiteCount} hint="Status: active" />
          <Stat label="Site Evaluations" value={siteEvalCount} hint="Total assignments" />
        </div>

        {/* Quick links */}
        <div className="flex flex-wrap gap-2">
          <Link href="/tenants/new" className="btn-primary">
            <Store className="h-4 w-4" /> Add Tenant
          </Link>
          <Link href="/sites/new" className="btn-primary" style={{ background: "var(--color-teal, #0d9488)" }}>
            <MapPin className="h-4 w-4" /> Add Site
          </Link>
        </div>

        {/* Recent site evaluations */}
        <div className="card">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Site Evaluations</h2>
            <Link href="/sites" className="text-sm text-brand">View all</Link>
          </div>
          {recentSiteAssignments.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">No site evaluations yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recentSiteAssignments.map((a) => (
                <li key={a.id} className="py-2">
                  <Link href={`/sites/${a.siteId}`} className="flex items-center justify-between hover:opacity-80">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {a.site.name || "Unnamed site"}
                        {a.site.city ? ` · ${a.site.city}` : ""}
                        {a.site.state ? `, ${a.site.state}` : ""}
                      </p>
                      <p className="text-xs text-gray-500">{a.tenant.name}</p>
                    </div>
                    {a.grade && <GradeBadge grade={a.grade} size="sm" />}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── SECTION 3: Recent Activity ── */}
      <div className="space-y-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Recent Activity</p>
          <hr className="mt-1 border-gray-200" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Recent Deal News Flags */}
          <div className="card">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Deal News Flags</h2>
              <Link href="/news" className="text-sm text-brand">View all</Link>
            </div>
            {recentDealFlags.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400">No deal news flags yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {recentDealFlags.map((f) => (
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

          {/* Recent Site News Flags */}
          <div className="card">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Site News Flags</h2>
              <Link href="/news" className="text-sm text-brand">View all</Link>
            </div>
            {recentSiteFlags.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400">No site news flags yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {recentSiteFlags.map((f) => (
                  <li key={f.id} className="py-2">
                    <Link href={`/sites/${f.siteId}`} className="block hover:opacity-80">
                      <p className="text-sm font-medium text-gray-900">{f.newsItem.headline}</p>
                      <p className="text-xs text-gray-500">{f.relevance}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
