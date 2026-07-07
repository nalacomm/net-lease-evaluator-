import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { askText } from "@/lib/anthropic";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function row(label: string, value: string | null | undefined, bold = false): string {
  if (!value) return "";
  return `
        <tr>
          <td style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#999999;padding:9px 12px 9px 0;width:42%;vertical-align:top;border-bottom:1px solid #e5e5e5;">${label}</td>
          <td style="font-size:13px;font-weight:${bold ? "600" : "400"};color:#1a1a1a;padding:9px 0;border-bottom:1px solid #e5e5e5;letter-spacing:0.2px;">${value}</td>
        </tr>`;
}

function buildEmail({
  tenantName,
  eyebrow,
  headline,
  subCopy,
  conceptQuote,
  rows,
  heroImageUrl,
  conceptImageUrl,
  ctaSubject,
}: {
  tenantName: string;
  eyebrow: string;
  headline: string;
  subCopy: string;
  conceptQuote: string;
  rows: string;
  heroImageUrl: string;
  conceptImageUrl: string;
  ctaSubject: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${tenantName} – Tenant ISO</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=Montserrat:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { -webkit-font-smoothing: antialiased; }
  @media only screen and (max-width: 600px) {
    .wrapper { max-width: 100% !important; width: 100% !important; }
    .two-col { display: block !important; width: 100% !important; }
    .col-left { display: block !important; width: 100% !important; padding: 28px 24px !important; border-right: none !important; border-bottom: 1px solid #e5e5e5 !important; }
    .col-right { display: block !important; width: 100% !important; padding: 28px 24px !important; }
    .concept-row { display: block !important; width: 100% !important; }
    .concept-img-cell { display: block !important; width: 100% !important; }
    .concept-img-cell img { height: 220px !important; object-fit: cover !important; }
    .concept-text-cell { display: block !important; width: 100% !important; padding: 28px 24px !important; }
    .footer-inner { display: block !important; }
    .footer-info { display: block !important; }
    .footer-logo { display: block !important; width: auto !important; text-align: left !important; margin-top: 16px !important; }
    .intro { padding: 32px 24px 28px !important; }
    .intro-headline { font-size: 28px !important; }
    .header { padding: 24px 24px 20px !important; }
    .hero-image img { height: 160px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#f2f2f2;font-family:'Montserrat',sans-serif;color:#1a1a1a;">

<div class="wrapper" style="max-width:760px;margin:0 auto;background-color:#ffffff;">

  <!-- HERO IMAGE -->
  <div class="hero-image" style="width:100%;display:block;line-height:0;">
    <img src="${heroImageUrl}" alt="" style="width:100%;height:200px;object-fit:cover;object-position:center 40%;display:block;">
  </div>

  <!-- HEADER -->
  <div class="header" style="background-color:#ffffff;padding:32px 40px 28px;text-align:center;border-bottom:3px solid #cf2e2e;">
    <div style="font-family:'Montserrat',sans-serif;font-size:29px;font-weight:600;letter-spacing:3px;color:#1a1a1a;text-transform:uppercase;">BLAKE-<span style="color:#cf2e2e;">DICKSON</span></div>
    <div style="font-size:10px;font-weight:500;letter-spacing:4px;color:#888888;text-transform:uppercase;margin-top:10px;">Commercial Real Estate</div>
  </div>

  <!-- INTRO -->
  <div class="intro" style="background-color:#ffffff;padding:44px 40px 36px;text-align:center;border-bottom:1px solid #e5e5e5;">
    <div style="display:block;width:40px;height:2px;background:#cf2e2e;margin:0 auto 24px;"></div>
    <div style="font-size:10px;font-weight:600;letter-spacing:5px;color:#cf2e2e;text-transform:uppercase;margin-bottom:16px;">${eyebrow}</div>
    <div class="intro-headline" style="font-family:'Cormorant Garamond',serif;font-size:35px;font-weight:400;color:#1a1a1a;line-height:1.25;margin-bottom:18px;letter-spacing:0.3px;">${headline}</div>
    <div style="font-size:13px;font-weight:400;color:#555555;line-height:1.8;max-width:460px;margin:0 auto;letter-spacing:0.2px;">${subCopy}</div>
    <div style="display:block;width:40px;height:2px;background:#cf2e2e;margin:28px auto 0;"></div>
  </div>

  <!-- TWO-COL: REQUIREMENTS + CTA -->
  <div class="two-col" style="display:table;width:100%;border-bottom:1px solid #e5e5e5;">
    <div class="col-left" style="display:table-cell;width:55%;padding:32px 24px 32px 40px;vertical-align:top;border-right:1px solid #e5e5e5;">
      <div style="font-size:9px;font-weight:700;letter-spacing:4px;color:#cf2e2e;text-transform:uppercase;margin-bottom:20px;">Lease Requirements</div>
      <table style="width:100%;border-collapse:collapse;">
        ${rows}
      </table>
    </div>
    <div class="col-right" style="display:table-cell;width:45%;padding:32px 28px 32px 24px;vertical-align:top;background-color:#1a1a1a;">
      <p style="font-size:12px;font-weight:400;color:#cccccc;line-height:1.8;letter-spacing:0.3px;margin-bottom:24px;">If you have space that fits these parameters, we want to hear from you. Click below to request the full tenant profile.</p>
      <a href="mailto:ed@blakedickson.com?subject=${encodeURIComponent(ctaSubject)}" style="display:block;background:#cf2e2e;border:1px solid #cf2e2e;color:#ffffff;text-decoration:none;font-family:'Montserrat',sans-serif;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:14px 16px;text-align:center;">I Have a Location — Send Me the Tenant Profile</a>
      <p style="font-size:10px;color:#666666;margin-top:14px;letter-spacing:0.3px;line-height:1.5;">Clicking will open a pre-addressed email to Ed Henderson at Blake-Dickson Commercial Real Estate</p>
    </div>
  </div>

  <!-- CONCEPT ROW -->
  <div class="concept-row" style="display:table;width:100%;border-bottom:1px solid #e5e5e5;">
    <div class="concept-img-cell" style="display:table-cell;width:42%;vertical-align:top;line-height:0;">
      <img src="${conceptImageUrl}" alt="" style="width:100%;height:100%;object-fit:cover;object-position:center center;display:block;">
    </div>
    <div class="concept-text-cell" style="display:table-cell;width:58%;padding:32px 40px 32px 28px;vertical-align:top;background-color:#f8f8f8;">
      <div style="font-size:9px;font-weight:700;letter-spacing:4px;color:#cf2e2e;text-transform:uppercase;margin-bottom:20px;">About the Concept</div>
      <div style="background-color:#ffffff;border:1px solid #e0e0e0;border-left:3px solid #cf2e2e;padding:20px 22px;">
        <div style="font-family:'Cormorant Garamond',serif;font-size:17px;font-weight:400;color:#2a2a2a;line-height:1.75;font-style:italic;">"${conceptQuote}"</div>
      </div>
    </div>
  </div>

  <!-- FOOTER -->
  <div style="background-color:#f8f8f8;padding:24px 40px;border-top:3px solid #cf2e2e;">
    <table class="footer-inner" style="width:100%;border-collapse:collapse;">
      <tr>
        <td class="footer-info" style="vertical-align:middle;">
          <div style="font-size:14px;font-weight:700;color:#1a1a1a;letter-spacing:0.5px;margin-bottom:2px;">Ed Henderson</div>
          <div style="font-size:9px;font-weight:400;color:#999999;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">Principal Broker &nbsp;·&nbsp; Blake-Dickson Commercial Real Estate</div>
          <div style="font-size:12px;color:#555555;line-height:1.8;">
            <a href="tel:2022137438" style="color:#cf2e2e;text-decoration:none;">202.213.7438</a> &nbsp;·&nbsp;
            <a href="mailto:ed@blakedickson.com" style="color:#cf2e2e;text-decoration:none;">ed@blakedickson.com</a> &nbsp;·&nbsp;
            <a href="https://blakedickson.com" style="color:#cf2e2e;text-decoration:none;">blakedickson.com</a>
          </div>
        </td>
        <td class="footer-logo" style="vertical-align:middle;text-align:right;width:72px;">
          <img src="https://6axf7mfsggtayw6b.public.blob.vercel-storage.com/SQ2026-6b0U4kGdYJA14dZqrn5vE9mgXxF0cR.png" alt="Blake Dickson" style="width:60px;height:auto;display:inline-block;">
        </td>
      </tr>
    </table>
    <div style="width:30px;height:2px;background:#cf2e2e;margin:14px 0;"></div>
    <div style="font-size:10px;color:#aaaaaa;line-height:1.6;letter-spacing:0.3px;">This communication is intended for commercial real estate professionals. All information is deemed reliable but not guaranteed. Licensed in Virginia, Maryland, and Washington, DC. Blake-Dickson Commercial Real Estate · 1250 Connecticut Ave NW, Suite 700 · Washington, DC 20036</div>
  </div>

</div>
</body>
</html>`;
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    const heroImageUrl: string = body.heroImageUrl ?? "";
    const conceptImageUrl: string = body.conceptImageUrl ?? "";

    const tenant = await prisma.tenant.findUnique({
      where: { id: params.id },
      include: { requirements: true },
    });
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const r = tenant.requirements;

    // Build requirements rows
    const sizeStr = r
      ? r.minSF && r.maxSF
        ? `${r.minSF.toLocaleString()} – ${r.maxSF.toLocaleString()} SF`
        : r.preferredSF
        ? `${r.preferredSF.toLocaleString()} SF`
        : r.maxSF
        ? `Up to ${r.maxSF.toLocaleString()} SF`
        : null
      : null;

    const termStr = r
      ? r.preferredTerm
        ? `${r.preferredTerm} Years`
        : r.minTerm
        ? `${r.minTerm}+ Years`
        : null
      : null;

    const rentStr = r
      ? r.maxRentPsf
        ? `Up to $${r.maxRentPsf.toFixed(2)}/SF NNN`
        : r.minRentPsf
        ? `$${r.minRentPsf.toFixed(2)}/SF NNN`
        : null
      : null;

    const marketsStr = r?.targetMarkets?.length ? r.targetMarkets.join(" · ") : null;
    const siteTypeStr = r?.siteTypePrefs?.length
      ? r.siteTypePrefs.map((s) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())).join(", ")
      : null;

    const rows = [
      siteTypeStr ? row("Space Type", siteTypeStr, true) : "",
      sizeStr ? row("Size", sizeStr) : "",
      termStr ? row("Lease Term", termStr) : "",
      marketsStr ? row("Target Market", marketsStr) : "",
      rentStr ? row("Max Rent", rentStr) : "",
      r?.coTenancy ? row("Co-Tenancy", r.coTenancy) : "",
      r?.leaseType ? row("Lease Type", r.leaseType.replace(/_/g, " ").toUpperCase()) : "",
    ].join("");

    // AI generates intro copy only
    const introCopy = await askText(
      `You are Ed Henderson, Principal Broker at Blake-Dickson Commercial Real Estate.
Write 3 pieces of copy for a marketing email seeking space for this tenant. Return ONLY valid JSON with these exact keys:
{
  "eyebrow": "...",
  "headline": "...",
  "subCopy": "..."
}

eyebrow: short phrase like "Now Seeking Washington, DC Location" — 6-9 words, present tense, states what we're looking for
headline: compelling serif headline, 10-16 words, no quotes — about the concept coming to market or seeking space. Use <em> tags for italic emphasis on 1-2 words.
subCopy: 2 sentences, 30-40 words. First sentence: Blake-Dickson is actively seeking [space type] on behalf of [tenant name]. Second sentence: one-line description of the concept.

TENANT: ${tenant.name}${tenant.company ? ` (${tenant.company})` : ""}
CONCEPT: ${tenant.notes ?? "No additional details on file"}
TARGET MARKETS: ${marketsStr ?? "Washington, DC area"}
SPACE TYPE: ${siteTypeStr ?? "retail"}`,
      { maxTokens: 400 }
    );

    let eyebrow = `Now Seeking ${marketsStr ?? "Space"}`;
    let headline = `${tenant.name} Is <em>Coming to the Market</em>`;
    let subCopy = `Blake-Dickson Commercial Real Estate is actively seeking space on behalf of ${tenant.name}.`;

    try {
      const jsonMatch = introCopy.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        eyebrow = parsed.eyebrow || eyebrow;
        headline = parsed.headline || headline;
        subCopy = parsed.subCopy || subCopy;
      }
    } catch {
      // use defaults
    }

    const conceptQuote = tenant.notes ?? `${tenant.name} is an active tenant represented by Blake-Dickson Commercial Real Estate, currently seeking retail space in the DC metro market.`;

    const html = buildEmail({
      tenantName: tenant.name,
      eyebrow,
      headline,
      subCopy,
      conceptQuote,
      rows,
      heroImageUrl,
      conceptImageUrl,
      ctaSubject: `I have a location for ${tenant.name} – Please send the tenant profile`,
    });

    const campaign = await prisma.campaign.create({
      data: {
        tenantId: params.id,
        title: `${tenant.name} — ISO Email`,
        html,
      },
    });

    return NextResponse.json({ campaignId: campaign.id, html });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
