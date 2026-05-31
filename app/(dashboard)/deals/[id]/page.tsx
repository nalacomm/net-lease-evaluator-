import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DealProfile } from "@/components/deal-profile";

export const dynamic = "force-dynamic";

export default async function DealPage({
  params,
}: {
  params: { id: string };
}) {
  const deal = await prisma.deal.findUnique({
    where: { id: params.id },
    include: {
      updates: { orderBy: { createdAt: "desc" } },
      newsFlags: {
        include: { newsItem: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!deal) notFound();

  // Serialize dates for the client component.
  const serialized = {
    ...deal,
    scoreBreakdown: (deal.scoreBreakdown as unknown) as
      | {
          category: string;
          points: number;
          max: number;
          status: string;
          detail: string;
        }[]
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
        publishedAt: f.newsItem.publishedAt
          ? f.newsItem.publishedAt.toISOString()
          : null,
      },
    })),
  };

  return <DealProfile deal={serialized as never} />;
}
