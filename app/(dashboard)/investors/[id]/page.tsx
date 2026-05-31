import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { computeFinance } from "@/lib/finance";
import { fmtMoney } from "@/lib/format";
import { PageHeader, GradeBadge } from "@/components/ui";
import { BuyBoxDisplay } from "@/components/buybox-display";

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
      deals: { where: { status: "active" }, orderBy: { score: "desc" } },
    },
  });
  if (!investor) notFound();
  const bb = investor.buyBox;

  // Portfolio cash flow projections at default LTV
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

  return (
    <div className="space-y-5">
      <PageHeader
        title={investor.name}
        subtitle={investor.entityName ?? undefined}
        action={
          bb ? (
            <Link href={`/investors/${investor.id}/buybox`} className="btn-secondary">
              Edit Buy Box
            </Link>
          ) : (
            <Link href={`/investors/${investor.id}/buybox`} className="btn-primary">
              Build Buy Box
            </Link>
          )
        }
      />

      {investor.notes && (
        <div className="card text-sm text-gray-600">{investor.notes}</div>
      )}

      {/* Portfolio cash flow */}
      {bb && (
        <div className="card">
          <h2 className="mb-2 font-semibold">Portfolio Cash Flow</h2>
          <p className="text-sm text-gray-500">
            Current monthly income:{" "}
            <span className="font-semibold text-gray-900">
              {fmtMoney(bb.currentMonthlyIncome ?? 0)}
            </span>{" "}
            · at {(bb.ltv * 100).toFixed(0)}% LTV default
          </p>
          {projections.length === 0 ? (
            <p className="py-3 text-center text-sm text-gray-400">
              No active deals with financials yet.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
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
          )}
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
