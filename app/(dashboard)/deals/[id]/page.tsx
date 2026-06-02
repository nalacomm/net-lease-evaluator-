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
  const [deal, allInvestors] = await Promise.all([
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
              select: { id: true, name: true },
              include: { buyBox: true } as never,
            },
          },
        },
      },
    }),
    getAllInvestors(),
  ]);
  if (!deal) notFound();

  // If viewing from a specific investor's context, use their assignment data
  const ctxInvestorId = searchParams.investorId ?? null;
  const ctxAssignment = ctxInvestorId
    ? (deal.assignments as never as {
        investorId: string;
        score: number | null;
        grade: string | null;
        scoreBreakdown: unknown;
        investor: { id: string; name: string; buyBox: { dscrMin: number; ltv: number; interestRate: number; amortizationYears: number; currentMonthlyIncome: number | null } | null };
      }[]).find((a) => a.investorId === ctxInvestorId)
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
      investorName: (a.investor as { name: string }).name,
      score: a.score,
      grade: a.grade,
    })),
  };

  return (
    <DealProfile
      deal={serialized as never}
      allInvestors={allInvestors.map((i) => ({ id: i.id, name: i.name }))}
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
