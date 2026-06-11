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
      `You are Ed Henderson, Principal Broker at Blake-Dickson Commercial Real Estate. Generate a complete, professional HTML email campaign to send to landlords and property owners marketing this tenant's site requirements.

TENANT: ${tenant.name}${tenant.company ? ` (${tenant.company})` : ""}
${tenant.notes ? `CONCEPT/ABOUT: ${tenant.notes}` : ""}
REQUIREMENTS:
${reqSummary}

DESIGN SPECIFICATION — follow this exactly:
- Full HTML email: DOCTYPE, html, head, body tags
- All CSS must be in a <style> block in <head> (Constant Contact supports this) OR inline — NO external stylesheets
- Max width: 640px, centered with margin: 0 auto
- Background: #f0ebe3 (warm cream)
- Wrapper background: #faf7f2

SECTIONS IN ORDER:
1. HEADER — background #2a2118 (dark espresso), padding 28px 40px, text-align center, border-bottom 2px solid #c9a84c (gold)
   - Tagline: "[Tenant Name] · Active Tenant Seeking Space" — font-size 9px, letter-spacing 4px, color #c9a84c, uppercase, font-family Montserrat/sans-serif

2. INTRO — background #faf7f2, padding 44px 40px, text-align center, border-bottom 1px solid #e0d8cc
   - Decorative gold line (40px wide, 2px, #c9a84c) before and after
   - Eyebrow: "Now Seeking [Target Markets or 'Space']" — 9px, letter-spacing 5px, #c9a84c, uppercase
   - Headline: serif font (Cormorant Garamond or Georgia), 32-34px, color #1e1812 — write a compelling headline about the tenant seeking space
   - Sub-text: 12px, color #5a4e3e, max-width 460px, line-height 1.8 — write 2 sentences about Blake-Dickson representing this tenant

3. LEASE REQUIREMENTS SECTION — background #faf7f2, padding 36px 40px, border-bottom 1px solid #e0d8cc
   - Section label: 8px, letter-spacing 4px, #b8922a, uppercase — "Lease Requirements"
   - Requirements as a TABLE (display:table, border-collapse:collapse, width:100%)
   - Each row: label cell (9px, uppercase, letter-spacing 2px, #8a7a66, width 38%, padding 11px 16px 11px 0, border-bottom 1px solid #e0d8cc) + value cell (13px, #2a2118, padding 11px 0, border-bottom 1px solid #e0d8cc)
   - Only include rows where data exists — skip missing fields

4. CONCEPT SECTION (only if there's a concept/notes) — background #f3ede4, padding 36px 40px, border-bottom 1px solid #e0d8cc
   - Section label: "About the Concept"
   - Blockquote style: background #fff9f0, border 1px solid #e8d9be, border-left 3px solid #c9a84c, padding 24px 28px
   - Text in italic serif (Cormorant Garamond or Georgia), 18px, color #3a2e20, line-height 1.75

5. CTA SECTION — background #2a2118, padding 44px 40px, text-align center
   - Text: 12px, color #ccc0aa, line-height 1.8, margin-bottom 28px — "If you have space that fits these parameters, we want to hear from you."
   - Button: background #c9a84c, color #1e1812, text-decoration none, font-size 10px, font-weight 700, letter-spacing 3px, uppercase, padding 16px 36px, display inline-block
   - Button text: "I Have a Location — Contact Ed Henderson"
   - Button href: mailto:ed@blakedickson.com?subject=I have a location for ${tenant.name} — Please send the tenant profile
   - Note below button: 10px, color #7a6e5e — "Clicking will open an email to Ed Henderson at Blake-Dickson Commercial Real Estate"

6. FOOTER — background #f3ede4, padding 28px 40px, border-top 2px solid #c9a84c
   - Broker name: "Ed Henderson" — 12px, font-weight 600, color #1e1812
   - Title: "Principal Broker · Blake-Dickson Commercial Real Estate" — 9px, #8a7a66, uppercase, letter-spacing 2px
   - Contact: phone 202.213.7438, email ed@blakedickson.com, website blakedickson.com — links color #b8922a
   - Gold divider (30px wide, 2px, #c9a84c)
   - Disclaimer: 9px, color #a09080 — "This communication is intended for commercial real estate professionals. All information is deemed reliable but not guaranteed. Blake-Dickson Commercial Real Estate · 1250 Connecticut Ave NW, Suite 700 · Washington, DC 20036"

Return ONLY the complete HTML — no commentary, no markdown fences, no explanations.`,
      { maxTokens: 4000 }
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
