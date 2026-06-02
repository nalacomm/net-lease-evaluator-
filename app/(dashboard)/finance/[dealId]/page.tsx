import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { FinancePlanner } from "@/components/finance-planner";
import { fmtMoney, fmtPercent } from "@/lib/format";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function FinancePage({
  params,
  searchParams,
}: {
  params: { dealId: string };
  searchParams: { investorId?: string };
}) {
  const [deal, contextInvestor] = await Promise.all([
    prisma.deal.findUnique({
      where: { id: params.dealId },
      include: { investor: { include: { buyBox: true } } },
    }),
    searchParams.investorId
      ? prisma.investor.findUnique({
          where: { id: searchParams.investorId },
          include: { buyBox: true },
        })
      : null,
  ]);
  if (!deal) notFound();
  // Use the context investor's buy box if provided (e.g. from investor profile page)
  const bb = contextInvestor?.buyBox ?? deal.investor?.buyBox ?? null;
  const investorLabel = contextInvestor?.name ?? deal.investor?.name ?? null;

  if (!deal.askingPrice || !deal.noi || !bb) {
    return (
      <div className="space-y-4">
        <PageHeader title="Finance Module" />
        <div className="card text-sm text-gray-600">
          This deal needs an asking price, NOI, and an investor buy box to model
          financing.{" "}
          <Link href={`/deals/${deal.id}/edit`} className="text-brand underline">
            Edit deal
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link
        href={`/deals/${deal.id}`}
        className="inline-flex items-center gap-1 text-sm text-brand"
      >
        <ArrowLeft className="h-4 w-4" /> Back to deal
      </Link>
      <PageHeader
        title="Finance Planning"
        subtitle={[deal.address ?? deal.tenantName ?? "Deal", investorLabel ? `Modeled for ${investorLabel}` : null].filter(Boolean).join(" · ")}
      />

      <div className="card grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        <div>
          <p className="text-xs uppercase text-gray-500">Asking</p>
          <p className="font-semibold">{fmtMoney(deal.askingPrice)}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-gray-500">NOI</p>
          <p className="font-semibold">{fmtMoney(deal.noi)}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-gray-500">Cap Rate</p>
          <p className="font-semibold">{fmtPercent(deal.capRateAsking)}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-gray-500">DSCR Floor</p>
          <p className="font-semibold">{bb.dscrMin.toFixed(2)}x</p>
        </div>
      </div>

      <FinancePlanner
        price={deal.askingPrice}
        noi={deal.noi}
        defaultLtv={bb.ltv}
        defaultRate={bb.interestRate}
        defaultAmort={bb.amortizationYears}
        dscrFloor={bb.dscrMin}
        currentMonthlyIncome={bb.currentMonthlyIncome ?? 0}
        dealLabel={deal.address ?? deal.tenantName ?? "deal"}
      />
    </div>
  );
}
