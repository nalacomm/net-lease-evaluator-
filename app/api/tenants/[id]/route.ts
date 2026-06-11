import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: params.id },
    include: {
      requirements: true,
      siteAssignments: {
        include: { site: true },
        orderBy: { createdAt: "desc" },
      },
      campaigns: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(tenant);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { name, company, contact, email, phone, notes, requirements } = body;

    const tenant = await prisma.tenant.update({
      where: { id: params.id },
      data: {
        ...(name && { name: name.trim() }),
        company: company ?? undefined,
        contact: contact ?? undefined,
        email: email ?? undefined,
        phone: phone ?? undefined,
        notes: notes ?? undefined,
      },
    });

    if (requirements) {
      const reqData = {
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
      };

      await prisma.tenantRequirements.upsert({
        where: { tenantId: params.id },
        update: reqData,
        create: { tenantId: params.id, ...reqData },
      });
    }

    return NextResponse.json(tenant);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  await prisma.tenant.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
