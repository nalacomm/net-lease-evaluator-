import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader, EmptyState } from "@/components/ui";
import { BuyBoxDisplay } from "@/components/buybox-display";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BuyBoxPage({
  params,
}: {
  params: { id: string };
}) {
  const investor = await prisma.investor.findUnique({
    where: { id: params.id },
    include: { buyBox: true },
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
      <PageHeader title="Buy Box" subtitle={investor.name} />
      {investor.buyBox ? (
        <>
          <BuyBoxDisplay bb={investor.buyBox} />
          <p className="text-sm text-gray-400">
            Buy-box editing and the guided wizard arrive in the next build phase.
          </p>
        </>
      ) : (
        <EmptyState
          title="No buy box yet"
          description="The guided buy-box wizard arrives in the next build phase."
        />
      )}
    </div>
  );
}
