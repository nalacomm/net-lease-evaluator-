import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAllInvestors } from "@/lib/investor";
import { DealProfile } from "@/components/deal-profile";

export const dynamic = "force-dynamic";

export default async function DealPage({
  params,
}: {
  params: { id: string };
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
          include: { investor: { select: { id: true, name: true } } },
        },
      },
    }),
    getAllInvestors(),
  ]);
  if (!deal) notFound();

  const serialized = {
    ...deal,
    scoreBreakdown: (deal.scoreBreakdown as unknown) as
      | { category: string; points: number; max: number; status: string; detail: string }[]
      | null,
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

  return (
    <DealProfile
      deal={serialized as never}
      allInvestors={allInvestors.map((i) => ({ id: i.id, name: i.name }))}
    />
  );
}
