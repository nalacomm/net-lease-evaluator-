import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { computeFinance } from "@/lib/finance";
import { fmtMoney, fmtPercent, fmtDscr } from "@/lib/format";
import { labelFor, ASSET_TYPES, LEASE_TYPES, GUARANTY_TYPES, DEAL_STATUSES, SOURCE_PLATFORMS } from "@/lib/constants";
import { runGapAnalysis } from "@/lib/gap-analysis";
import { DealExportClient } from "@/components/deal-export-client";
import type { BuyBoxLike, DealLike } from "@/lib/scoring";
import type { GapAnalysisResult } from "@/lib/gap-analysis";

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

  // Run gap analysis server-side (non-blocking — if it fails, export still renders)
  let gapAnalysis: GapAnalysisResult | null = null;
  if (bb) {
    try {
      gapAnalysis = await runGapAnalysis(
        deal as DealLike & { tenantName?: string | null; address?: string | null; assetType?: string | null },
        bb as BuyBoxLike & {
          capRateMin: number; capRateTarget: number; priceMax: number;
          priceStretch?: number | null; termMinYears: number; dscrMin: number;
          bumpMinPercent?: number | null; guarantyPreferred: string;
        }
      );
    } catch {
      // Gap analysis is best-effort; don't block the export if AI is unavailable
    }
  }

  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  const data = {
    deal: {
      // Identity
      address: deal.address,
      city: deal.city,
      state: deal.state,
      status: labelFor(DEAL_STATUSES, deal.status),
      assetType: labelFor(ASSET_TYPES, deal.assetType),

      // Tenant
      tenantName: deal.tenantName,
      operatorName: deal.operatorName,
      operatorUnitCount: deal.operatorUnitCount,
      guaranty: labelFor(GUARANTY_TYPES, deal.guarantyType),

      // Financials
      askingPrice: fmtMoney(deal.askingPrice),
      noi: fmtMoney(deal.noi),
      capRateAsking: fmtPercent(deal.capRateAsking),
      capRateUnderwritten: deal.capRateUnderwritten ? fmtPercent(deal.capRateUnderwritten) : null,
      dscrCalculated: deal.dscrCalculated ? fmtDscr(deal.dscrCalculated) : null,

      // Lease
      leaseType: labelFor(LEASE_TYPES, deal.leaseType),
      termRemainingYears: deal.termRemainingYears,
      leaseCommenceDate: deal.leaseCommenceDate
        ? new Date(deal.leaseCommenceDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
        : null,
      leaseExpirationDate: deal.leaseExpirationDate
        ? new Date(deal.leaseExpirationDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
        : null,
      bumpStructure: deal.bumpStructure ?? (deal.bumpPercent ? `${deal.bumpPercent}% annual` : null),

      // Physical
      constructionYear: deal.constructionYear,
      buildingSize: deal.buildingSize ? `${deal.buildingSize.toLocaleString()} SF` : null,
      lotSize: deal.lotSize ? `${deal.lotSize.toLocaleString()} SF` : null,

      // Shopping center
      numberOfTenants: deal.numberOfTenants,
      anchorTenant: deal.anchorTenant,
      vacancyRate: deal.vacancyRate != null ? fmtPercent(deal.vacancyRate) : null,
      grossLeasableArea: deal.grossLeasableArea ? `${deal.grossLeasableArea.toLocaleString()} SF` : null,

      // Demographics
      hhi1Mile: deal.hhi1Mile ? fmtMoney(deal.hhi1Mile, 0) : null,
      hhi3Mile: deal.hhi3Mile ? fmtMoney(deal.hhi3Mile, 0) : null,
      hhi5Mile: deal.hhi5Mile ? fmtMoney(deal.hhi5Mile, 0) : null,
      population1Mile: deal.population1Mile?.toLocaleString() ?? null,

      // Source
      sourceBroker: deal.sourceBroker,
      sourcePlatform: labelFor(SOURCE_PLATFORMS, deal.sourcePlatform),
      sourceUrl: deal.sourceUrl,

      // AI
      confidenceLevel: deal.confidenceLevel,
      selfCheckerNotes: deal.selfCheckerNotes,
      scoreRationale: deal.scoreRationale,
    },
    investor: investor ? { name: investor.name, entityName: investor.entityName } : null,
    buyBox: bb
      ? {
          ltv: bb.ltv,
          interestRate: bb.interestRate,
          amortizationYears: bb.amortizationYears,
          dscrMin: bb.dscrMin,
          capRateMin: bb.capRateMin,
          capRateTarget: bb.capRateTarget,
          priceMax: bb.priceMax,
          leaseTypePreferred: labelFor(LEASE_TYPES, bb.leaseTypePreferred),
          termMinYears: bb.termMinYears,
        }
      : null,
    score,
    grade,
    scoreBreakdown,
    fin: fin
      ? {
          equityRequired: fmtMoney(fin.equityRequired),
          loanAmount: fmtMoney(fin.loanAmount),
          monthlyDebtService: fmtMoney(fin.monthlyDebtService),
          monthlyNetCashFlow: fmtMoney(fin.monthlyNetCashFlow),
          annualNetCashFlow: fmtMoney(fin.monthlyNetCashFlow * 12),
          dscr: fmtDscr(fin.dscr),
          cashOnCash: fmtPercent(fin.cashOnCash * 100),
          capRate: fmtPercent(fin.capRate * 100),
        }
      : null,
    gapAnalysis,
    date,
  };

  return <DealExportClient data={data} />;
}
