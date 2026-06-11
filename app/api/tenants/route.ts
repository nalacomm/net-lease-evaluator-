import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const tenants = await prisma.tenant.findMany({
    include: {
      requirements: true,
      _count: { select: { siteAssignments: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(tenants);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, company, contact, email, phone, notes, requirements } = body;
    if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

    const tenant = await prisma.tenant.create({
      data: {
        name: name.trim(),
        company: company || null,
        contact: contact || null,
        email: email || null,
        phone: phone || null,
        notes: notes || null,
        ...(requirements && {
          requirements: {
            create: {
              minSF: requirements.minSF ? parseFloat(requirements.minSF) : null,
              maxSF: requirements.maxSF ? parseFloat(requirements.maxSF) : null,
              preferredSF: requirements.preferredSF ? parseFloat(requirements.preferredSF) : null,
              minRentPsf: requirements.minRentPsf ? parseFloat(requirements.minRentPsf) : null,
              maxRentPsf: requirements.maxRentPsf ? parseFloat(requirements.maxRentPsf) : null,
              leaseType: requirements.leaseType || null,
              minParking: requirements.minParking ? parseFloat(requirements.minParking) : null,
              minTraffic: requirements.minTraffic ? parseInt(requirements.minTraffic) : null,
              minPopulation: requirements.minPopulation ? parseInt(requirements.minPopulation) : null,
              minIncome: requirements.minIncome ? parseInt(requirements.minIncome) : null,
              radiusMiles: requirements.radiusMiles ? parseFloat(requirements.radiusMiles) : null,
              minTerm: requirements.minTerm ? parseInt(requirements.minTerm) : null,
              preferredTerm: requirements.preferredTerm ? parseInt(requirements.preferredTerm) : null,
              targetMarkets: requirements.targetMarkets ?? [],
              coTenancy: requirements.coTenancy || null,
              exclusivity: requirements.exclusivity || null,
              zoningReqs: requirements.zoningReqs || null,
              siteTypePrefs: requirements.siteTypePrefs ?? [],
              additionalNotes: requirements.additionalNotes || null,
              rawInput: requirements.rawInput || null,
              inferredFields: requirements.inferredFields ?? [],
              missingFields: requirements.missingFields ?? [],
              confidenceLevel: requirements.confidenceLevel || null,
              narrativeSummary: requirements.narrativeSummary || null,
            },
          },
        }),
      },
      include: { requirements: true },
    });

    return NextResponse.json(tenant);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
