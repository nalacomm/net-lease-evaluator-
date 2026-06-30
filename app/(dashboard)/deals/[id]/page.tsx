import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAllInvestors } from "@/lib/investor";
import { DealProfile } from "@/components/deal-profile";

export const dynamic = "force-dynamic";

export default async function DealPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { investorId?: string };
}) {
  const [deal, allInvestors, allDealIds] = await Promise.all([
    prisma.deal.findUnique({
      where: { id: params.id },
      include: {
        updates: { orderBy: { createdAt: "desc" } },
        newsFlags: {
          include: { newsItem: true },
          orderBy: { createdAt: "desc" },
        },
        assignments: {
          include: {
            investor: {
              include: { buyBox: true },
            },
          },
        },
      },
    }),
    getAllInvestors(),
    prisma.deal.findMany({ orderBy: { score: "desc" }, select: { id: true } }),
  ]);
  if (!deal) notFound();

  // If viewing from a specific investor's context, use their assignment data
  const ctxInvestorId = searchParams.investorId ?? null;
  const ctxAssignment = ctxInvestorId
    ? deal.assignments.find((a) => a.investorId === ctxInvestorId)
    : null;

  const ctxInvestor = ctxAssignment?.investor ?? null;
  const ctxBuyBox = ctxInvestor?.buyBox ?? null;

  const serialized = {
    ...deal,
    // Override score/grade/breakdown with the assignment-specific values when in investor context
    score: ctxAssignment ? ctxAssignment.score : deal.score,
    grade: ctxAssignment ? ctxAssignment.grade : deal.grade,
    scoreBreakdown: (
      ctxAssignment ? ctxAssignment.scoreBreakdown : deal.scoreBreakdown
    ) as { category: string; points: number; max: number; status: string; detail: string }[] | null,
    updates: deal.updates.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
    })),
    newsFlags: deal.newsFlags.map((f) => ({
      id: f.id,
      relevance: f.relevance,
      impact: f.impact,
      newsItem: {
        headline: f.newsItem.headline,
        source: f.newsItem.source,
        publishedAt: f.newsItem.publishedAt ? f.newsItem.publishedAt.toISOString() : null,
      },
    })),
    assignments: deal.assignments.map((a) => ({
      investorId: a.investorId,
      investorName: a.investor.name,
      score: a.score,
      grade: a.grade,
    })),
  };

  // Load cached gap analysis from the assignment (if it exists)
  const cachedGapAnalysis = ctxAssignment?.gapAnalysis
    ? (ctxAssignment.gapAnalysis as {
        isExceptional: boolean;
        exceptionalReason: string | null;
        buyBoxAdjustments: { field: string; currentValue: string; requiredValue: string; impact: string }[];
        verdict: string;
      })
    : null;

  const ids = allDealIds.map((d) => d.id);
  const idx = ids.indexOf(params.id);
  const prevId = idx > 0 ? ids[idx - 1] : null;
  const nextId = idx < ids.length - 1 ? ids[idx + 1] : null;

  return (
    <DealProfile
      deal={serialized as never}
      allInvestors={allInvestors.map((i) => ({ id: i.id, name: i.name }))}
      cachedGapAnalysis={cachedGapAnalysis}
      prevId={prevId}
      nextId={nextId}
      totalCount={ids.length}
      currentIndex={idx}
      investorContext={
        ctxInvestor && ctxBuyBox
          ? {
              investorId: ctxInvestor.id,
              investorName: ctxInvestor.name,
              dscrMin: ctxBuyBox.dscrMin,
              ltv: ctxBuyBox.ltv,
              interestRate: ctxBuyBox.interestRate,
              amortizationYears: ctxBuyBox.amortizationYears,
              currentMonthlyIncome: ctxBuyBox.currentMonthlyIncome ?? 0,
            }
          : null
      }
    />
  );
}
