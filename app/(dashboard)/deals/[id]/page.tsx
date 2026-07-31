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
        investor: { select: { name: true } },
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

  // When no explicit investor context: if there's exactly one assignment, use it as the default
  // display so the badge reflects the investor this deal is actually assigned to, not whoever
  // happened to be the primary investor at intake time.
  const defaultAssignment =
    !ctxInvestorId && deal.assignments.length === 1 ? deal.assignments[0] : null;

  const effectiveAssignment = ctxAssignment ?? defaultAssignment;
  const ctxInvestor = effectiveAssignment?.investor ?? null;
  const ctxBuyBox = ctxInvestor?.buyBox ?? null;

  const serialized = {
    ...deal,
    primaryInvestorName: effectiveAssignment?.investor?.name ?? deal.investor?.name ?? null,
    analysisContext: deal.analysisContext ?? null,
    scoringConfig: (deal.scoringConfig as { enabledCategories?: string[] } | null) ?? null,
    // Override score/grade/breakdown with the assignment-specific values when in investor context
    score: effectiveAssignment ? effectiveAssignment.score : deal.score,
    grade: effectiveAssignment ? effectiveAssignment.grade : deal.grade,
    scoreBreakdown: (
      effectiveAssignment ? effectiveAssignment.scoreBreakdown : deal.scoreBreakdown
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
  const cachedGapAnalysis = effectiveAssignment?.gapAnalysis
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
        effectiveAssignment && ctxInvestor && ctxBuyBox
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
