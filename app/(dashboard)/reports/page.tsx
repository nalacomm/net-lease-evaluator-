import { prisma } from "@/lib/prisma";
import { getActiveInvestor } from "@/lib/investor";
import { PageHeader } from "@/components/ui";
import { ReportGenerator } from "@/components/report-generator";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const investor = await getActiveInvestor();

  const deals = investor
    ? await prisma.deal.findMany({
        where: { investorId: investor.id, status: "active" },
        orderBy: { score: "desc" },
        select: {
          id: true,
          address: true,
          tenantName: true,
          grade: true,
          score: true,
          assetType: true,
        },
      })
    : [];

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
        investor={investor ? { id: investor.id, name: investor.name } : null}
        deals={deals}
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
