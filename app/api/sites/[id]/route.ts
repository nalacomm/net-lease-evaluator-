import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const site = await prisma.prospectiveSite.findUnique({
    where: { id: params.id },
    include: {
      assignments: {
        include: { tenant: { include: { requirements: true } } },
      },
      newsFlags: { include: { newsItem: true } },
    },
  });
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(site);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const site = await prisma.prospectiveSite.update({
      where: { id: params.id },
      data: {
        name: body.name ?? undefined,
        address: body.address ?? undefined,
        city: body.city ?? undefined,
        state: body.state ?? undefined,
        zip: body.zip ?? undefined,
        squareFeet: body.squareFeet != null ? parseFloat(body.squareFeet) : undefined,
        parkingSpaces: body.parkingSpaces != null ? parseInt(body.parkingSpaces) : undefined,
        parkingRatio: body.parkingRatio != null ? parseFloat(body.parkingRatio) : undefined,
        siteType: body.siteType ?? undefined,
        askingRentPsf: body.askingRentPsf != null ? parseFloat(body.askingRentPsf) : undefined,
        nnnEstimate: body.nnnEstimate != null ? parseFloat(body.nnnEstimate) : undefined,
        leaseType: body.leaseType ?? undefined,
        leaseTermOffered: body.leaseTermOffered != null ? parseInt(body.leaseTermOffered) : undefined,
        dailyTraffic: body.dailyTraffic != null ? parseInt(body.dailyTraffic) : undefined,
        population1mi: body.population1mi != null ? parseInt(body.population1mi) : undefined,
        population3mi: body.population3mi != null ? parseInt(body.population3mi) : undefined,
        population5mi: body.population5mi != null ? parseInt(body.population5mi) : undefined,
        medianIncome: body.medianIncome != null ? parseFloat(body.medianIncome) : undefined,
        coTenants: Array.isArray(body.coTenants) ? body.coTenants.join(", ") : (body.coTenants ?? undefined),
        zoning: body.zoning ?? undefined,
        availableDate: body.availableDate ?? undefined,
        source: body.source ?? undefined,
        brokerName: body.brokerName ?? undefined,
        brokerEmail: body.brokerEmail ?? undefined,
        brokerPhone: body.brokerPhone ?? undefined,
        notes: body.notes ?? undefined,
        status: body.status ?? undefined,
      },
    });
    return NextResponse.json(site);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  await prisma.prospectiveSite.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
