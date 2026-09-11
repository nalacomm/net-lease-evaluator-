import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { BuyBoxDisplay } from "@/components/buybox-display";
import { BuyBoxManager } from "@/components/buybox-manager";
import { ArrowLeft } from "lucide-react";
import { labelFor, ASSET_TYPES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function BuyBoxPage({
  params,
}: {
  params: { id: string };
}) {
  const investor = await prisma.investor.findUnique({
    where: { id: params.id },
    include: { buyBoxes: { orderBy: { createdAt: "asc" } } },
  });
  if (!investor) notFound();

  return (
    <div className="space-y-5">
      <Link
        href={`/investors/${investor.id}`}
        className="inline-flex items-center gap-1 text-sm text-brand"
      >
        <ArrowLeft className="h-4 w-4" /> Back to investor
      </Link>
      <PageHeader
        title="Buy Boxes"
        subtitle={investor.name}
        action={
          <BuyBoxManager investorId={investor.id} mode="add-button" />
        }
      />

      {investor.buyBoxes.length === 0 ? (
        <div className="card text-sm text-gray-600">
          No buy boxes yet. Add one to start evaluating deals.
        </div>
      ) : (
        <div className="space-y-6">
          {investor.buyBoxes.map((box) => (
            <div key={box.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold">{box.name}</span>
                  {box.appliesTo.length > 0 ? (
                    <span className="ml-2 text-xs text-gray-500">
                      Applies to: {box.appliesTo.map((a) => labelFor(ASSET_TYPES, a)).join(", ")}
                    </span>
                  ) : (
                    <span className="ml-2 text-xs text-gray-400">All asset types</span>
                  )}
                </div>
                <BuyBoxManager
                  investorId={investor.id}
                  buyBoxId={box.id}
                  mode="delete-button"
                />
              </div>
              <BuyBoxDisplay bb={box} />
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <BuyBoxManager investorId={investor.id} mode="add-form" />
      </div>
    </div>
  );
}
