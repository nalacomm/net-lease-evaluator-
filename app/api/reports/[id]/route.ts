import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const report = await prisma.report.findUnique({ where: { id: params.id } });
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    id: report.id,
    title: report.title,
    generatedAt: report.generatedAt.toISOString(),
    dealCount: report.dealIds.length,
    reportData: report.reportData,
  });
}
