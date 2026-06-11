import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { askText } from "@/lib/anthropic";

export const maxDuration = 60;

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: params.id },
      include: { requirements: true },
    });
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const req_ = tenant.requirements;

    const reqSummary = req_ ? [
      req_.minSF || req_.maxSF ? `Size: ${req_.minSF ? req_.minSF.toLocaleString() : ""}–${req_.maxSF ? req_.maxSF.toLocaleString() : ""} SF` : null,
      req_.maxRentPsf ? `Rent: up to $${req_.maxRentPsf}/SF NNN` : null,
      req_.minTraffic ? `Traffic: ${req_.minTraffic.toLocaleString()}+ VPD` : null,
      req_.minIncome ? `Income: $${Math.round(req_.minIncome / 1000)}K+ median HHI` : null,
      req_.targetMarkets?.length ? `Markets: ${req_.targetMarkets.join(", ")}` : null,
      req_.siteTypePrefs?.length ? `Site types: ${req_.siteTypePrefs.join(", ")}` : null,
      req_.coTenancy ? `Co-tenancy: ${req_.coTenancy}` : null,
      req_.leaseType ? `Lease: ${req_.leaseType.replace(/_/g, " ").toUpperCase()}` : null,
      req_.additionalNotes ? `Notes: ${req_.additionalNotes}` : null,
    ].filter(Boolean).join("\n") : "No requirements on file";

    const html = await askText(
      `You are a commercial real estate tenant rep broker named Ed Henderson at Blake-Dickson Real Estate. Generate professional, visually polished HTML for a Constant Contact email campaign marketing this tenant's site requirements to landlords and property owners.

TENANT: ${tenant.name}${tenant.company ? ` (${tenant.company})` : ""}
REQUIREMENTS:
${reqSummary}

Design requirements:
- Full HTML email: DOCTYPE, html, head, body tags
- Inline CSS only (Constant Contact strips external stylesheets)
- Width: 600px max, centered
- Color scheme: dark navy (#1e3a5f) header, white body, amber accent (#f59e0b) for CTAs
- Header: "Blake-Dickson Real Estate" logo text + tagline "Tenant Representation"
- Clear headline: "[Tenant name] is Looking for Space"
- Requirements table: clean rows for each requirement with label and value
- Call-to-action button: "Contact Ed Henderson" linking to mailto:ed@blakedickson.com
- Footer: "Ed Henderson · Blake-Dickson Real Estate · ed@blakedickson.com" in small gray text
- Professional tone — this goes directly to landlords/developers
- No placeholder text — use real data from the requirements above
- If a requirement field is missing, skip that row entirely

Return only the complete HTML — no commentary, no markdown fences.`,
      { maxTokens: 3000 }
    );

    const campaign = await prisma.campaign.create({
      data: {
        tenantId: params.id,
        title: `${tenant.name} — Site Requirements`,
        html,
      },
    });

    return NextResponse.json({ campaignId: campaign.id, html });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
