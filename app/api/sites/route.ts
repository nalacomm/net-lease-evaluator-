import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get("tenantId");

  if (tenantId) {
    const assignments = await prisma.siteAssignment.findMany({
      where: { tenantId },
      include: { site: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(assignments.map((a) => ({ ...a.site, assignment: a })));
  }

  const sites = await prisma.prospectiveSite.findMany({
    include: {
      _count: { select: { assignments: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(sites);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, address, city, state, zip, squareFeet, parkingSpaces, parkingRatio, siteType,
      askingRentPsf, nnnEstimate, leaseType, leaseTermOffered, dailyTraffic,
      population1mi, population3mi, population5mi, medianIncome,
      coTenants, zoning, availableDate, source, brokerName, brokerEmail, brokerPhone, notes } = body;

    if (!name?.trim()) return NextResponse.json({ error: "Site name required" }, { status: 400 });

    const site = await prisma.prospectiveSite.create({
      data: {
        name: name.trim(),
        address: address || null,
        city: city || null,
        state: state || null,
        zip: zip || null,
        squareFeet: squareFeet ? parseFloat(squareFeet) : null,
        parkingSpaces: parkingSpaces ? parseInt(parkingSpaces) : null,
        parkingRatio: parkingRatio ? parseFloat(parkingRatio) : null,
        siteType: siteType || null,
        askingRentPsf: askingRentPsf ? parseFloat(askingRentPsf) : null,
        nnnEstimate: nnnEstimate ? parseFloat(nnnEstimate) : null,
        leaseType: leaseType || null,
        leaseTermOffered: leaseTermOffered ? parseInt(leaseTermOffered) : null,
        dailyTraffic: dailyTraffic ? parseInt(dailyTraffic) : null,
        population1mi: population1mi ? parseInt(population1mi) : null,
        population3mi: population3mi ? parseInt(population3mi) : null,
        population5mi: population5mi ? parseInt(population5mi) : null,
        medianIncome: medianIncome ? parseFloat(medianIncome) : null,
        coTenants: coTenants || null,
        zoning: zoning || null,
        availableDate: availableDate || null,
        source: source || null,
        brokerName: brokerName || null,
        brokerEmail: brokerEmail || null,
        brokerPhone: brokerPhone || null,
        notes: notes || null,
      },
    });

    return NextResponse.json(site);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
