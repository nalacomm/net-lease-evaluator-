import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { askText } from "@/lib/anthropic";
import { labelFor, SITE_TYPES, TENANT_LEASE_TYPES } from "@/lib/constants";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { tenantId, siteIds } = await req.json();
    if (!tenantId || !siteIds?.length) {
      return NextResponse.json({ error: "tenantId + siteIds required" }, { status: 400 });
    }
    if (siteIds.length > 8) {
      return NextResponse.json({ error: "Select up to 8 sites per report to avoid timeouts" }, { status: 400 });
    }

    const [tenant, sites] = await Promise.all([
      prisma.tenant.findUnique({
        where: { id: tenantId },
        include: { requirements: true },
      }),
      prisma.prospectiveSite.findMany({
        where: { id: { in: siteIds } },
        include: {
          assignments: {
            where: { tenantId },
            select: { score: true, grade: true, scoreBreakdown: true, gapAnalysis: true },
          },
          newsFlags: { include: { newsItem: true }, orderBy: { createdAt: "desc" }, take: 3 },
        },
      }),
    ]);

    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const tenantName = tenant.name;

    const req_ = tenant.requirements;

    const reqContext = req_
      ? [
          req_.minSF || req_.maxSF ? `Size: ${req_.minSF ?? "?"}–${req_.maxSF ?? "?"} SF` : null,
          req_.maxRentPsf ? `Max rent: $${req_.maxRentPsf}/SF NNN` : null,
          req_.minTraffic ? `Min traffic: ${req_.minTraffic.toLocaleString()} VPD` : null,
          req_.minIncome ? `Min income: $${Math.round(req_.minIncome / 1000)}K HHI` : null,
          req_.targetMarkets?.length ? `Target markets: ${req_.targetMarkets.join(", ")}` : null,
          req_.siteTypePrefs?.length ? `Preferred types: ${req_.siteTypePrefs.join(", ")}` : null,
          req_.additionalNotes ? `Notes: ${req_.additionalNotes}` : null,
        ].filter(Boolean).join(" | ")
      : "No requirements on file";

    function siteSummary(s: (typeof sites)[0]) {
      const a = s.assignments[0];
      return [
        `Site: ${s.name} — ${[s.address, s.city, s.state].filter(Boolean).join(", ")}${s.quadrant ? ` (${s.quadrant})` : ""}`,
        s.squareFeet ? `${s.squareFeet.toLocaleString()} SF` : null,
        s.askingRentPsf ? `$${s.askingRentPsf}/SF asking` : null,
        s.dailyTraffic ? `${s.dailyTraffic.toLocaleString()} VPD` : null,
        s.medianIncome ? `$${Math.round(s.medianIncome / 1000)}K HHI` : null,
        s.coTenants ? `Co-tenants: ${s.coTenants}` : null,
        labelFor(SITE_TYPES, s.siteType) !== "—" ? labelFor(SITE_TYPES, s.siteType) : null,
        a ? `Score: ${a.score?.toFixed(0) ?? "?"}/100 (${a.grade ?? "?"})` : "Not scored",
      ].filter(Boolean).join(" | ");
    }

    const allSummaries = sites.map(siteSummary).join("\n\n---\n");

    const [execSummary, recommendation] = await Promise.all([
      askText(
        `You are Ed Henderson, tenant rep broker at Blake-Dickson Commercial Real Estate, writing a site report for your client ${tenantName}${tenant.company ? ` (${tenant.company})` : ""}.

Write directly TO the tenant using "you" and "your".
Tenant requirements: ${reqContext}

Sites being presented:
${allSummaries}

Write a 2–3 sentence executive summary covering how these sites collectively match the tenant's requirements. No preamble.`,
        { maxTokens: 300 }
      ),
      askText(
        `You are Ed Henderson, tenant rep broker, advising ${tenantName} on which site best fits their needs.

Use "you" and "your" — never third person.
Tenant requirements: ${reqContext}

Sites under review:
${allSummaries}

Write a 2–3 sentence recommendation naming the top site and exactly why it best fits the tenant's requirements. Be direct and specific. No preamble.`,
        { maxTokens: 300 }
      ),
    ]);

    // Process in batches of 4 to stay within rate limits
    async function scoreSite(s: (typeof sites)[0]) {
      const a = s.assignments[0];
      const breakdown = a?.scoreBreakdown as { category: string; points: number; max: number; status: string; detail: string }[] | null;
      const gapAnalysis = a?.gapAnalysis as {
        isExceptional: boolean;
        exceptionalReason: string | null;
        buyBoxAdjustments?: { field: string; currentValue: string; requiredValue: string; impact: string }[];
        requirementAdjustments?: { field: string; currentValue: string; requiredValue: string; impact: string }[];
        verdict: string;
      } | null;

      const risksStrengths = await askText(
        `You are advising ${tenantName} on this prospective site. Write strengths and risks speaking directly using "you/your".

${siteSummary(s)}
Tenant requirements: ${reqContext}

Return exactly this format (no extra text):
STRENGTHS:
- [bullet 1]
- [bullet 2]
- [bullet 3]
RISKS:
- [bullet 1]
- [bullet 2]
- [bullet 3]`,
        { maxTokens: 300 }
      );

      const strengths: string[] = [];
      const risks: string[] = [];
      let section = "";
      for (const line of risksStrengths.split("\n")) {
        if (line.startsWith("STRENGTHS")) section = "s";
        else if (line.startsWith("RISKS")) section = "r";
        else if (line.startsWith("- ")) {
          if (section === "s") strengths.push(line.slice(2));
          else if (section === "r") risks.push(line.slice(2));
        }
      }

      return {
        id: s.id,
        name: s.name,
        address: s.address,
        city: s.city,
        state: s.state,
        quadrant: s.quadrant,
        siteType: labelFor(SITE_TYPES, s.siteType),
        squareFeet: s.squareFeet,
        askingRentPsf: s.askingRentPsf,
        nnnEstimate: s.nnnEstimate,
        leaseType: labelFor(TENANT_LEASE_TYPES, s.leaseType),
        leaseTermOffered: s.leaseTermOffered,
        dailyTraffic: s.dailyTraffic,
        population3mi: s.population3mi,
        medianIncome: s.medianIncome,
        coTenants: s.coTenants,
        zoning: s.zoning,
        brokerName: s.brokerName,
        brokerPhone: s.brokerPhone,
        score: a?.score ?? null,
        grade: a?.grade ?? null,
        scoreBreakdown: breakdown,
        gapAnalysis,
        newsFlags: s.newsFlags.map((f) => ({
          headline: f.newsItem.headline,
          relevance: f.relevance,
          impact: f.impact,
        })),
        strengths,
        risks,
      };
    }

    const siteDetails: Awaited<ReturnType<typeof scoreSite>>[] = [];
    for (let i = 0; i < sites.length; i += 4) {
      const batch = await Promise.all(sites.slice(i, i + 4).map(scoreSite));
      siteDetails.push(...batch);
    }

    return NextResponse.json({
      tenant: { name: tenant.name, company: tenant.company },
      requirements: reqContext,
      execSummary,
      recommendation,
      sites: siteDetails,
    });
  } catch (e) {
    console.error("site report generate error", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
