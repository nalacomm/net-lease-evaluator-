import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { computeFinance } from "@/lib/finance";
import { fmtMoney, fmtPercent, fmtDscr, GRADE_COLORS } from "@/lib/format";
import { labelFor, ASSET_TYPES, LEASE_TYPES, GUARANTY_TYPES } from "@/lib/constants";
import { DealExportClient } from "@/components/deal-export-client";

export const dynamic = "force-dynamic";

export default async function DealExportPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { investorId?: string };
}) {
  const deal = await prisma.deal.findUnique({
    where: { id: params.id },
    include: {
      assignments: {
        include: { investor: { include: { buyBox: true } } },
      },
      investor: { include: { buyBox: true } },
    },
  });
  if (!deal) notFound();

  // Resolve which investor's buy box to use
  const ctxInvestorId = searchParams.investorId;
  const ctxAssignment = ctxInvestorId
    ? deal.assignments.find((a) => a.investorId === ctxInvestorId)
    : null;
  const investor = ctxAssignment?.investor ?? deal.investor;
  const bb = investor?.buyBox ?? null;

  const score = ctxAssignment?.score ?? deal.score;
  const grade = ctxAssignment?.grade ?? deal.grade;
  const scoreBreakdown = (ctxAssignment?.scoreBreakdown ?? deal.scoreBreakdown) as
    | { category: string; points: number; max: number; status: string; detail: string }[]
    | null;

  // Finance at buy box defaults
  let fin = null;
  if (deal.askingPrice && deal.noi && bb) {
    fin = computeFinance({
      price: deal.askingPrice,
      noi: deal.noi,
      ltv: bb.ltv,
      ratePercent: bb.interestRate,
      amortizationYears: bb.amortizationYears,
    });
  }

  const data = {
    deal: {
      id: deal.id,
      address: deal.address,
      city: deal.city,
      state: deal.state,
      tenantName: deal.tenantName,
      operatorName: deal.operatorName,
      assetType: labelFor(ASSET_TYPES, deal.assetType),
      askingPrice: fmtMoney(deal.askingPrice),
      noi: fmtMoney(deal.noi),
      capRate: fmtPercent(deal.capRateAsking),
      leaseType: labelFor(LEASE_TYPES, deal.leaseType),
      termRemainingYears: deal.termRemainingYears,
      bumpStructure: deal.bumpStructure ?? (deal.bumpPercent ? `${deal.bumpPercent}%` : null),
      guaranty: labelFor(GUARANTY_TYPES, deal.guarantyType),
      operatorUnitCount: deal.operatorUnitCount,
      constructionYear: deal.constructionYear,
      buildingSize: deal.buildingSize,
      hhi3Mile: deal.hhi3Mile ? fmtMoney(deal.hhi3Mile, 0) : null,
      selfCheckerNotes: deal.selfCheckerNotes,
      sourceBroker: deal.sourceBroker,
    },
    investor: investor ? { name: investor.name, entityName: investor.entityName } : null,
    buyBox: bb ? {
      ltv: bb.ltv,
      interestRate: bb.interestRate,
      amortizationYears: bb.amortizationYears,
      dscrMin: bb.dscrMin,
    } : null,
    score,
    grade,
    scoreBreakdown,
    fin: fin ? {
      loanAmount: fmtMoney(fin.loanAmount),
      equityRequired: fmtMoney(fin.equityRequired),
      monthlyDebtService: fmtMoney(fin.monthlyDebtService),
      monthlyNetCashFlow: fmtMoney(fin.monthlyNetCashFlow),
      annualNetCashFlow: fmtMoney(fin.monthlyNetCashFlow * 12),
      dscr: fmtDscr(fin.dscr),
      cashOnCash: fmtPercent(fin.cashOnCash * 100),
      capRate: fmtPercent(fin.capRate * 100),
    } : null,
    date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
  };

  return <DealExportClient data={data} />;
}
