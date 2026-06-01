import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { NewsManager } from "@/components/news-manager";

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const news = await prisma.newsItem.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      dealFlags: {
        include: {
          deal: { select: { id: true, address: true, tenantName: true } },
        },
      },
    },
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="News"
        subtitle="Market news and AI deal tagging"
      />
      <NewsManager initialNews={news as never} />
    </div>
  );
}
