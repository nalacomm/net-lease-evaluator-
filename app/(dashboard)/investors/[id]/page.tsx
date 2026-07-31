import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { computeFinance } from "@/lib/finance";
import { fmtMoney } from "@/lib/format";
import { PageHeader, GradeBadge } from "@/components/ui";
import { BuyBoxDisplay } from "@/components/buybox-display";
import { InvestorAnalysis } from "@/components/investor-analysis";

export const dynamic = "force-dynamic";

export default async function InvestorPage({
  params,
}: {
  params: { id: string };
}) {
  const investor = await prisma.investor.findUnique({
    where: { id: params.id },
    include: {
      buyBox: true,
      deals: { orderBy: { createdAt: "desc" } },
      assignments: {
        include: { deal: true },
        orderBy: { score: "desc" },
      },
    },
  });
  if (!investor) notFound();
  const bb = investor.buyBox;

  // Income projections: hypothetical monthly income if each deal is acquired
  const projections = bb
    ? investor.deals
        .filter((d) => d.askingPrice && d.noi)
        .map((d) => {
          const fin = computeFinance({
            price: d.askingPrice!,
            noi: d.noi!,
            ltv: bb.ltv,
            ratePercent: bb.interestRate,
            amortizationYears: bb.amortizationYears,
            currentMonthlyIncome: bb.currentMonthlyIncome ?? 0,
          });
          return {
            id: d.id,
            label: d.tenantName ?? d.address ?? "Deal",
            grade: d.grade,
            additive: fin.additiveMonthlyIncome,
            newTotal: fin.newPortfolioMonthlyTotal,
          };
        })
        .sort((a, b) => b.additive - a.additive)
    : [];

  // Merge assignments + directly-linked deals into one unified list
  // Assignments have per-investor scores; directly-linked deals use the deal's own score
  const assignedDealIds = new Set(investor.assignments.map((a) => a.dealId));
  const directOnlyDeals = investor.deals.filter((d) => !assignedDealIds.has(d.id));
  const allEvaluatedDeals = [
    ...investor.assignments.map((a) => ({
      id: a.dealId,
      address: a.deal.address,
      tenantName: a.deal.tenantName,
      score: a.score,
      grade: a.grade,
      formal: true,
    })),
    ...directOnlyDeals.map((d) => ({
      id: d.id,
      address: d.address,
      tenantName: d.tenantName,
      score: d.score,
      grade: d.grade,
      formal: false,
    })),
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={investor.name}
        subtitle={investor.entityName ?? undefined}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href={`/investors/${investor.id}/edit`} className="btn-secondary">
              Edit Investor
            </Link>
            {!bb && (
              <Link href={`/investors/${investor.id}/buybox`} className="btn-primary">
                Build Buy Box
              </Link>
            )}
          </div>
        }
      />

      {investor.notes && (
        <div className="card text-sm text-gray-600">{investor.notes}</div>
      )}

      <InvestorAnalysis investorId={investor.id} initialSummary={investor.investorSummary ?? null} />

      {/* Income projections (hypothetical — not current holdings) */}
      {bb && projections.length > 0 && (
        <div className="card">
          <h2 className="mb-1 font-semibold">Income Projections</h2>
          <p className="mb-3 text-xs text-gray-400">
            Hypothetical monthly cash flow if each deal is acquired at buy box defaults ({(bb.ltv * 100).toFixed(0)}% LTV). These are prospective scenarios — not current holdings.
            {bb.currentMonthlyIncome ? ` Current baseline: ${fmtMoney(bb.currentMonthlyIncome)}/mo.` : ""}
          </p>
          <ul className="space-y-2">
            {projections.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/deals/${p.id}`}
                  className="flex items-center justify-between rounded-lg border border-gray-100 p-3 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-2">
                    <GradeBadge grade={p.grade} size="sm" />
                    <span className="text-sm font-medium">{p.label}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-700">
                      +{fmtMoney(p.additive)}/mo
                    </p>
                    <p className="text-xs text-gray-400">
                      → {fmtMoney(p.newTotal)}/mo total
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* All deals linked to this investor */}
      {allEvaluatedDeals.length > 0 && (
        <div className="card">
          <h2 className="mb-2 font-semibold">
            Deals Evaluated Against This Buy Box
          </h2>
          <p className="mb-3 text-xs text-gray-500">
            All modules — Finance, Scoring, Sensitivity — use this investor&apos;s buy box defaults.
          </p>
          <ul className="space-y-2">
            {allEvaluatedDeals.map((a) => (
              <li key={a.id}>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-100 p-3">
                  <div className="flex items-center gap-2">
                    <GradeBadge grade={a.grade} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {a.address ?? a.tenantName ?? "Deal"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {a.tenantName && a.address ? a.tenantName : null}
                        {a.score != null ? ` · Score ${a.score.toFixed(0)}` : ""}
                        {!a.formal && <span className="ml-1 text-gray-400">(not yet re-scored against buy box)</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/deals/${a.id}?investorId=${investor.id}`}
                      className="btn-secondary text-xs"
                    >
                      Overview
                    </Link>
                    <Link
                      href={`/finance/${a.id}?investorId=${investor.id}`}
                      className="btn-primary text-xs"
                    >
                      Finance
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Buy box */}
      {bb ? (
        <div>
          <h2 className="mb-2 font-semibold">Buy Box</h2>
          <BuyBoxDisplay bb={bb} />
        </div>
      ) : (
        <div className="card text-sm text-gray-600">
          No buy box yet.{" "}
          <Link href={`/investors/${investor.id}/buybox`} className="text-brand underline">
            Build one
          </Link>
          .
        </div>
      )}
    </div>
  );
}
