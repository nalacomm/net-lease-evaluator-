import { prisma } from "@/lib/prisma";
import { getAllInvestors, getActiveInvestor } from "@/lib/investor";
import { PageHeader } from "@/components/ui";
import { ReportGenerator } from "@/components/report-generator";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { investorId?: string };
}) {
  const [allInvestors, activeInvestor] = await Promise.all([
    getAllInvestors(),
    getActiveInvestor(searchParams.investorId),
  ]);

  const investor = activeInvestor;

  // Get deals for this investor: primary deals + assigned deals
  const [primaryDeals, assignedDeals] = await Promise.all([
    investor
      ? prisma.deal.findMany({
          where: { investorId: investor.id, status: "active" },
          orderBy: { score: "desc" },
          select: { id: true, address: true, tenantName: true, grade: true, score: true, assetType: true },
        })
      : Promise.resolve([]),
    investor
      ? prisma.dealAssignment.findMany({
          where: { investorId: investor.id },
          include: {
            deal: {
              select: { id: true, address: true, tenantName: true, assetType: true, status: true },
            },
          },
          orderBy: { score: "desc" },
        })
      : Promise.resolve([]),
  ]);

  // Merge: primary deals first, then assigned (deduplicate by id)
  const seen = new Set(primaryDeals.map((d) => d.id));
  const mergedDeals = [
    ...primaryDeals,
    ...assignedDeals
      .filter((a) => !seen.has(a.dealId) && a.deal.status === "active")
      .map((a) => ({
        id: a.dealId,
        address: a.deal.address,
        tenantName: a.deal.tenantName,
        assetType: a.deal.assetType,
        grade: a.grade,
        score: a.score,
      })),
  ].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));

  const pastReports = investor
    ? await prisma.report.findMany({
        where: { investorId: investor.id },
        orderBy: { generatedAt: "desc" },
        take: 10,
      })
    : [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reports"
        subtitle="Generate top-deal PDF reports for clients"
      />
      <ReportGenerator
        allInvestors={allInvestors.map((i) => ({ id: i.id, name: i.name }))}
        activeInvestorId={investor?.id ?? null}
        investor={investor ? { id: investor.id, name: investor.name } : null}
        deals={mergedDeals}
        pastReports={pastReports.map((r) => ({
          id: r.id,
          title: r.title,
          generatedAt: r.generatedAt.toISOString(),
          dealCount: r.dealIds.length,
        }))}
      />
    </div>
  );
}
